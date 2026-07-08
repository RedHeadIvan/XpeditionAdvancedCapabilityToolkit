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
includeJS(libsRoot + "Core\\string_lib.js");
includeJS(libsRoot + "Core\\output_lib.js");

var console = OutputLib.createConsole(new OutputLib.MentorDriver("Auto Add Cluster"));

var StartTime = new Date().getTime();

var strList, sDesign, iCntComps = 0;

try {
    sDesign = Application.GetProjectData().GetiCDBDesignRootBlock(Application.GetActiveDesign());
} catch (e) {
    sDesign = "";
}

if (sDesign === "") {
    strList = Application.GetProjectData().GetiCDBDesigns();
    if (strList.GetCount() > 1) {
        console.popup("Your project contains more than one Boards and no schematic is open.\nPlease open a schematic of the Board to be processed!", 0, "No design open", 0+48);
    } else {
        sDesign = strList.GetItem(1);
        iCntComps = AddCluster(sDesign);
    }
} else {
    iCntComps = AddCluster(sDesign);
}

var EndTime = new Date().getTime();
var runtime = (EndTime - StartTime) / 1000;

console.success("Adding Cluster properties finished. Processed number of components: " + iCntComps);

function AddCluster(sRootBlock) {
    var iCnt = 0;
    var components = Application.DesignComponents("", sRootBlock, "-1", "-1", true);
    var count = components.Count;
    
    for (var i = 1; i <= count; i++) {
        var oComp = components.Item(i);
        if (oComp.SymbolBlock.SymbolType === VDB_MODULE) {
            var sHierPath = oComp.Parent.GetName(0);
            sHierPath = sHierPath.replace(/\\/g, '/');
            
            if (sHierPath.indexOf('$') !== -1) {
                console.warning("There is a block with no assigned name, so instance name is used: " + oComp.Refdes + " - " + sHierPath);
            }
            
            var sAttrString = "Cluster=" + sHierPath;
            
            try {
                var oAttr = oComp.AddOat(sAttrString);
                oAttr.Visible = VDINVISIBLE;
                iCnt++;
            } catch (e) {
                console.error("Error adding attr for " + oComp.Refdes + ": " + e.message);
            }
        }
    }
    return iCnt;
}

function includeJS(filename) {
    try {
        var fso = new ActiveXObject("Scripting.FileSystemObject");
        if (!fso.FileExists(filename)) {
            AppendOutput("ERROR", "File not found: " + filename);
            return;
        }

        var file = fso.OpenTextFile(filename, 1);
        var fileSize = file.Size;

        var code = file.ReadAll();
        file.Close();
        eval(code)

    } catch (e) {
        AppendOutput("ERROR", "Error in includeJS: " + e.message + " (number: " + e.number + ")");
    }
}
