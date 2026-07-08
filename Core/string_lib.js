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
 * Main object of the string utilities library.
 * @namespace StringLib
 */

if (typeof StringLib === 'undefined') {
    StringLib = {};
}

/**
 * Checks if a string starts with a specified prefix.
 * @memberof StringLib
 * @function startsWith
 * @param {string} str - Source string to check.
 * @param {string} prefix - Prefix to check for.
 * @returns {boolean} true if the string starts with the prefix, otherwise false.
 * @example
 * StringLib.startsWith("Hello World", "Hello"); // true
 * StringLib.startsWith("Hello World", "World"); // false
 */
StringLib.startsWith = function(str, prefix) {
    if (typeof str !== 'string' || typeof prefix !== 'string') {
        return false;
    }
    return str.length >= prefix.length && str.substring(0, prefix.length) === prefix;
};

/**
 * Checks if a string ends with a specified suffix.
 * @memberof StringLib
 * @function endsWith
 * @param {string} str - Source string to check.
 * @param {string} suffix - Suffix to check for.
 * @returns {boolean} true if the string ends with the suffix, otherwise false.
 * @example
 * StringLib.endsWith("script.js", ".js"); // true
 * StringLib.endsWith("script.js", ".ts"); // false
 */
StringLib.endsWith = function(str, suffix) {
    if (typeof str !== 'string' || typeof suffix !== 'string') {
        return false;
    }
    return str.length >= suffix.length && 
           str.substring(str.length - suffix.length) === suffix;
};

/**
 * Removes whitespace characters (spaces, tabs, newlines) from both ends of a string.
 * Analog of the standard String.prototype.trim().
 * @memberof StringLib
 * @function trim
 * @param {string} str - Source string.
 * @returns {string} Trimmed string.
 * @example
 * StringLib.trim("  some text  "); // "some text"
 */
StringLib.trim = function(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/^\s+|\s+$/g, '');
};

/**
 * Checks if a string contains a specified substring.
 * Analog of the standard String.prototype.includes().
 * @memberof StringLib
 * @function contains
 * @param {string} str - Source string to search.
 * @param {string} substring - Substring to find.
 * @returns {boolean} true if the substring is found, otherwise false.
 */
StringLib.contains = function(str, substring) {
    if (typeof str !== 'string' || typeof substring !== 'string') {
        return false;
    }
    return str.indexOf(substring) !== -1;
};

/**
 * Replaces all occurrences of a substring in a string.
 * Analog of the standard String.prototype.replaceAll().
 * @memberof StringLib
 * @function replaceAll
 * @param {string} str - Source string.
 * @param {string} find - Substring to replace.
 * @param {string} replace - Substring to replace with.
 * @returns {string} New string with replacements performed.
 * @example
 * StringLib.replaceAll("a,b,c", ",", ";"); // "a;b;c"
 */
StringLib.replaceAll = function(str, find, replace) {
    if (typeof str !== 'string' || typeof find !== 'string' || typeof replace !== 'string') {
        return str;
    }
    return str.split(find).join(replace);
};

/**
 * Simple serializer of an object to a JSON string.
 * Supports objects, arrays, strings, numbers, boolean, null.
 * Does NOT support functions or circular references.
 * @memberof StringLib
 * @function stringify
 * @param {*} obj - Any value to serialize.
 * @returns {string} JSON formatted string.
 * @example
 * StringLib.stringify({name: "Test", count: 5}); // '{"name":"Test","count":5}'
 */
StringLib.stringify = function(obj) {
    if (obj === null) return "null";
    if (obj === undefined) return "undefined";
    if (typeof obj === "string") return '"' + obj.replace(/"/g, '\\"') + '"';
    if (typeof obj === "number" || typeof obj === "boolean") return String(obj);
    
    var isArray = Object.prototype.toString.call(obj) === '[object Array]';
    
    if (isArray) {
        var arrStr = "[";
        for (var i = 0; i < obj.length; i++) {
            if (i > 0) arrStr += ",";
            arrStr += StringLib.stringify(obj[i]);
        }
        return arrStr + "]";
    }
    
    if (typeof obj === 'object') {
        var objStr = "{";
        var first = true;
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (!first) objStr += ",";
                objStr += '"' + key + '":' + StringLib.stringify(obj[key]);
                first = false;
            }
        }
        return objStr + "}";
    }
    
    return String(obj);
};

/**
 * Simple parser of a JSON string to an object.
 * WARNING: Very simplified implementation. For complex JSON, use an external library.
 * @memberof StringLib
 * @function parse
 * @param {string} jsonString - JSON formatted string.
 * @returns {*} Parsed value (object, array, string, number, etc.).
 */
StringLib.parse = function(jsonString) {
    try {
        if (jsonString === "null") return null;
        if (jsonString === "undefined") return undefined;
        
        if (jsonString === "true") return true;
        if (jsonString === "false") return false;
        
        if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(jsonString)) {
            return parseFloat(jsonString);
        }
        
        if (jsonString.charAt(0) === '"' && jsonString.charAt(jsonString.length - 1) === '"') {
            return jsonString.substring(1, jsonString.length - 1).replace(/\\"/g, '"');
        }
        
        return jsonString;
    } catch (e) {
        return jsonString;
    }
};

/**
 * Formats a string by replacing placeholders {0}, {1}, etc. with the provided arguments.
 * @memberof StringLib
 * @function format
 * @param {string} format - Template string with placeholders.
 * @param {...*} args - Arguments to substitute into placeholders.
 * @returns {string} Formatted string.
 * @example
 * StringLib.format("{0} = {1} ({2})", "R1", "10k", "0805"); // "R1 = 10k (0805)"
 */
StringLib.format = function(format) {
    var args = arguments;
    return format.replace(/{(\d+)}/g, function(match, number) {
        return typeof args[parseInt(number, 10) + 1] !== 'undefined' 
            ? args[parseInt(number, 10) + 1] 
            : match;
    });
};

/**
 * Pads a string on the left with specified characters to reach the desired length.
 * @memberof StringLib
 * @function padLeft
 * @param {string} str - Source string.
 * @param {number} length - Desired string length.
 * @param {string} [char=" "] - Padding character.
 * @returns {string} Padded string.
 */
StringLib.padLeft = function(str, length, char) {
    if (typeof str !== 'string') str = String(str);
    char = char || ' ';
    while (str.length < length) {
        str = char + str;
    }
    return str;
};

/**
 * Pads a string on the right with specified characters to reach the desired length.
 * @memberof StringLib
 * @function padRight
 * @param {string} str - Source string.
 * @param {number} length - Desired string length.
 * @param {string} [char=" "] - Padding character.
 * @returns {string} Padded string.
 */
StringLib.padRight = function(str, length, char) {
    if (typeof str !== 'string') str = String(str);
    char = char || ' ';
    while (str.length < length) {
        str = str + char;
    }
    return str;
};

if (typeof String.prototype.startsWith === 'undefined') {
    String.prototype.startsWith = function(prefix) {
        return StringLib.startsWith(this, prefix);
    };
}

if (typeof String.prototype.endsWith === 'undefined') {
    String.prototype.endsWith = function(suffix) {
        return StringLib.endsWith(this, suffix);
    };
}

if (typeof String.prototype.trim === 'undefined') {
    String.prototype.trim = function() {
        return StringLib.trim(this);
    };
}

if (typeof JSON === 'undefined') {
    JSON = {
        stringify: StringLib.stringify,
        parse: StringLib.parse
    };
}