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

var console = OutputLib.createConsole(new OutputLib.MentorDriver("Conn Naming"));

var dd = Application.ActiveView.Query(VDM_COMP, VD_SELECTED);

    console.message("---------Connector naming started---------");
if (dd.count == 0) {
    console.error("No components selected!");
}
for (var a = 0; a < dd.Count; a++) {
    var selectedComp = dd.Item(a + 1);

    if (startsWith(selectedComp.RefDes, "X")) {
        var Block = selectedComp.Parent;
        var conns = selectedComp.GetConnections();

        var conn;
        var pin;
        var net;
        var segment;
        var point;
        var list = [];
        
        for (var i = 0; i < conns.Count; i++) {
            var isNC = false;

            var addedText = null;

            var compLowLeft = selectedComp.GetBboxPoint(VDLOWERLEFT);
            var compUpRight = selectedComp.GetBboxPoint(VDUPPERRIGHT);

            conn = conns.Item(i + 1);
            pin = conn.CompPin;
            net = conn.Net;
            if (net != null) {
                segment = conn.Segment;
                point = segment.Location(VDJ_LOW);
                list.push({
                    logicalNetName: net.LogicalNetName,
                    pinNumber: pin.Number,
                    x: point.X,
                    y: point.Y
                });
                var netname = net.LogicalNetName;
                var pinNumber = pin.Number;
                comp = pin.Component;
                symBlock = comp.SymbolBlock;
                var pinComponent = symBlock.GetName(FULL_PATH_NAME);
                net_conns = net.Connections();

                if (net_conns.Count == 0) {
                    isNC = true;
                }
                else if (net_conns.Count == 2) {
                    var anothernull = false;
                    var hasRipper = false;
                    var oneisNC = false;
                    var bothEquals = true;
                    for (var j = 0; j < net_conns.Count; j++) {
                        netcon = net_conns.Item(j + 1);
                        anotherpin = netcon.CompPin;
                        if (anotherpin == null) {
                            anothernull = true;
                            continue;
                        }

                        ripper = conn.Ripper;
                        if (ripper != null) {
                            hasRipper = true;
                            continue;
                        }

                        var apinNumber = anotherpin.Number;
                        comp = anotherpin.Component;
                        symBlock = comp.SymbolBlock;
                        var a = symBlock.GetName(SHORT_NAME);
                        if (startsWith(a, "NoConnect")) {
                            oneisNC = true;
                        }
                        if (a != pinComponent)
                            bothEquals = false;
                    }

                    if (oneisNC || bothEquals)
                        isNC = true;
                    if (anothernull && isNC)
                        isNC = false;
                    if (hasRipper)
                        isNC = false;

                }


                var connW = compUpRight.X - compLowLeft.X;
                var add = connW - (connW - 40) / 2;
                if (selectedComp.Orientation != VDORIENT_IDENTITY)
                    add = -add + 10;

                point = pin.GetLocation();
                var locX = point.X;
                var locY = point.Y;

                addedText = Block.AddText(isNC ? "NC" : net.LogicalNetName, locX + add, locY);
            }
            else {
                var connW = compUpRight.X - compLowLeft.X;
                var add = connW - (connW - 40) / 2;
                if (selectedComp.Orientation != VDORIENT_IDENTITY)
                    add = -add - 10;

                point = pin.GetLocation();
                var locX = point.X;
                var locY = point.Y;

                addedText = Block.AddText("NC", locX + add, locY);
            }

            addedText.Origin = VDALIGN_MC;
        }

        console.success(selectedComp.RefDes + " completely named!");
    }
    else {
        console.error( selectedComp.UID + " is not connector (RefDes have to be X...)");
    }
}


function startsWith(line, str) {
    if (line.length < str.length) {
        return false;
    }
    return line.substring(0, str.length) === str;
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
