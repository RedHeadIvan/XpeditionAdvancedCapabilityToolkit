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

if (typeof FAParser === 'undefined') {
    FAParser = {};
}

function trim(str) {
    return str.replace(/^\s+|\s+$/g, '');
}

function splitByDoubleNewline(text) {
    var blocks = [];
    var normalized = text.replace(/\r?\n\r?\n/g, '\x00');
    var rawBlocks = normalized.split('\x00');
    for (var i = 0; i < rawBlocks.length; i++) {
        var block = trim(rawBlocks[i]);
        if (block !== "") {
            blocks.push(block);
        }
    }
    return blocks;
}

function flattenBlock(blockText) {
    return blockText.replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
}

FAParser.parse = function(content) {
    var blocks = splitByDoubleNewline(content);
    var messages = [];
    var summary = { errors: 0, warnings: 0, rawSummary: "" };

    for (var b = 0; b < blocks.length; b++) {
        var rawBlock = blocks[b];
        var flatBlock = flattenBlock(rawBlock);

        if (flatBlock.indexOf("WARNING:") === 0 || flatBlock.indexOf("ERROR:") === 0) {
            var type = flatBlock.indexOf("WARNING:") === 0 ? "WARNING" : "ERROR";
            var rest = flatBlock.substring(type === "WARNING" ? 8 : 6).replace(/^\s+/, '');
            var location = "";
            var msgText = rest;
            var colonIdx = rest.indexOf(":");
            if (colonIdx > 0) {
                location = rest.substring(0, colonIdx).replace(/^\s+|\s+$/g, '');
                msgText = rest.substring(colonIdx + 1).replace(/^\s+|\s+$/g, '');
            }
            messages.push({
                type: type,
                location: location,
                message: msgText,
                blockIndex: b
            });
        }

        if (flatBlock.indexOf("Netload failed with") !== -1) {
            var summaryMatch = flatBlock.match(/Netload failed with (\d+) errors? and (\d+) warnings?/i);
            if (summaryMatch) {
                summary.errors = parseInt(summaryMatch[1], 10);
                summary.warnings = parseInt(summaryMatch[2], 10);
                summary.rawSummary = flatBlock;
            }
        }
    }

    if (summary.errors === 0 && summary.warnings === 0 && messages.length > 0) {
        var errCount = 0, warnCount = 0;
        for (var i = 0; i < messages.length; i++) {
            if (messages[i].type === "ERROR") errCount++;
            else if (messages[i].type === "WARNING") warnCount++;
        }
        summary.errors = errCount;
        summary.warnings = warnCount;
        summary.rawSummary = "Auto-counted from messages";
    }

    return { messages: messages, summary: summary };
};

FAParser.parseFile = function(filePath) {
    try {
        var fso = new ActiveXObject("Scripting.FileSystemObject");
        if (!fso.FileExists(filePath)) {
            return { messages: [], summary: { errors: 0, warnings: 0, rawSummary: "File not found" } };
        }
        var file = fso.OpenTextFile(filePath, 1);
        var content = file.ReadAll();
        file.Close();
        return FAParser.parse(content);
    } catch (e) {
        return { messages: [], summary: { errors: 0, warnings: 0, rawSummary: "Error reading file: " + e.message } };
    }
};