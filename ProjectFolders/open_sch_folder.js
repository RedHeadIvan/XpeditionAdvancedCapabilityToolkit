var libsRoot = "\\\\edm\\WDIR_Corporate\\Scripts\\";
includeJS(libsRoot + "Core\\output_lib.js");

OpenPCBFolder();

function OpenPCBFolder() {

    var mentorOutput = OutputLib.createConsole(new OutputLib.MentorDriver("Open folder"));
    var prData = null;

    try {
        prData = Application.GetProjectData();
        var schPath = prData.GetProjectPath();

        if (schPath && schPath !== "") {

            var fso = new ActiveXObject("Scripting.FileSystemObject");
            if (fso.FolderExists(schPath)) {
                var shell = new ActiveXObject("WScript.Shell");
                shell.Run("explorer.exe " + schPath);
            } else {
                mentorOutput.popup("There is no schematic folder available!", OutputLib.Icon.Error, "Error");
            }
        } else {
            mentorOutput.popup("There is no schematic folder available!", OutputLib.Icon.Error, "Error");
        }
    } catch (e) {
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
