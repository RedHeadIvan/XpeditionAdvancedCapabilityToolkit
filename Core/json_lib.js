/*
 * Disclaimer: This software is provided "AS IS", without warranty of any kind,
 * express or implied, including but not limited to the warranties of merchantability,
 * fitness for a particular purpose and noninfringement. In no event shall the
 * authors or copyright holders be liable for any claim, damages or other liability,
 * whether in an action of contract, tort or otherwise, arising from, out of or in
 * connection with the software or the use or other dealings in the software.
 * 
 * Use at your own risk.
 */

/**
 * Main object of the JSON library.
 * @namespace JSONLib
 */

if (typeof JSONLib === 'undefined') {
    JSONLib = {};
}

/**
 * Serializes an object, array, or value to a JSON string.
 * @memberof JSONLib
 * @function stringify
 * @param {*} value - Value to serialize (object, array, string, number, boolean, null).
 * @param {Function|Array} [replacer] - Transformation function or array of properties to include.
 * @param {string|number} [space] - String or number for indentation in the resulting string.
 * @returns {string} JSON formatted string.
 * @throws {Error} If circular references or unsupported data types are detected.
 * @example
 * // Simple object
 * JSONLib.stringify({name: "John", age: 30}); // '{"name":"John","age":30}'
 * // With array
 * JSONLib.stringify([1, 2, 3]); // '[1,2,3]'
 * // With indentation
 * JSONLib.stringify({x: 1, y: 2}, null, 2);
 */
JSONLib.stringify = function (value, replacer, space) {
    function serialize(val, depth, seen) {
        if (typeof val === 'object' && val !== null) {
            for (var i = 0; i < seen.length; i++) {
                if (seen[i] === val) {
                    throw new Error("Converting circular structure to JSON");
                }
            }
            seen.push(val);
        }

        var type = typeof val;

        if (val === null) return "null";
        if (val === undefined) return undefined;
        if (type === "boolean") return val ? "true" : "false";
        if (type === "number") {
            if (isFinite(val)) {
                return String(val);
            }
            return "null";
        }
        if (type === "string") return quoteString(val);

        if (type === "function" || type === "undefined") return undefined;

        if (Object.prototype.toString.call(val) === '[object Date]') {
            return quoteString(val.toISOString ? val.toISOString() : val.toString());
        }

        var isArray = Object.prototype.toString.call(val) === '[object Array]';
        if (isArray) {
            var arrResult = [];
            for (var i = 0; i < val.length; i++) {
                var item = serialize(val[i], depth + 1, seen);
                arrResult.push(item === undefined ? "null" : item);
            }
            seen.pop();
            return "[" + arrResult.join(",") + "]";
        }

        if (type === "object") {
            var objResult = [];

            var keys = [];
            for (var key in val) {
                if (val.hasOwnProperty(key)) {
                    keys.push(key);
                }
            }

            if (replacer && Object.prototype.toString.call(replacer) === '[object Array]') {
                var filteredKeys = [];
                for (var i = 0; i < replacer.length; i++) {
                    var repKey = String(replacer[i]);
                    if (keys.indexOf(repKey) !== -1) {
                        filteredKeys.push(repKey);
                    }
                }
                keys = filteredKeys;
            }

            for (var i = 0; i < keys.length; i++) {
                var key = keys[i];
                var item = serialize(val[key], depth + 1, seen);
                if (item !== undefined) {
                    if (typeof replacer === 'function') {
                        item = serialize(replacer.call(val, key, val[key]), depth + 1, seen);
                    }
                    if (item !== undefined) {
                        objResult.push(quoteString(key) + ":" + item);
                    }
                }
            }
            seen.pop();
            return "{" + objResult.join(",") + "}";
        }

        return "null";
    }

    function quoteString(str) {
        var escapeMap = {
            '\b': '\\b',
            '\t': '\\t',
            '\n': '\\n',
            '\f': '\\f',
            '\r': '\\r',
            '"': '\\"',
            '\\': '\\\\'
        };

        return '"' + str.replace(/[\x00-\x1f\\"]/g, function (ch) {
            if (escapeMap[ch]) {
                return escapeMap[ch];
            }
            var hex = ch.charCodeAt(0).toString(16);
            return '\\u' + ('0000' + hex).slice(-4);
        }) + '"';
    }

    function formatJson(jsonStr, indentStr) {
        var i = 0;
        var len = jsonStr.length;
        var result = '';
        var inString = false;
        var inEscape = false;
        var level = 0;
        var newLine = false;

        for (i = 0; i < len; i++) {
            var ch = jsonStr.charAt(i);

            if (inString) {
                if (inEscape) {
                    inEscape = false;
                } else if (ch === '\\') {
                    inEscape = true;
                } else if (ch === '"') {
                    inString = false;
                }
                result += ch;
                continue;
            }

            if (ch === '"') {
                inString = true;
                result += ch;
                continue;
            }

            if (ch === '{' || ch === '[') {
                result += ch;
                level++;
                result += '\n' + repeat(indentStr, level);
                newLine = false;
            } else if (ch === '}' || ch === ']') {
                level--;
                if (!newLine) {
                    result += '\n' + repeat(indentStr, level);
                }
                result += ch;
                newLine = false;
            } else if (ch === ',') {
                result += ch + '\n' + repeat(indentStr, level);
                newLine = true;
            } else if (ch === ':') {
                result += ch + ' ';
                newLine = false;
            } else if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
                if (!newLine) {
                    result += ch;
                }
            } else {
                result += ch;
                newLine = false;
            }
        }

        return result;
    }

    function repeat(str, count) {
        var result = '';
        for (var i = 0; i < count; i++) {
            result += str;
        }
        return result;
    }

    try {
        if (typeof replacer === 'function') {
        } else if (replacer && Object.prototype.toString.call(replacer) !== '[object Array]') {
            replacer = null;
        }

        var result = serialize(value, 0, []);

        if (typeof space === 'number') {
            if (space > 10) space = 10;
            if (space < 0) space = 0;
            return formatJson(result, repeat(' ', space));
        } else if (typeof space === 'string') {
            if (space.length > 10) space = space.substring(0, 10);
            return formatJson(result, space);
        }

        return result;
    } catch (e) {
        throw e;
    }
};

/**
 * Parses a JSON string, reconstructing an object, array, or value.
 * @memberof JSONLib
 * @function parse
 * @param {string} jsonString - JSON formatted string.
 * @returns {*} Parsed value (object, array, string, number, boolean, null).
 * @throws {Error} If the string contains JSON syntax errors.
 * @example
 * var obj = JSONLib.parse('{"name":"John","age":30}');
 * // obj.name === "John"
 * var arr = JSONLib.parse('[1, 2, 3]');
 * // arr[0] === 1
 */
JSONLib.parse = function (jsonString) {
    var index = 0;
    var ch = ' ';

    function nextChar() {
        ch = jsonString.charAt(index);
        index++;
        return ch;
    }

    function skipWhitespace() {
        while (ch && (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r')) {
            nextChar();
        }
    }

    function parseValue() {
        skipWhitespace();

        if (ch === '{') {
            return parseObject();
        } else if (ch === '[') {
            return parseArray();
        } else if (ch === '"') {
            return parseString();
        } else if (ch === '-') {
            return parseNumber();
        } else if (ch >= '0' && ch <= '9') {
            return parseNumber();
        } else if (ch === 't') {
            expect("true");
            return true;
        } else if (ch === 'f') {
            expect("false");
            return false;
        } else if (ch === 'n') {
            expect("null");
            return null;
        } else {
            throw new Error("Unexpected character '" + ch + "' at position " + index);
        }
    }

    function expect(str) {
        for (var i = 0; i < str.length; i++) {
            if (ch !== str.charAt(i)) {
                throw new Error("Expected '" + str.charAt(i) + "' at position " + index);
            }
            nextChar();
        }
    }

    function parseObject() {
        var obj = {};
        nextChar();
        skipWhitespace();

        if (ch === '}') {
            nextChar();
            return obj;
        }

        while (ch) {
            skipWhitespace();

            if (ch !== '"') {
                throw new Error("Object key must be a string at position " + index);
            }
            var key = parseString();

            skipWhitespace();

            if (ch !== ':') {
                throw new Error("Expected ':' after key at position " + index);
            }
            nextChar();

            var value = parseValue();
            obj[key] = value;

            skipWhitespace();

            if (ch === '}') {
                nextChar();
                break;
            } else if (ch === ',') {
                nextChar();
                skipWhitespace();
                continue;
            } else {
                throw new Error("Expected ',' or '}' in object at position " + index);
            }
        }
        return obj;
    }

    function parseArray() {
        var arr = [];
        nextChar();
        skipWhitespace();

        if (ch === ']') {
            nextChar();
            return arr;
        }

        while (ch) {
            var value = parseValue();
            arr.push(value);

            skipWhitespace();

            if (ch === ']') {
                nextChar();
                break;
            } else if (ch === ',') {
                nextChar();
                continue;
            } else {
                throw new Error("Expected ',' or ']' in array at position " + index);
            }
        }
        return arr;
    }

    function parseString() {
        var result = '';
        var escape = false;
        var hexDigits = '0123456789abcdefABCDEF';
        var unicodeEscape = false;
        var unicodeDigits = '';

        nextChar();

        while (ch) {
            if (escape) {
                if (unicodeEscape) {
                    if (hexDigits.indexOf(ch) >= 0) {
                        unicodeDigits += ch;
                        if (unicodeDigits.length === 4) {
                            result += String.fromCharCode(parseInt(unicodeDigits, 16));
                            unicodeEscape = false;
                            escape = false;
                        }
                    } else {
                        throw new Error("Invalid unicode escape sequence at position " + index);
                    }
                } else {
                    switch (ch) {
                        case '"': result += '"'; break;
                        case '\\': result += '\\'; break;
                        case '/': result += '/'; break;
                        case 'b': result += '\b'; break;
                        case 'f': result += '\f'; break;
                        case 'n': result += '\n'; break;
                        case 'r': result += '\r'; break;
                        case 't': result += '\t'; break;
                        case 'u':
                            unicodeEscape = true;
                            unicodeDigits = '';
                            break;
                        default:
                            result += ch;
                    }
                    if (!unicodeEscape) {
                        escape = false;
                    }
                }
            } else {
                if (ch === '"') {
                    nextChar();
                    return result;
                } else if (ch === '\\') {
                    escape = true;
                } else {
                    result += ch;
                }
            }
            nextChar();
        }
        throw new Error("Unterminated string literal");
    }

    function parseNumber() {
        var start = index - 1;
        var isFloat = false;

        if (ch === '-') {
            nextChar();
        }

        while (ch >= '0' && ch <= '9') {
            nextChar();
        }

        if (ch === '.') {
            isFloat = true;
            nextChar();
            while (ch >= '0' && ch <= '9') {
                nextChar();
            }
        }

        if (ch === 'e' || ch === 'E') {
            isFloat = true;
            nextChar();
            if (ch === '-' || ch === '+') {
                nextChar();
            }
            while (ch >= '0' && ch <= '9') {
                nextChar();
            }
        }

        var numStr = jsonString.substring(start, index - 1);
        var number = isFloat ? parseFloat(numStr) : parseInt(numStr, 10);

        if (isNaN(number)) {
            throw new Error("Invalid number at position " + start);
        }

        return number;
    }

    try {
        nextChar();
        var result = parseValue();
        skipWhitespace();

        if (ch) {
            throw new Error("Unexpected text after JSON at position " + index);
        }

        return result;
    } catch (e) {
        throw new Error("JSON.parse error: " + e.message);
    }
};

/**
 * Deep clones an object via JSON.
 * @memberof JSONLib
 * @function clone
 * @param {*} obj - Object to clone.
 * @returns {*} Deep clone of the object.
 * @example
 * var original = {a: 1, b: {c: 2}};
 * var copy = JSONLib.clone(original);
 * copy.b.c = 3; // original.b.c remains 2
 */
JSONLib.clone = function (obj) {
    return JSONLib.parse(JSONLib.stringify(obj));
};

/**
 * Safe JSON parsing (does not throw an exception).
 * @memberof JSONLib
 * @function safeParse
 * @param {string} jsonString - JSON formatted string.
 * @param {*} [defaultValue=null] - Default value in case of parsing error.
 * @returns {*} Parsed value or default value.
 * @example
 * var obj = JSONLib.safeParse('invalid json', {});
 * // obj = {} (returns default value on error)
 */
JSONLib.safeParse = function (jsonString, defaultValue) {
    try {
        return JSONLib.parse(jsonString);
    } catch (e) {
        return defaultValue !== undefined ? defaultValue : null;
    }
};

if (typeof JSON === 'undefined') {
    JSON = {
        stringify: JSONLib.stringify,
        parse: JSONLib.parse
    };
}