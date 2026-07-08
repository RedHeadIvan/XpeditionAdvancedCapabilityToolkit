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

var libsRoot = "\\\\edm\\WDIR_Corporate\\Scripts\\;
includeJS(libsRoot + "Core\\fa_parser_lib.js");
includeJS(libsRoot + "Core\\output_lib.js");
includeJS(libsRoot + "Core\\string_lib.js");
includeJS(libsRoot + "Core\\linq_lib.js");
includeJS(libsRoot + "Core\\mg_utils.js");


var menuBar = Gui.CommandBars("Document Menu Bar");
var myMenu = menuBar.Controls.Add(cmdControlPopup)
myMenu.Caption = "Scripts";

var testMenu = myMenu.Controls.Add(cmdControlButton)
testMenu.Caption = "Design Report"
testMenu.OnAction = "run " + libsRoot + "Scripts\\designReporter.js";

var testMenu1 = myMenu.Controls.Add(cmdControlButton)
testMenu1.Caption = "Output folder"
testMenu1.OnAction = "run " + libsRoot + "Scripts\\openLayoutOutput.js";

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
