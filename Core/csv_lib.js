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

if (typeof CSVLib === 'undefined') {
    CSVLib = {};
}

/**
 * @private
 */
CSVLib._separatorChars = [';', '|', '\t', ','];

/**
 * @private
 */
CSVLib.trim = function (str) {
    return str.replace(/^\s+|\s+$/g, '');
}

/**
 * @private
 */
CSVLib.isBlank = function (str) {
    return str === null || str === undefined || this.trim(str) === '';
}

/**
 * Removes BOM (Byte Order Mark) from the beginning of a string.
 * Supports UTF-8 BOM (EF BB BF) and UTF-16 BOM (FF FE or FE FF).
 * @private
 * @param {string} str - Input string.
 * @returns {string} String without BOM.
 */
CSVLib.removeBOM = function (str) {
    if (!str || str.length === 0) return str;

    if (str.length >= 1 && str.charCodeAt(0) === 0xFEFF) {
        return str.substring(1);
    }
    if (str.length >= 3 && str.charCodeAt(0) === 0xEF &&
        str.charCodeAt(1) === 0xBB && str.charCodeAt(2) === 0xBF) {
        return str.substring(3);
    }
    if (str.length >= 1 && str.charCodeAt(0) === 0xFFFE) {
        return str.substring(1);
    }
    return str;
}

/**
 * Detects CSV delimiter based on an array of lines.
 * @param {Array<string>} lines - Array of lines (non-empty, without sep= header).
 * @returns {string} Most probable delimiter (a single character).
 * @private
 */
CSVLib._detectSeparatorFromLines = function (lines) {
    if (!lines || lines.length === 0) return CSVLib._separatorChars[0];

    var bestScore = -1;
    var bestSeparator = CSVLib._separatorChars[0];

    for (var s = 0; s < CSVLib._separatorChars.length; s++) {
        var sep = CSVLib._separatorChars[s];
        var counts = [];
        var linesWithSep = 0;

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var cnt = 0;
            for (var j = 0; j < line.length; j++) {
                if (line.charAt(j) === sep) cnt++;
            }
            counts.push(cnt);
            if (cnt > 0) linesWithSep++;
        }

        if (linesWithSep === 0) continue;

        var unique = {};
        for (var i = 0; i < counts.length; i++) {
            unique[counts[i]] = true;
        }
        var uniqueCount = 0;
        for (var key in unique) {
            if (unique.hasOwnProperty(key)) uniqueCount++;
        }

        var score = linesWithSep * 100 - uniqueCount;
        if (score > bestScore) {
            bestScore = score;
            bestSeparator = sep;
        }
    }

    return bestSeparator;
};

/**
 * Detects CSV delimiter from file content (text).
 * @param {string} content - Content of the CSV file.
 * @returns {string} Delimiter (a single character).
 */
CSVLib.detectSeparatorFromContent = function (content) {
    if (!content) return CSVLib._separatorChars[0];

    var lines = content.split(/\r?\n/);
    var nonEmptyLines = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (this.isBlank(line)) continue;

        if (line.substring(0, 4).toLowerCase() === 'sep=' && line.length > 4) {
            return line.charAt(4);
        }

        nonEmptyLines.push(line);
        if (nonEmptyLines.length >= 1000) break;
    }

    return CSVLib._detectSeparatorFromLines(nonEmptyLines);
};

/**
 * Detects CSV delimiter by reading the first lines from a file.
 * @param {string} filePath - Path to the CSV file.
 * @returns {string} Delimiter (a single character).
 */
CSVLib.detectSeparator = function (filePath) {
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    if (!fso.FileExists(filePath)) {
        return CSVLib._separatorChars[0];
    }

    var file = fso.OpenTextFile(filePath, 1);
    var lines = [];
    var maxLines = 1000;
    var sepHeaderFound = false;
    var sepChar = null;

    while (!file.AtEndOfStream && lines.length < maxLines) {
        var line = file.ReadLine();
        if (this.isBlank(line)) continue;

        if (!sepHeaderFound && line.substring(0, 4).toLowerCase() === 'sep=' && line.length > 4) {
            sepChar = line.charAt(4);
            break;
        }

        lines.push(line);
    }
    file.Close();

    if (sepChar !== null) return sepChar;
    return CSVLib._detectSeparatorFromLines(lines);
};

(function () {
    var BabyParse = {};

    var DEFAULTS = {
        delimiter: "",
        newline: "",
        header: false,
        dynamicTyping: false,
        preview: 0,
        step: undefined,
        comments: false,
        complete: undefined,
        skipEmptyLines: false,
        fastMode: false,
        skipLines: 0,
        autoDetectDelimiter: true
    };

    function copy(obj) {
        var newObj = {};
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                newObj[key] = obj[key];
            }
        }
        return newObj;
    }

    function copyAndValidateConfig(_config) {
        var config = copy(DEFAULTS);
        if (typeof _config !== 'object') return config;

        for (var key in _config) {
            if (_config.hasOwnProperty(key) && DEFAULTS.hasOwnProperty(key)) {
                config[key] = _config[key];
            }
        }
        return config;
    }

    /**
     * Parses a CSV string and returns the result.
     * @memberof CSVLib.BabyParse
     * @param {string} csvString - String with CSV data.
     * @param {ParseConfig} [config] - Parsing configuration.
     * @returns {ParseResult} Parsing result.
     */
    BabyParse.parse = function (csvString, config) {

        config = copyAndValidateConfig(config);
        var delimiter = config.delimiter;
        if ((delimiter === undefined || delimiter === "") && config.autoDetectDelimiter !== false) {
            delimiter = CSVLib.detectSeparatorFromContent(csvString);
        } else if (delimiter === "") {
            delimiter = ",";
        }

        var hasHeader = config.header || false;
        var skipLines = config.skipLines || 0;
        var result = { data: [], errors: [], meta: {} };

        var newline = '\n';
        if (csvString.indexOf('\r\n') > -1) newline = '\r\n';
        else if (csvString.indexOf('\r') > -1) newline = '\r';

        var lines = csvString.split(newline);
        if (lines.length === 0) return result;

        if (skipLines > 0) {
            if (skipLines >= lines.length) {
                return result;
            }
            lines = lines.slice(skipLines);
        }

        var headers = [];
        if (hasHeader && lines.length > 0) {
            var headerParts = lines[0].split(delimiter);
            for (var h = 0; h < headerParts.length; h++) {
                headers.push(this.trim(headerParts[h]));
            }
            lines.shift();
        }

        for (var i = 0; i < lines.length; i++) {
            if (config.skipEmptyLines && CSVLib.trim(lines[i]) === '') continue;

            var fields = [];
            var fieldParts = lines[i].split(delimiter);
            for (var f = 0; f < fieldParts.length; f++) {
                fields.push(CSVLib.trim(fieldParts[f]));
            }

            if (hasHeader && headers.length > 0) {
                var obj = {};
                for (var j = 0; j < Math.min(headers.length, fields.length); j++) {
                    obj[headers[j]] = fields[j];
                }
                result.data.push(obj);
            } else {
                result.data.push(fields);
            }
        }

        if (hasHeader) result.meta.fields = headers;
        result.meta.skippedLines = skipLines;
        result.meta.delimiter = delimiter;
        return result;
    };

    /**
     * Converts data to a CSV string.
     * @memberof CSVLib.BabyParse
     * @param {Array<Object|Array>} data - Array of rows or objects.
     * @param {Object} [config] - Serialization parameters.
     * @param {Array<string>} [config.fields] - Field order (for objects).
     * @param {string} [config.delimiter=","] - Delimiter.
     * @param {string} [config.newline="\r\n"] - Newline character.
     * @param {boolean} [config.header=true] - Whether to add a header row.
     * @returns {string} CSV string.
     */
    BabyParse.unparse = function (data, config) {
        config = config || {};
        var delimiter = config.delimiter || ',';
        var newline = config.newline || '\r\n';

        var lines = [];
        var fields = config.fields || [];

        if (fields.length === 0 && data.length > 0) {
            var firstItem = data[0];
            var isArray = Object.prototype.toString.call(firstItem) === '[object Array]';
            if (typeof firstItem === 'object' && !isArray) {
                for (var key in firstItem) {
                    if (firstItem.hasOwnProperty(key)) {
                        fields.push(key);
                    }
                }
            }
        }

        if (fields.length > 0 && config.header !== false) {
            lines.push(fields.join(delimiter));
        }

        for (var i = 0; i < data.length; i++) {
            var row = data[i];
            var values = [];

            var isRowArray = Object.prototype.toString.call(row) === '[object Array]';

            if (isRowArray) {
                values = row;
            } else if (typeof row === 'object') {
                for (var j = 0; j < fields.length; j++) {
                    values.push(row[fields[j]] || '');
                }
            } else {
                values = [String(row)];
            }

            lines.push(values.join(delimiter));
        }

        return lines.join(newline);
    };

    BabyParse.RECORD_SEP = String.fromCharCode(30);
    BabyParse.UNIT_SEP = String.fromCharCode(31);
    BabyParse.BYTE_ORDER_MARK = "\ufeff";
    BabyParse.BAD_DELIMITERS = ["\r", "\n", "\"", BabyParse.BYTE_ORDER_MARK];
    BabyParse.DefaultDelimiter = ",";
    BabyParse.DEFAULTS = DEFAULTS;

    CSVLib.BabyParse = BabyParse;
})();

/**
 * Parses a CSV file and returns the result.
 * @memberof CSVLib
 * @function parseCsvFile
 * @param {string} filePath - Path to the CSV file.
 * @param {ParseConfig} [config] - Configuration object (all fields optional):
 * - delimiter: field delimiter (auto-detected by default)
 * - header: if true, the first line is treated as a header (default false)
 * - skipLines: number of lines to skip at the beginning (default 0)
 * - skipEmptyLines: if true, skips empty lines (default false)
 * - autoDetectDelimiter: if true, automatically detects delimiter (default true)
 * - and other options from ParseConfig.
 * @returns {ParseResult} Parsing result:
 *   - data: array of parsed rows (objects if header=true, otherwise arrays)
 *   - errors: array of errors
 *   - meta: parsing information (fields delimiter, fields, skippedLines)
 * @example
 * // Example with automatic delimiter detection and header
 * var result = CSVLib.parseCsvFile("data.csv", {
 *     header: true,
 *     skipEmptyLines: true,
 *     skipLines: 2
 * });
 * if (result.errors.length === 0) {
 *     for (var i = 0; i < result.data.length; i++) {
 *         WScript.Echo(result.data[i].Name + " : " + result.data[i].Value);
 *     }
 * } else {
 *     WScript.Echo("Error: " + result.errors[0].message);
 * }
 *
 * // Example with explicit delimiter
 * var result2 = CSVLib.parseCsvFile("data.csv", {
 *     delimiter: ";",
 *     header: false
 * });
 * var rows = result2.data; // array of arrays
 * WScript.Echo("First row, second column: " + rows[0][1]);
 */
CSVLib.parseCsvFile = function (filePath, config) {
    try {
        var fso = new ActiveXObject("Scripting.FileSystemObject");
        if (!fso.FileExists(filePath)) {
            return { data: [], errors: [{ message: "File not found: " + filePath }], meta: {} };
        }

        var stream = new ActiveXObject("ADODB.Stream");
        stream.Type = 2;
        stream.Charset = "utf-8";
        stream.Open();
        stream.LoadFromFile(filePath);
        var csvContent = stream.ReadText(-1);
        stream.Close();

        csvContent = this.removeBOM(csvContent);

        return CSVLib.BabyParse.parse(csvContent, config);
    } catch (e) {
        return { data: [], errors: [{ message: "Error reading file: " + e.message }], meta: {} };
    }
};

/**
 * Returns data in indexed form (array of arrays) and headers.
 * @memberof CSVLib
 * @function getIndexedData
 * @param {ParseResult|Array} csvData - Parsing result or data array.
 * @returns {IndexedData} Object with fields data (array of arrays) and headers.
 */
CSVLib.getIndexedData = function (csvData) {
    var result = { data: [], headers: [] };

    var data = csvData.data || csvData;
    if (!data || data.length === 0) return result;

    var firstRow = data[0];
    var isArray = Object.prototype.toString.call(firstRow) === '[object Array]';

    if (isArray) {
        result.data = data;
        if (csvData.meta && csvData.meta.fields) {
            result.headers = csvData.meta.fields;
        } else {
            for (var i = 0; i < firstRow.length; i++) {
                result.headers.push("col_" + i);
            }
        }
    } else if (typeof firstRow === 'object') {
        var headers = [];
        for (var key in firstRow) {
            if (firstRow.hasOwnProperty(key)) {
                headers.push(key);
            }
        }
        result.headers = headers;

        for (var i = 0; i < data.length; i++) {
            var row = data[i];
            var rowArray = [];
            for (var h = 0; h < headers.length; h++) {
                rowArray.push(row[headers[h]] || "");
            }
            result.data.push(rowArray);
        }
    }

    return result;
};

/**
 * Finds the index of a column by possible names (case-insensitive).
 * @memberof CSVLib
 * @function findColumnIndex
 * @param {Array<string>} headers - Array of headers.
 * @param {Array<string>} possibleNames - Array of possible names.
 * @returns {number} Column index or -1.
 */
CSVLib.findColumnIndex = function (headers, possibleNames) {
    if (!headers || !possibleNames) return -1;

    for (var i = 0; i < possibleNames.length; i++) {
        var searchName = possibleNames[i].toLowerCase();
        for (var j = 0; j < headers.length; j++) {
            var header = (headers[j] || "").toLowerCase();
            if (header === searchName) {
                return j;
            }
        }
    }
    return -1;
};

if (typeof BabyParse === 'undefined') {
    BabyParse = CSVLib.BabyParse;
}