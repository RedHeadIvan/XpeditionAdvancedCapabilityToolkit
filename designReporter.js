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
includeJS(libsRoot + "Core\\linq_lib.js");
includeJS(libsRoot + "Core\\mg_utils.js");

var output = OutputLib.createConsole(new OutputLib.MentorLayoutDriver("Design report"));

var pcbDoc = Application.ActiveDocument;
pcbDoc.Validate(Scripting.CreateObject("MGCPCBAutomationLicensing.Application").GetToken(pcbDoc.Validate(0)))

var boardOutline = pcbDoc.BoardOutline;

var bWidth = boardOutline.Extrema.MaxX(epcbUnitMM) - boardOutline.Extrema.MinX(epcbUnitMM)
var bHeight = boardOutline.Extrema.MaxY(epcbUnitMM) - boardOutline.Extrema.MinY(epcbUnitMM)
output.message("Board size: " + bWidth + "x" + bHeight + " mm");

var layerList = MG_Utils.convertArray(pcbDoc.LayerStack);
var th = 0;
for (var i = 0; i < layerList.length; i++) {
    if (true) {
        th = th + layerList[i].LayerProperties.Thickness
    }
}

th = Math.round(th*10000)/10000;
output.message("Total thickness: " + th + " mm");
var layersCount = pcbDoc.LayerCount;

var nets = MG_Utils.convertArray(pcbDoc.Nets);
var routedCount = new LinqLib.Enumerable(nets).count(function (x) { return x.IsRouted(); });
if (routedCount < nets.length)
    output.error("Routed " + routedCount + " of " + nets.length + " nets (" + Math.round(routedCount / nets.length * 10000) / 100 + "%)");
else
    output.success("Routed " + routedCount + " of " + nets.length + " nets (" + Math.round(routedCount / nets.length * 10000) / 100 + "%)");

var components = MG_Utils.convertArray(pcbDoc.Components);
var placedCount = new LinqLib.Enumerable(components).count(function (x) { return x.Placed; });
if (placedCount < components.length)
    output.error("Placed " + placedCount + " of " + components.length + " components (" + Math.round(placedCount / components.length * 10000) / 100 + "%)");
else
    output.success("Placed " + placedCount + " of " + components.length + " components (" + Math.round(placedCount / components.length * 10000) / 100 + "%)");

output.message("");
var segsList = MG_Utils.convertArray(pcbDoc.Traces);
var minSegWidths = new LinqLib.Enumerable(segsList).select(function (x) { return x.Geometry.LineWidth }).distinct().min();

if (minSegWidths >= 0.076)
    output.success("Min trace width: " + minSegWidths);
else
    output.error("Min trace width: " + minSegWidths);

output.message("");
output.message("Hazards:");
var hazards = MG_Utils.convertArray(pcbDoc.Hazards(84));
var unplacedHCount = hazards.length;

output.message("Unplaced part (84): " + hazards.length);

hazards = MG_Utils.convertArray(pcbDoc.Hazards(67));
var proximityHCount = hazards.length;
output.message("Proximity (67): " + hazards.length);

hazards = MG_Utils.convertArray(pcbDoc.Hazards(68));
var hangersHCount = hazards.length;
output.message("Hangers (68): " + hazards.length);

hazards = MG_Utils.convertArray(pcbDoc.Hazards(69));
var loopsHCount = hazards.length;
output.message("TraceLoops (69): " + hazards.length);

hazards = MG_Utils.convertArray(pcbDoc.Hazards(76));
var connPinHCount = hazards.length;
output.message("UplatedConnectionPin (76): " + hazards.length);

hazards = MG_Utils.convertArray(pcbDoc.Hazards(2));
var batchHCount = hazards.length;
var otherHCount = hazards.length - unplacedHCount - proximityHCount - hangersHCount - loopsHCount - connPinHCount
output.message("Other: " + otherHCount);


var viasList = MG_Utils.convertArray(pcbDoc.Vias);
var pinsList = MG_Utils.convertArray(pcbDoc.Pins);
var multiVias = MG_Utils.convertArray(pcbDoc.MultiVias);
var MultiViaCount = new LinqLib.Enumerable(viasList).sum(function (x) { return x.Holes.Count; });
var blindCount = new LinqLib.Enumerable(viasList).count(function (x) { return x.CurrentPadstack.HoleRangeFromLayer != 1 || x.CurrentPadstack.HoleRangeToLayer != layersCount });
var totalViaHolesCount = pcbDoc.Holes.Count;
var totalMountingHolesCount = pcbDoc.MountingHoles.Count;
var totalTHPinHolesCount = new LinqLib.Enumerable(pinsList).count(function (x) { return x.Holes.Count > 0 });

output.message("");
output.message("Vias total count: " + (viasList.length + totalMountingHolesCount + totalTHPinHolesCount));
output.message("Including:");
output.message("- Mounting holes: " + totalMountingHolesCount);
output.message("- TH pins: " + totalTHPinHolesCount);
output.message("- Vias holes: " + viasList.length + " (" + blindCount + " blind)");
output.message("");

var uniqueViasList = new LinqLib.Enumerable(viasList).distinct(function (x) { return x.Name + ":" + x.CurrentPadstack.HoleRangeFromLayer + ":" + x.CurrentPadstack.HoleRangeToLayer }).toArray();
var viaSpans = new LinqLib.Enumerable(uniqueViasList).groupBy(function (x) { return x.CurrentPadstack.HoleRangeFromLayer + ":" + x.CurrentPadstack.HoleRangeToLayer }).toArray();


output.message("Vias used:");
for (var i = 0; i < viaSpans.length; i++) {
    output.message(viaSpans[i].key);
    for (var j = 0; j < viaSpans[i].items.length; j++) {
        output.message("----\t" + viaSpans[i].items[j].Name + " - " + new LinqLib.Enumerable(viasList).count(function (x) {
            return x.Name == viaSpans[i].items[j].Name &&
                x.CurrentPadstack.HoleRangeFromLayer == viaSpans[i].items[j].CurrentPadstack.HoleRangeFromLayer && x.CurrentPadstack.HoleRangeToLayer == viaSpans[i].items[j].CurrentPadstack.HoleRangeToLayer
        }));
    }

    if (viaSpans[i].key != "1:" + layersCount) {
        checkBlindVias(viaSpans[i].items, layerList);
    }
    else {
        checkTHVias(viaSpans[i].items, th);
    }
}



function checkTHVias(vias, th) {

    var minimumHoleDiameter = new LinqLib.Enumerable(vias).min(function (x) { return x.Holes.Item(1).DrillSize(epcbUnitMM); });
    if (th <= 2) {
        if (minimumHoleDiameter < th / 10) {
            output.error("Min hole diameter = " + minimumHoleDiameter + ", but pcb height = " + th);
        }
    }
    else if (th <= 2.5) {
        if (minimumHoleDiameter < th / 7) {
            output.error("Min hole diameter = " + minimumHoleDiameter + ", but pcb height = " + th);
        }
    }
    else {
        if (minimumHoleDiameter < th / 5) {
            output.error("Min hole diameter = " + minimumHoleDiameter + ", but pcb height = " + th);
        }
    }
}

function checkBlindVias(vias, layers) {

    var from = vias[0].CurrentPadstack.HoleRangeFromLayer;
    var to = vias[0].CurrentPadstack.HoleRangeToLayer;
    if (to - from != 1) {
        output.warning("Scipt do not work with blind vias with span greater than 1!")
        return;
    }

    var H = layers[from * 2].LayerProperties.Thickness;

    var minimumHoleDiameter = new LinqLib.Enumerable(vias).min(function (x) { return x.Holes.Item(1).DrillSize(epcbUnitMM); });
    if (H >= minimumHoleDiameter * 0.7) {
        output.error("Blind via height is too small! (d= " + minimumHoleDiameter + ", h=" + H + ")");
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
