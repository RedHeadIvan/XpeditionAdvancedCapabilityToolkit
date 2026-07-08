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
includeJS(libsRoot + "Core\\output_lib.js");

alignLabels();

function alignLabels() {
    var console = OutputLib.createConsole(new OutputLib.MentorDriver("Label Aligner"));

    var ActiveView = Application.ActiveView;
    var Block = ActiveView.Block;


    var selectedComp = null;
    var SelectedSymbol = null;
    var selected = ActiveView.Query(VDM_COMP, VD_SELECTED);

    if (selected.Count != 1) {
        if (selected.Count > 1)
            console.error("Only one symbol have to be selected!");
        else
            console.error("No symbol selected!");
        return;
    }
    else {
        selectedComp = selected.Item(1);
        SelectedSymbol = selectedComp.SymbolBlock.GetName(VdNameType.SHORT_NAME)
        console.message("Alining for " + SelectedSymbol + " symbols...");
    }
    Block.DeSelectAll();
    var comps = ActiveView.Query(VdObjectTypeMask.VDM_COMP, VdAllOrSelected.VD_ALL);

    var aligningComps = [];

    for (var i = 0; i < comps.Count; i++) {
        var comp = comps.Item(i + 1);
        var block = comp.SymbolBlock;
        var name = block.GetName(VdNameType.SHORT_NAME);
        var connections = comp.GetConnections();
        if (name == SelectedSymbol && connections.Count == 1) {
            aligningComps.push(comp);
        }
    }

    for (var i = 0; i < aligningComps.length; i++) {
        var temp = aligningComps[i].GetConnections();
        var connection = temp.Item(1);
        var pin = connection.CompPin;
        var pinPoint = pin.GetLocation();
        var pinX = pinPoint.X;
        var pinY = pinPoint.Y;

        var net = connection.Net;
        var segment = connection.Segment;

        var compLowLeft = aligningComps[i].GetBboxPoint(VdCorner.VDLOWERLEFT);
        var compUpRight = aligningComps[i].GetBboxPoint(VdCorner.VDUPPERRIGHT);
        var compLowLeft_X = compLowLeft.X;
        var compLowLeft_Y = compLowLeft.Y;
        var compUpRight_X = compUpRight.X;
        var compUpRight_Y = compUpRight.Y;

        var centerX = SnapToGrid((compLowLeft_X + compUpRight_X) / 2);
        var centerY = SnapToGrid((compLowLeft_Y + compUpRight_Y) / 2);


        var distToTop = Math.abs(pinY - compUpRight_Y);
        var distToBottom = Math.abs(pinY - compLowLeft_Y);
        var distToLeft = Math.abs(pinX - compLowLeft_X);
        var distToRight = Math.abs(pinX - compUpRight_X);

        var minDist = Math.min(Math.min(distToTop, distToBottom), Math.min(distToLeft, distToRight));

        var alignment;
        var textX, textY;

        if (Math.abs(minDist - distToTop) < 1e-9) {
            alignment = VdOrigin.VDALIGN_UC;
            textX = centerX;
            textY = compLowLeft_Y;
        } else if (Math.abs(minDist - distToBottom) < 1e-9) {
            alignment = VdOrigin.VDALIGN_LC;
            textX = centerX;
            textY = compUpRight_Y;
        } else if (Math.abs(minDist - distToLeft) < 1e-9) {
            alignment = VdOrigin.VDALIGN_ML;
            textX = compUpRight_X;
            textY = centerY;
        } else {
            alignment = VdOrigin.VDALIGN_MR;
            textX = compLowLeft_X;
            textY = centerY;
        }

        var labelX = SnapToGrid(textX);
        var labelY = SnapToGrid(textY);

        var label = net.GetLabel(segment);
        var netName = net.LogicalNetName;
        if (label == null) {
            label = net.AddLabel(segment, netName, labelX, labelY);
        } else {
            label.SetLocation(labelX, labelY);
        }

        label.Origin = alignment;
        label.Orientation = VdOrientation.VDORIENT_IDENTITY;
        label.Visible = VdLabelVisibility.VDLABELVISIBLE;
    }

    console.success("Total " + aligningComps.length + " labels aligned!");
}


function SnapToGrid(coord) {
    var grid = 5;
    return Math.round(coord / grid) * grid;
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
