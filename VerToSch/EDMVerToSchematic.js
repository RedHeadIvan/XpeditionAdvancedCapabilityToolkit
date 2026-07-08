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
 * EDMVerToSchematic library
 * Provides functionality to add EDM version information to a schematic.
 * @namespace EDMVerToSchematic
 */

var libsRoot = "\\\\edm\\WDIR_Corporate\\Scripts\\";
includeJS(libsRoot + "Core\\output_lib.js");
includeJS(libsRoot + "Core\\string_lib.js");

if (typeof EDMVerToSchematic === 'undefined') {
    EDMVerToSchematic = {};
}

/**
 * Main function to add the EDM version to the currently active schematic.
 * It determines the appropriate design block (automatically if only one exists,
 * or uses the active document), retrieves the version from the EDM entity,
 * and calls addVersion.
 * 
 * @memberof EDMVerToSchematic
 * @function runVersion
 */
EDMVerToSchematic.runVersion = function () {
    try {
        var console = OutputLib.createConsole(new OutputLib.MentorDriver("Add Version"));

        if (Application.ActiveDocument) {
            if (Application.ActiveDocument.IsReadOnly) {
                return;
            }
        } else {
            return;
        }

        var dmentity = Application.ActiveDocument.DataManagementEntity;
        if (dmentity == null) {
            console.error("Version does not exist, project is non-EDM!");
            return;
        }

        var ver_str = dmentity.Version().replace(/[()]/g, '');

        var sDesign = Application.GetProjectData().GetiCDBDesignRootBlock(Application.GetActiveDesign());

        if (sDesign === "") {
            var strList = Application.GetProjectData().GetiCDBDesigns();
            var count = strList.GetCount();

            if (count > 1) {
                console.popup(
                    "Your project contains more than one Boards and no schematic is open.\n" +
                    "Please open a schematic of the Board to be processed!",
                    OutputLib.Icon.Error,
                    "Error"
                );
                return;
            } else if (count > 0) {
                sDesign = strList.GetItem(1);
                this.addVersion(sDesign, ver_str);
            }
        } else {
            this.addVersion(sDesign, ver_str);
        }
    } catch (e) {
        AppendOutput("ERROR", "runVersion: " + e.message);
    }
}

/**
 * Internal function that actually updates the version attribute.
 * Searches for an annotate symbol with path ending in "list1_gost"
 * and sets its "doc_Version" property.
 * 
 * @private
 * @param {string} sRootBlock - Root block name of the schematic design.
 * @param {string} ver_str - Version string to set.
 */
EDMVerToSchematic.addVersion = function(sRootBlock, ver_str) {
    try {
        var console = OutputLib.createConsole(new OutputLib.MentorDriver("Add Version"));
        
        var components = Application.DesignComponents("", sRootBlock, "-1", "-1", true);
        
        var count = components.Count;
        for (var i = 0; i < count; i++) {
            var oComp = components.Item(i + 1);
            if (oComp.SymbolBlock.SymbolType === VDB_ANNOTATE) {
                var sHierPath = oComp.SymbolBlock.GetName(0);
                if (StringLib.endsWith(sHierPath, "list1_gost")) {
                    var verprop = oComp.FindAttribute("doc_Version");
                    if (verprop != null) {
                        verprop.Value = ver_str;
                        console.success("Schematic version added successfully! Current version is " + ver_str + "");
                        console.info("VERSION WILL BE VALID ONLY AFTER CHECK-IN!");
                    }
                    return;
                }
            }
        }
    } catch (e) {
        AppendOutput("ERROR", "addVersion: " + e.message);
    }
}

function includeJS(filename) {
    try {
        var fso = new ActiveXObject("Scripting.FileSystemObject");
        if (!fso.FileExists(filename)) {
            WScript.Echo("File not found: " + filename);
            return;
        }
        var file = fso.OpenTextFile(filename, 1);
        var code = file.ReadAll();
        file.Close();
        var globalFunc = new Function(code);
        globalFunc();
    } catch (e) {
        WScript.Echo("Error in includeJS: " + e.message + " (code: " + e.number + ")");
    }
}