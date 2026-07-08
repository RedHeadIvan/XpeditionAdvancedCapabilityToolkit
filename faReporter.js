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

var libsRoot = "\\\\edm\\WDIR_Corporate\\Scripts\\";
includeJS(libsRoot + "Core\\fa_parser_lib.js");
includeJS(libsRoot + "Core\\output_lib.js");
includeJS(libsRoot + "Core\\string_lib.js");


Scripting.AttachEvents(Application.ActiveDocument, "pcbDoc");
Scripting.DontExit = true;

function pcbDoc_OnPostForwardAnnotate(succeeded) {
    RunFaParse();
}

function RunFaParse() {

    var pcbDoc = Application.ActiveDocument;
    pcbDoc.Validate(Scripting.CreateObject("MGCPCBAutomationLicensing.Application").GetToken(pcbDoc.Validate(0)));

    var result = FAParser.parseFile(pcbDoc.Path + "\\LogFiles\\ForwardAnnotation.txt");

    var infoMessages = [];
    var errorMessages = [];
    var warningMessages = [];
    if (result.messages.length > 0) {
        for (var i = 0; i < result.messages.length; i++) {
            var msg = result.messages[i];
            if (msg.type == 'ERROR')
                errorMessages.push(msg);
            else if (StringLib.contains(msg.message, "could not be found in the CellDB") || StringLib.contains(msg.message, "no cells are specified"))
                warningMessages.push(msg);
            else
                infoMessages.push(msg);
        }
    }

    if (errorMessages.length > 0 || warningMessages.length > 0) {
        var output = OutputLib.createConsole(new OutputLib.MentorLayoutDriver("FA Report"));

        for (var i = 0; i < errorMessages.length; i++) {
            output.eror(StringLib.trim(errorMessages[i].message.split(". ")[0]));
        }

        for (var i = 0; i < warningMessages.length; i++) {
            output.warning(StringLib.trim(warningMessages[i].message.split(". ")[0]));
        }

        // for (var i = 0; i < infoMessages.length; i++) {
        //     output.info(StringLib.trim(infoMessages[i].message.split(". ")[0]));
        // }
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
