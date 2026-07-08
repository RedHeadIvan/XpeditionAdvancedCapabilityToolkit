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

var manuToolbar;

var DxDFolderBtn;
var PCBFolderBtn;
var AddClusterBtn;
var NetAssignerBtn;
var ConnNamerBtn;
var LabelAlignerBtn;
var DxDCheckerBtn;
var VerToSchBtn;
var CalcsBtn;

Scripting.AttachEvents(Application, "Application");
Scripting.DontExit = true;

var libsRoot = "\\\\edm\\WDIR_Corporate\\Scripts\\";

includeJS(libsRoot + "Core\\output_lib.js");
includeJS(libsRoot + "Core\\string_lib.js");
includeJS(libsRoot + "VerToSch\\EDMVerToSchematic.js");

if (Application.Visible) {
    try {

        var myToolbar = null;
        try {
            myToolbar = CommandBars("LocalToolbar");
        }
        catch (e) {
            Application.CreateToolbar("LocalToolbar");
            myToolbar = CommandBars("LocalToolbar");
        }

        DxDFolderBtn = myToolbar.Controls.Add(cmdControlButton, undefined, undefined, -1);
        DxDFolderBtn.OnAction = "run \\Scripts\\ProjectFolders\\open_sch_folder.js";
        DxDFolderBtn.TooltipText = "Open DxD folder";
        DxDFolderBtn.DescriptionText = "Open schematic project folder";
        DxDFolderBtn.BitmapFile = "\\Scripts\\ProjectFolders\\designer_folder_icon.bmp";
        DxDFolderBtn.Enabled = false;

        PCBFolderBtn = myToolbar.Controls.Add(cmdControlButton, undefined, undefined, -1);
        PCBFolderBtn.OnAction = "run \\Scripts\\ProjectFolders\\open_pcb_folder.js";
        PCBFolderBtn.TooltipText = "Open PCB folder";
        PCBFolderBtn.DescriptionText = "Open PCB project folder";
        PCBFolderBtn.BitmapFile = "\\Scripts\\ProjectFolders\\layout_folder_icon.bmp";
        PCBFolderBtn.Enabled = false;

        AddClusterBtn = myToolbar.Controls.Add(cmdControlButton, undefined, undefined, -1);
        AddClusterBtn.OnAction = "run \\Scripts\\AddCluster\\add_cluster_core.js";
        AddClusterBtn.TooltipText = "AddCluster";
        AddClusterBtn.DescriptionText = "AutoAdd Cluster Properties";
        AddClusterBtn.BitmapFile = "\\Scripts\\AddCluster\\add_cluster.bmp";
        AddClusterBtn.Enabled = false;

        NetAssignerBtn = myToolbar.Controls.Add(cmdControlButton, undefined, undefined, -1);
        NetAssignerBtn.OnAction = "form \\Scripts\\NetAssigner\\NetAssigner.efm";
        NetAssignerBtn.TooltipText = "NetAssigner";
        NetAssignerBtn.DescriptionText = "Put nets from csv to comp pins";
        NetAssignerBtn.BitmapFile = "\\Scripts\\NetAssigner\\net_assigner.bmp";
        NetAssignerBtn.Enabled = false;

        ConnNamerBtn = myToolbar.Controls.Add(cmdControlButton, undefined, undefined, -1);
        ConnNamerBtn.OnAction = "run \\Scripts\\ConnNamer\\conn_namer_core.js";
        ConnNamerBtn.TooltipText = "Conn Namer";
        ConnNamerBtn.DescriptionText = "Fills connector fields by net names";
        ConnNamerBtn.BitmapFile = "\\Scripts\\ConnNamer\\conn_namer.bmp";
        ConnNamerBtn.Enabled = false;

        LabelAlignerBtn = myToolbar.Controls.Add(cmdControlButton, undefined, undefined, -1);
        LabelAlignerBtn.OnAction = "run \\Scripts\\LabelAligner\\label_aligner.js";
        LabelAlignerBtn.TooltipText = "Label Aligner";
        LabelAlignerBtn.DescriptionText = "Align netnames for power and ground symbols";
        LabelAlignerBtn.BitmapFile = "\\Scripts\\LabelAligner\\label_aligner.bmp";
        LabelAlignerBtn.Enabled = false;

        VerToSchBtn = myToolbar.Controls.Add(cmdControlButton, undefined, undefined, -1);
        VerToSchBtn.OnAction = "run \\Scripts\\VerToSch\\EDMVerToSchematic_runner.js";
        VerToSchBtn.TooltipText = "Add version";
        VerToSchBtn.DescriptionText = "Add version to first page";
        VerToSchBtn.BitmapFile = "\\Scripts\\VerToSch\\update_version.bmp";
        VerToSchBtn.Enabled = false;

        DxDCheckerBtn = myToolbar.Controls.Add(cmdControlButton, undefined, undefined, -1);
        DxDCheckerBtn.OnAction = "run \\Scripts\\DxDChecker\\dxd_checker_core.js";
        DxDCheckerBtn.TooltipText = "Check schematic";
        DxDCheckerBtn.DescriptionText = "Perform some custom schematic checks";
        DxDCheckerBtn.BitmapFile = "\\Scripts\\DxDChecker\\dxd_checker.bmp";
        DxDCheckerBtn.Enabled = false;

        CalcsBtn = myToolbar.Controls.Add(cmdControlButton, undefined, undefined, -1);
        CalcsBtn.OnAction = "run \\Scripts\\WebCalcs\\openWebCalcs.js";
        CalcsBtn.TooltipText = "Calcs";
        CalcsBtn.DescriptionText = "Open engineering calcs page";
        CalcsBtn.BitmapFile = "\\Scripts\\WebCalcs\\calc.bmp";
        CalcsBtn.Enabled = true;

    } catch (e) {
        AppendOutput("ERRORS", "Error while adding button: " + e.message);
    }
}

function Application_BeforeProjectChanged() {
    if (DxDFolderBtn != null) DxDFolderBtn.Enabled = false;
    if (PCBFolderBtn != null) PCBFolderBtn.Enabled = false;
    if (AddClusterBtn != null) AddClusterBtn.Enabled = false;
    if (NetAssignerBtn != null) NetAssignerBtn.Enabled = false;
    if (ConnNamerBtn != null) ConnNamerBtn.Enabled = false;
    if (LabelAlignerBtn != null) LabelAlignerBtn.Enabled = false;
    if (VerToSchBtn != null) VerToSchBtn.Enabled = false;
    if (DxDCheckerBtn != null) DxDCheckerBtn.Enabled = false;
}

function Application_ProjectChanged(projectData) {
    var isProjectOpened = projectData.GetProjectName() != "";

    if (isProjectOpened) freshProject = true;
    if (DxDFolderBtn != null) DxDFolderBtn.Enabled = isProjectOpened;
    if (PCBFolderBtn != null) PCBFolderBtn.Enabled = isProjectOpened;
    if (AddClusterBtn != null) AddClusterBtn.Enabled = isProjectOpened;
    if (NetAssignerBtn != null) NetAssignerBtn.Enabled = isProjectOpened;
    if (ConnNamerBtn != null) ConnNamerBtn.Enabled = isProjectOpened;
    if (LabelAlignerBtn != null) LabelAlignerBtn.Enabled = isProjectOpened;
    if (VerToSchBtn != null) VerToSchBtn.Enabled = isProjectOpened;
    if (DxDCheckerBtn != null) DxDCheckerBtn.Enabled = isProjectOpened;
}

function Application_ProjectClosed() {
    if (DxDFolderBtn != null) DxDFolderBtn.Enabled = false;
    if (PCBFolderBtn != null) PCBFolderBtn.Enabled = false;
    if (AddClusterBtn != null) AddClusterBtn.Enabled = false;
    if (NetAssignerBtn != null) NetAssignerBtn.Enabled = false;
    if (ConnNamerBtn != null) ConnNamerBtn.Enabled = false;
    if (LabelAlignerBtn != null) LabelAlignerBtn.Enabled = false;
    if (VerToSchBtn != null) VerToSchBtn.Enabled = false;
    if (DxDCheckerBtn != null) DxDCheckerBtn.Enabled = false;
}

function Application_AfterDocumentOpened(DocumentType, LibraryAlias, Name) {
    if (DocumentType == 0) {
        if (freshProject) {
            EDMVerToSchematic.runVersion();
            freshProject = false;
        }
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
