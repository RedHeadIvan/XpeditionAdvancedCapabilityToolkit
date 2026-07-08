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

if (typeof OutputLib === 'undefined') {
    OutputLib = {};
}

/**
 * Button constants for popup method.
 * Correspond to values used in WScript.Shell.Popup.
 * @enum {number}
 */
OutputLib.Button = {
    /** OK button only */
    OK: 0,
    /** OK and Cancel buttons */
    OKCancel: 1,
    /** Abort, Retry, Ignore buttons */
    AbortRetryIgnore: 2,
    /** Yes, No, Cancel buttons */
    YesNoCancel: 3,
    /** Yes and No buttons */
    YesNo: 4,
    /** Retry and Cancel buttons */
    RetryCancel: 5
};

/**
 * Icon constants for popup method.
 * Correspond to values used in WScript.Shell.Popup.
 * @enum {number}
 */
OutputLib.Icon = {
    /** Error (red cross) */
    Error: 16,
    /** Warning (yellow triangle) */
    Warning: 48,
    /** Information (blue circle) */
    Info: 64,
    /** No icon */
    Simple: 0
};

/**
 * Result constants returned by popup method.
 * Correspond to codes returned by WScript.Shell.Popup.
 * @enum {number}
 */
OutputLib.Result = {
    /** OK button pressed */
    OK: 1,
    /** Cancel button pressed */
    Cancel: 2,
    /** Abort button pressed */
    Abort: 3,
    /** Retry button pressed */
    Retry: 4,
    /** Ignore button pressed */
    Ignore: 5,
    /** Yes button pressed */
    Yes: 6,
    /** No button pressed */
    No: 7,
    /** Timeout expired (if timeout was specified) */
    Timeout: -1
};

/**
 * Shows a popup window (analogous to MsgBox). Static method, does not depend on driver.
 * @param {string} text - Message text.
 * @param {number|string} [icon] - Icon (number from OutputLib.Icon or string: 'error', 'warning', 'info').
 * @param {string} [title] - Window title.
 * @param {number} [buttons] - Button combination (OutputLib.Button can be used).
 * @returns {number} Code of the pressed button (from OutputLib.Result).
 */
OutputLib.popup = function (text, icon, title, buttons) {
    var shell = new ActiveXObject("WScript.Shell");
    var iconValue = 0;
    if (typeof icon === 'string') {
        switch (icon.toLowerCase()) {
            case 'error': iconValue = OutputLib.Icon.Error; break;
            case 'warning': iconValue = OutputLib.Icon.Warning; break;
            case 'info': iconValue = OutputLib.Icon.Info; break;
            default: iconValue = OutputLib.Icon.Simple;
        }
    } else if (typeof icon === 'number') {
        iconValue = icon;
    }
    var btn = (buttons !== undefined) ? buttons : OutputLib.Button.OK;
    var timeout = 0;
    return shell.Popup(text, timeout, title || "Message", btn + iconValue);
};

/**
 * Base class for all output drivers.
 * @constructor
 */
OutputLib.BaseDriver = function () { };

/**
 * Outputs a message of a specific type.
 * @param {string} type - Message type: 'message', 'warning', 'error', 'info', 'debug', 'link'.
 * @param {string} text - Message text.
 * @throws {Error} If the method is not overridden in the driver.
 */
OutputLib.BaseDriver.prototype.output = function (type, text, needPrefix) {
    throw new Error("Method output must be implemented in the driver");
};

/**
 * Driver for output to console via WScript.Echo.
 * @constructor
 * @extends OutputLib.BaseDriver
 */
OutputLib.WScriptDriver = function () { };
OutputLib.WScriptDriver.prototype = new OutputLib.BaseDriver();

/**
 * Outputs a message to the console with a prefix depending on the type.
 * @param {string} type - Message type.
 * @param {string} text - Message text.
 */
OutputLib.WScriptDriver.prototype.output = function (type, text, needPrefix) {
    var prefix = "";
    if (needPrefix)
        prefix = this._getPrefix(type);
    WScript.Echo(prefix + text);
};

/**
 * Shows a popup window via the static method.
 * @param {string} text - Message text.
 * @param {number|string} [icon] - Icon.
 * @param {string} [title] - Window title.
 * @param {number} [buttons] - Button combination.
 * @returns {number} Code of the pressed button.
 */
OutputLib.WScriptDriver.prototype.popup = function (text, icon, title, buttons) {
    return OutputLib.popup(text, icon, title, buttons);
};

/**
 * Returns the prefix for a given message type.
 * @private
 * @param {string} type - Message type.
 * @returns {string} Prefix (e.g., "ERROR: ").
 */
OutputLib.WScriptDriver.prototype._getPrefix = function (type) {
    switch (type) {
        case 'warning': return "WARNING: ";
        case 'error': return "ERROR: ";
        case 'info': return "INFO: ";
        case 'success': return "SUCCESS: ";
        case 'debug': return "DEBUG: ";
        default: return "";
    }
};

/**
 * Driver for output to a text file with buffering.
 * @constructor
 * @extends OutputLib.BaseDriver
 * @param {string} filePath - Full path to the file.
 * @param {string} [encoding="utf-8"] - File encoding.
 */
OutputLib.FileDriver = function (filePath, encoding) {
    this.filePath = filePath;
    this.encoding = encoding || "utf-8";
    this.buffer = [];
    this.bufferSize = 10;
};
OutputLib.FileDriver.prototype = new OutputLib.BaseDriver();

/**
 * Writes a message to the file (with prefix).
 * @param {string} type - Message type.
 * @param {string} text - Message text.
 */
OutputLib.FileDriver.prototype.output = function (type, text, needPrefix) {
    var prefix = "";
    if (needPrefix)
        prefix = this._getPrefix(type);
    this._writeToFile(prefix + text + "\r\n");
};

/**
 * Clears the file.
 */
OutputLib.FileDriver.prototype.clear = function () {
    var fso = new ActiveXObject("Scripting.FileSystemObject");
    var file = fso.CreateTextFile(this.filePath, true);
    file.Close();
    this.buffer = [];
};

/**
 * Writes a popup message to the file as plain text marked POPUP.
 * Does not return a result.
 * @param {string} text - Message text.
 * @param {number|string} [icon] - Icon (ignored, for compatibility only).
 * @param {string} [title] - Title (ignored).
 * @param {number} [buttons] - Buttons (ignored).
 * @returns {undefined}
 */
OutputLib.FileDriver.prototype.popup = function (text, icon, title, buttons) {
    var prefix = "POPUP [" + (icon || 'message') + "]: ";
    var fullMessage = prefix + text;
    this._writeToFile(fullMessage + "\r\n");
    WScript.Echo(fullMessage);
    return undefined;
};

/**
 * Returns the prefix for a given message type.
 * @private
 * @param {string} type - Message type.
 * @returns {string} Prefix.
 */
OutputLib.FileDriver.prototype._getPrefix = function (type) {
    switch (type) {
        case 'warning': return "WARNING: ";
        case 'error': return "ERROR: ";
        case 'info': return "INFO: ";
        case 'success': return "SUCCESS: ";
        case 'debug': return "DEBUG: ";
        default: return "";
    }
};

/**
 * Forces the buffer to be flushed to the file.
 */
OutputLib.FileDriver.prototype.flush = function () {
    if (this.buffer.length === 0) return;
    var content = this.buffer.join("\r\n") + "\r\n";
    this.buffer = [];
    this._writeToFile(content);
};

/**
 * Internal method to write a string to the file.
 * @private
 * @param {string} content - Data to write.
 */
OutputLib.FileDriver.prototype._writeToFile = function (content) {
    var stream = null;
    try {
        stream = new ActiveXObject("ADODB.Stream");
        stream.Type = 2;
        stream.Charset = this.encoding;
        stream.Open();

        var fso = new ActiveXObject("Scripting.FileSystemObject");
        if (fso.FileExists(this.filePath)) {
            stream.LoadFromFile(this.filePath);
            stream.Position = stream.Size;
        }

        stream.WriteText(content);
        stream.SaveToFile(this.filePath, 2);
        stream.Close();
    } catch (e) {
        WScript.Echo("File write error: " + e.message);
        WScript.Echo("Content: " + content);
    } finally {
        if (stream && stream.State !== 0) stream.Close();
    }
};

/**
 * Driver for output to Mentor Output window with cross-probing and formatting support.
 * @constructor
 * @extends OutputLib.BaseDriver
 * @param {string} tabName - Name of the tab in the output window.
 */
OutputLib.MentorDriver = function (tabName) {

    this.tab = null;
    this.tabName = tabName;

    /**
     * Callback for obtaining the display name of an object.
     * @type {function(string, string): string|null}
     */
    this.nameCallback = this._defaultGetName;

    /**
     * Callback for finding an object by UID.
     * @type {function(string): Object|null}
     */
    this.findObjectCallback = this._defaultFindObject;

    /**
     * Callback for selecting and zooming to an object.
     * @type {function(Object)}
     */
    this.fitObjectCallback = this._defaultFitObject;
};
OutputLib.MentorDriver.prototype = new OutputLib.BaseDriver();

/**
 * Outputs a formatted message to the Mentor window.
 * @param {string} type - Message type.
 * @param {string} text - Message text.
 */
OutputLib.MentorDriver.prototype.output = function (type, text, needPrefix) {
    if (!this.tab)
        this._activateTab();
    var html = this._formatHtml(type, text, needPrefix) + "<br>";
    this.tab.AppendHtml(html);
};

OutputLib.MentorDriver.prototype.clear = function () {
    if (this.tab) {
        this.tab.Clear();
    }
};

OutputLib.MentorDriver.prototype._activateTab = function (type, text, needPrefix) {
    var outputWindow = Application.Addins("Output").Control();
    outputWindow.Visible = true;
    this.regexPattern = "(.*)UID:(\\$[0-9]+)([A-Z])([0-9]+)(.*)";
    var outputTab = outputWindow.FindTab(this.tabName);
    if (outputTab != null) {
        outputWindow.ActivateTab(this.tabName);
        outputTab.Clear();
        this.tab = outputTab;
    } else {
        outputTab = outputWindow.AddTab(this.tabName);
        outputTab.Clear();
        outputTab.Activate();
        this.tab = outputTab;
        this.registerCrossProbe();
    }
};

/**
 * Shows a popup window via the static method.
 * @param {string} text - Message text.
 * @param {number|string} [icon] - Icon.
 * @param {string} [title] - Window title.
 * @param {number} [buttons] - Button combination.
 * @returns {number} Code of the pressed button.
 */
OutputLib.MentorDriver.prototype.popup = function (text, icon, title, buttons) {
    return OutputLib.popup(text, icon, title, buttons);
};

/**
 * Outputs plain text for cross-probing.
 * @param {string} text - Message text.
 */
OutputLib.MentorDriver.prototype.link = function (text) {
    if (!this.tab) return;
    AppendOutput(this.tabName, text);
};

/**
 * Returns the prefix for a message type.
 * @private
 * @param {string} type - Message type.
 * @returns {string} Prefix.
 */
OutputLib.MentorDriver.prototype._getPrefix = function (type) {
    switch (type) {
        case 'error': return "ERROR: ";
        case 'warning': return "WARNING: ";
        case 'info': return "INFO: ";
        case 'success': return "SUCCESS: ";
        case 'debug': return "DEBUG: ";
        default: return "";
    }
};

/**
 * Formats the message as an HTML string.
 * @private
 * @param {string} type - Message type.
 * @param {string} text - Message text.
 * @returns {string} HTML code.
 */
OutputLib.MentorDriver.prototype._formatHtml = function (type, text, needPrefix) {
    var prefix = "";
    if (needPrefix)
        prefix = this._getPrefix(type);
    var fullText = prefix + text;
    var escaped = fullText.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    var color, style;
    switch (type) {
        case 'error': color = '#cc0000'; style = 'font-weight:bold'; break;
        case 'warning': color = '#cc6600'; break;
        case 'info': color = '#0066cc'; break;
        case 'success': color = '#066000'; break;
        case 'debug': color = '#666666'; break;
        default: color = '#000000';
    }
    return '<span style="color:' + color + ';' + (style || '') + '">' + escaped + '</span>';
};

/**
 * Registers a regular expression to automatically convert UIDs into links.
 * @private
 */
OutputLib.MentorDriver.prototype.registerCrossProbe = function () {
    if (!this.tab) return;
    try {
        this.tab.RegisterErrorExpression(this.regexPattern, this, "VisitObject", "FormatObject");
    } catch (e) { }
};

/**
 * Called by the output window to format a string containing a UID.
 * @param {string} str - The original string.
 * @param {Object} linkObj - Link object to configure.
 * @returns {boolean} true if formatting was applied.
 */
OutputLib.MentorDriver.prototype.FormatObject = function (str, linkObj) {
    var regex = new RegExp(this.regexPattern, "i");
    var matches = regex.exec(str);
    if (matches && matches.length >= 5) {
        var textBeforeUid = matches[1];
        var textAfterUid = matches[5];
        var prefix = matches[2];
        var typeLetter = matches[3];
        var number = matches[4];
        var uid = prefix + typeLetter + number;

        var displayName = this.nameCallback(uid, typeLetter);
        var linkText = displayName ? textBeforeUid + displayName + textAfterUid : textBeforeUid + uid + textAfterUid;

        linkObj.MessageClass = 1;
        linkObj.String = linkText;
        linkObj.hRef = "UID:" + uid;
        linkObj.FormatLink = true;
        linkObj.HelpKey = "";
        linkObj.HelpId = 0;
        linkObj.DisplayLinkImage = true;
        return true;
    }
    return false;
};

/**
 * Called when a link is clicked.
 * @param {Object} anchor - The anchor object.
 */
OutputLib.MentorDriver.prototype.VisitObject = function (anchor) {
    var url = anchor.href;
    var parts = url.split(":");
    if (parts.length < 2) {

        return;
    }
    var uid = parts[1];

    var obj = this.findObjectCallback(uid);
    if (obj) {
        this.fitObjectCallback(obj);
    }
};

/**
 * Finds an object by UID using Application.Query.
 * @param {string} uid - Unique identifier.
 * @returns {Object|null} The found object or null.
 */
OutputLib.MentorDriver.prototype._defaultFindObject = function (uid) {
    var dd2;
    if (StringLib.contains(uid, "I"))
        dd2 = Application.DesignComponents("", MG_Utils.getSchematicRoot(), "-1");
    else
        dd2 = Application.DesignNets("", MG_Utils.getSchematicRoot(), "-1");

    for (var i = 0; i < dd2.Count; i++) {
        if (dd2.Item(i + 1).UID == uid) {
            return dd2.Item(i + 1);
        }
    }

    return null;
};

/**
 * Selects and zooms to an object.
 * @param {Object} obj - The object to select.
 */
OutputLib.MentorDriver.prototype._defaultFitObject = function (obj) {

    var root = MG_Utils.getSchematicRoot();
    var obj_type = obj.Type;
    Application.ActiveView.Block.DeSelectAll();
    var selected = false;
    switch (obj_type) {
        case VDTS_COMPONENT:
            selected = Application.SelectPath(root, obj.GetName(FULL_PATH_NAME), "", 0, false, false);
            break;
        case VDTS_NET:

            var path = obj.Parent.GetName(FULL_PATH_NAME);
            if (root == path) {
                var parts = path.split('\\');
                path = parts.slice(1, parts.length - 1).join('\\')
            }
            var sheet = obj.Parent.SheetNum;
            if (obj.LogicalNetName && obj.LogicalNetName != "")
                path = path + "\\" + obj.LogicalNetName;
            else
                path = path + "\\" + obj.UID;

            selected = Application.SelectPath(root, path, sheet, 1, false, false);
            break;
        case VDTS_PIN:

            var path = obj.Parent.GetName(FULL_PATH_NAME);
            if (root == path) {
                var parts = path.split('\\');
                path = parts.slice(1, parts.length - 1).join('\\')
            }
            var sheet = obj.Parent.SheetNum;
            selected = Application.SelectPathCompPin(root, path, sheet, pinNumber, 1);

            break;
    }
    if (selected) {
        Application.ActiveView.ZoomSelect();
    }
};

/**
 * Gets the display name of an object by UID and type.
 * @param {string} uid - Object UID.
 * @param {string} typeLetter - Type letter.
 * @returns {string|null} Display name or null.
 */
OutputLib.MentorDriver.prototype._defaultGetName = function (uid, typeLetter) {
    var obj = this._defaultFindObject(uid);
    if (!obj) return null;
    try {
        if (typeLetter.toUpperCase() === 'I') {
            var refDes = obj.Refdes;
            return refDes ? " " + refDes : uid;
        } else if (typeLetter.toUpperCase() === 'N') {
            var netName = obj.LogicalNetName;
            return netName ? " " + netName : uid;
        } else {
            return uid;
        }
    } catch (e) {
        return uid;
    }
};

/**
 * Sets a custom callback for finding an object by UID.
 * @param {function(string): Object|null} callback
 */
OutputLib.MentorDriver.prototype.setFindObjectCallback = function (callback) {
    this.findObjectCallback = callback;
};

/**
 * Sets a custom callback for selecting an object.
 * @param {function(Object)} callback
 */
OutputLib.MentorDriver.prototype.setFitObjectCallback = function (callback) {
    this.fitObjectCallback = callback;
};

/**
 * Sets a custom callback for obtaining the display name of an object.
 * @param {function(string, string): string|null} callback
 */
OutputLib.MentorDriver.prototype.setNameCallback = function (callback) {
    this.nameCallback = callback;
};

/**
 * Driver for output to Mentor Layout Output window with cross-probing and formatting support.
 * @constructor
 * @extends OutputLib.BaseDriver
 * @param {string} tabName - Name of the tab in the output window.
 */
OutputLib.MentorLayoutDriver = function (tabName) {
    this.tab = null;
    this.tabName = tabName;

    /**
     * Callback for obtaining the display name of an object.
     * @type {function(string, string): string|null}
     */
    this.nameCallback = this._defaultGetName;

    /**
     * Callback for finding an object by UID.
     * @type {function(string): Object|null}
     */
    this.findObjectCallback = this._defaultFindObject;

    /**
     * Callback for selecting and zooming to an object.
     * @type {function(Object)}
     */
    this.fitObjectCallback = this._defaultFitObject;
};
OutputLib.MentorLayoutDriver.prototype = new OutputLib.BaseDriver();

/**
 * Outputs a formatted message to the Mentor window.
 * @param {string} type - Message type.
 * @param {string} text - Message text.
 */
OutputLib.MentorLayoutDriver.prototype.output = function (type, text, needPrefix) {
    if (!this.tab)
        this._activateTab();
    var html = this._formatHtml(type, text, needPrefix) + "<br>";
    this.tab.AppendHtml(html);
};

OutputLib.MentorLayoutDriver.prototype.clear = function () {
    if (this.tab) this.tab.Clear();
};

OutputLib.MentorLayoutDriver.prototype._activateTab = function (type, text, needPrefix) {
    var outputWindow = Application.Addins.Item("Message Window");
    outputWindow.Visible = true;
    this.regexPattern = "(.*)UID:(\\$[0-9]+)([A-Z])([0-9]+)(.*)";
    var outputTab = null;

    if (outputTab != null) {
        outputWindow.Control.ActivateTab(this.tabName);
        this.tab = outputTab;
    } else {
        outputTab = outputWindow.Control.AddTab(this.tabName);
        outputTab.Clear();
        outputTab.Activate();
        this.tab = outputTab;
        this.registerCrossProbe();
    }
};

/**
 * Shows a popup window via the static method.
 * @param {string} text - Message text.
 * @param {number|string} [icon] - Icon.
 * @param {string} [title] - Window title.
 * @param {number} [buttons] - Button combination.
 * @returns {number} Code of the pressed button.
 */
OutputLib.MentorLayoutDriver.prototype.popup = function (text, icon, title, buttons) {
    return OutputLib.popup(text, icon, title, buttons);
};

/**
 * Outputs plain text for cross-probing.
 * @param {string} text - Message text.
 */
OutputLib.MentorLayoutDriver.prototype.link = function (text) {
    if (!this.tab) return;
    this.tab.AppendText(this.tabName, text);
};

/**
 * Returns the prefix for a message type.
 * @private
 * @param {string} type - Message type.
 * @returns {string} Prefix.
 */
OutputLib.MentorLayoutDriver.prototype._getPrefix = function (type) {
    switch (type) {
        case 'error': return "ERROR: ";
        case 'warning': return "WARNING: ";
        case 'info': return "INFO: ";
        case 'success': return "SUCCESS: ";
        case 'debug': return "DEBUG: ";
        default: return "";
    }
};

/**
 * Formats the message as an HTML string.
 * @private
 * @param {string} type - Message type.
 * @param {string} text - Message text.
 * @returns {string} HTML code.
 */
OutputLib.MentorLayoutDriver.prototype._formatHtml = function (type, text, needPrefix) {
    var prefix = "";
    if (needPrefix)
        prefix = this._getPrefix(type);
    var fullText = prefix + text;
    var escaped = fullText.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    var color, style;
    switch (type) {
        case 'error': color = '#cc0000'; style = 'font-weight:bold'; break;
        case 'warning': color = '#cc6600'; break;
        case 'info': color = '#0066cc'; break;
        case 'success': color = '#066000'; break;
        case 'debug': color = '#666666'; break;
        default: color = '#000000';
    }
    return '<span style="color:' + color + ';' + (style || '') + '">' + escaped + '</span>';
};

/**
 * Registers a regular expression to automatically convert UIDs into links.
 * @private
 */
OutputLib.MentorLayoutDriver.prototype.registerCrossProbe = function () {
    if (!this.tab) return;
    try {
        this.tab.RegisterErrorExpression(this.regexPattern, this, "VisitObject", "FormatObject");
    } catch (e) { }
};

/**
 * Called by the output window to format a string containing a UID.
 * @param {string} str - The original string.
 * @param {Object} linkObj - Link object to configure.
 * @returns {boolean} true if formatting was applied.
 */
OutputLib.MentorLayoutDriver.prototype.FormatObject = function (str, linkObj) {
    var regex = new RegExp(this.regexPattern, "i");
    var matches = regex.exec(str);
    if (matches && matches.length >= 5) {
        var textBeforeUid = matches[1];
        var textAfterUid = matches[5];
        var prefix = matches[2];
        var typeLetter = matches[3];
        var number = matches[4];
        var uid = prefix + typeLetter + number;

        var displayName = this.nameCallback(uid, typeLetter);
        var linkText = displayName ? textBeforeUid + displayName + textAfterUid : textBeforeUid + uid + textAfterUid;

        linkObj.MessageClass = 1;
        linkObj.String = linkText;
        linkObj.hRef = "UID:" + uid;
        linkObj.FormatLink = true;
        linkObj.HelpKey = "";
        linkObj.HelpId = 0;
        linkObj.DisplayLinkImage = true;
        return true;
    }
    return false;
};

/**
 * Called when a link is clicked.
 * @param {Object} anchor - The anchor object.
 */
OutputLib.MentorLayoutDriver.prototype.VisitObject = function (anchor) {
    var url = anchor.href;
    var parts = url.split(":");
    if (parts.length < 2) return;
    var uid = parts[1];

    var obj = this.findObjectCallback(uid);
    if (obj) {
        this.fitObjectCallback(obj);
    }
};

/**
 * Finds an object by UID using Application.Query.
 * @param {string} uid - Unique identifier.
 * @returns {Object|null} The found object or null.
 */
OutputLib.MentorLayoutDriver.prototype._defaultFindObject = function (uid) {
    var dd2 = Application.ActiveDocument.FindObjectById(uid);
    return dd2;
};

/**
 * Selects and zooms to an object.
 * @param {Object} obj - The object to select.
 */
OutputLib.MentorLayoutDriver.prototype._defaultFitObject = function (obj) {
    obj.Selected = True;
    var ext = obj.Extrema;
    Application.ActiveDocument.ActiveView.SetExtentsToExtremaEx(ext, true);
};

/**
 * Gets the display name of an object by UID and type.
 * @param {string} uid - Object UID.
 * @param {string} typeLetter - Type letter.
 * @returns {string|null} Display name or null.
 */
OutputLib.MentorLayoutDriver.prototype._defaultGetName = function (uid, typeLetter) {
    var obj = this._defaultFindObject(uid);
    if (!obj) return null;
    try {
        if (typeLetter.toUpperCase() === 'I') {
            var refDes = obj.Refdes;
            return refDes ? " " + refDes : uid;
        } else if (typeLetter.toUpperCase() === 'N') {
            var netName = obj.LogicalNetName;
            return netName ? " " + netName : uid;
        } else {
            return uid;
        }
    } catch (e) {
        return uid;
    }
};

/**
 * Sets a custom callback for finding an object by UID.
 * @param {function(string): Object|null} callback
 */
OutputLib.MentorLayoutDriver.prototype.setFindObjectCallback = function (callback) {
    this.findObjectCallback = callback;
};

/**
 * Sets a custom callback for selecting an object.
 * @param {function(Object)} callback
 */
OutputLib.MentorLayoutDriver.prototype.setFitObjectCallback = function (callback) {
    this.fitObjectCallback = callback;
};

/**
 * Sets a custom callback for obtaining the display name of an object.
 * @param {function(string, string): string|null} callback
 */
OutputLib.MentorLayoutDriver.prototype.setNameCallback = function (callback) {
    this.nameCallback = callback;
};

/**
 * Console bound to a specific output driver.
 * @constructor
 * @param {OutputLib.BaseDriver} driver - The output driver.
 */
OutputLib.Console = function (driver) {
    if (!driver || typeof driver.output !== 'function') {
        throw new Error("Console: driver must implement output method");
    }
    this._driver = driver;
};

/**
 * Outputs a regular message.
 * @param {string} text - Message text.
 */
OutputLib.Console.prototype.message = function (text, needPrefix) {
    this._driver.output('message', text, needPrefix);
};

/**
 * Outputs a warning.
 * @param {string} text - Warning text.
 */
OutputLib.Console.prototype.warning = function (text, needPrefix) {
    this._driver.output('warning', text, needPrefix);
};

/**
 * Outputs an error.
 * @param {string} text - Error text.
 */
OutputLib.Console.prototype.error = function (text, needPrefix) {
    this._driver.output('error', text, needPrefix);
};

/**
 * Outputs information.
 * @param {string} text - Information text.
 */
OutputLib.Console.prototype.info = function (text, needPrefix) {
    this._driver.output('info', text, needPrefix);
};

/**
 * Outputs a success message.
 * @param {string} text - Information text.
 */
OutputLib.Console.prototype.success = function (text, needPrefix) {
    this._driver.output('success', text, needPrefix);
};

/**
 * Outputs a debug message.
 * @param {string} text - Debug text.
 */
OutputLib.Console.prototype.debug = function (text, needPrefix) {
    this._driver.output('debug', text, needPrefix);
};

/**
 * Clears the tab.
 */
OutputLib.Console.prototype.clear = function () {
    this._driver.clear();
};

/**
 * Outputs text for cross-probing.
 * @param {string} text - Link text.
 */
OutputLib.Console.prototype.link = function (text, needPrefix) {
    if (typeof this._driver.link === 'function') {
        this._driver.link(text);
    } else {
        this._driver.output('link', text, needPrefix);
    }
};

/**
 * Shows a popup window via the driver.
 * @param {string} text - Message text.
 * @param {number|string} [icon] - Icon (number from OutputLib.Icon or string).
 * @param {string} [title] - Window title.
 * @param {number} [buttons] - Button combination.
 * @returns {number|undefined} Code of the pressed button (from OutputLib.Result) or undefined.
 */
OutputLib.Console.prototype.popup = function (text, icon, title, buttons) {
    if (typeof this._driver.popup === 'function') {
        return this._driver.popup(text, icon, title, buttons);
    } else {
        WScript.Echo("POPUP: " + text);
        return undefined;
    }
};

OutputLib.WScriptDriver.prototype.clear = function () {
    WScript.Echo("\n" + "=".repeat(50) + "\n");
};

/**
 * Returns the driver for direct access.
 * @returns {OutputLib.BaseDriver}
 */
OutputLib.Console.prototype.getDriver = function () {
    return this._driver;
};

/**
 * Creates a console instance.
 * @param {OutputLib.BaseDriver} driver - The output driver.
 * @returns {OutputLib.Console}
 */
OutputLib.createConsole = function (driver) {
    return new OutputLib.Console(driver);
};