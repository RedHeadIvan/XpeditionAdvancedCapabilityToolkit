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

assignNetsFromFile = function (filePath, pinColumn, netColumn, skipLines, allowEmptyPins, allowEmptyNets, skipPower) {

    try{
        Application.Interactive = false;
        worker(filePath, pinColumn, netColumn, skipLines, allowEmptyPins, allowEmptyNets, skipPower);
    }
    catch(e)
    {

    }
    finally
    {        
        Application.Interactive = true;
    }
}

worker = function (filePath, pinColumn, netColumn, skipLines, allowEmptyPins, allowEmptyNets, skipPower) {

    var console = OutputLib.createConsole(new OutputLib.MentorDriver("Net Assigner"));

    var StartTime = new Date().getTime();
    filePath = StringLib.trim(filePath);

    var parseResult = CSVLib.parseCsvFile(filePath, { skipLines: skipLines })

    if (parseResult.errors.length > 0) {
        console.popup("CSV reading error: " + parseResult.errors[0].message, 16, "Error", 0);
        console.error("CSV reading error: " + parseResult.errors[0].message);
        return -1;
    }

    var rows = parseResult.data;
    if (rows.length === 0) {
        console.popup("No valid data in file after row skip!", 16, "Error");
        console.error("No valid data in file after row skip!");
        return;
    }


    var pinList = [];
    var maxCol = Math.max(pinColumn, netColumn);
    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (row.length <= maxCol) {
            console.popup("Not enough columns in " + (i + 1 + skipLines) + " row", 16, "Error");
            console.error("Not enough columns in " + (i + 1 + skipLines) + " row");
            return -1;
        }

        var pinVal = StringLib.trim(row[pinColumn] || "");
        var netVal = StringLib.trim(row[netColumn] || "");

        if (pinVal === "") {
            if (!allowEmptyPins) {
                console.popup("Empty pin number in " + (i + 1 + skipLines) + " row", 16, "Error");
                console.error("Empty pin number in " + (i + 1 + skipLines) + " row");
                return -1;
            } else {
                continue;
            }
        }
        if (netVal === "") {
            if (!allowEmptyNets) {
                console.popup("Empty net name in " + (i + 1 + skipLines) + " row", 16, "Error");
                console.error("Empty net name in " + (i + 1 + skipLines) + " row");
                return -1;
            } else {
                continue;
            }
        }

        var obj1 = { pinNumber: pinVal, netName: netVal }
        pinList.push(obj1);
    }



    pinList = LinqLib.Enumerable(pinList)
        .where(function (item) { return !item.netName.startsWith("$"); })
        .toArray();

    if (skipPower) {
        var voltageRegex = /^[+-]?(?:\d+V\d*|\d+(?:\.\d+)V?|\d+(?:p\d+)V?)$/i;
        pinList = LinqLib.Enumerable(pinList)
            .where(function (item) { return !voltageRegex.test(item.netName); })
            .toArray();

    }

    if (pinList.length === 0) {
        console.popup("No valid pins in file after filtering!", 16, "Error");
        console.error("No valid pins in file after filtering!");
        return;
    }

    var view = Application.ActiveView;
    var block = view.Block;
    var selectedComps = view.Query(VDM_COMP, VD_SELECTED);
    if (selectedComps.Count === 0) {
        console.popup("No components selected!", 16, "Error", 0);
        console.error("No components selected!");
        return -1;
    }
    var selectedComp = selectedComps.Item(1);
    var compUID = selectedComp.UID;

    var allPins = view.Query(VDM_COMPPIN, VD_ALL);
    var compPins = [];
    for (var i = 1; i <= allPins.Count; i++) {
        var pin = allPins.Item(i);
        if (pin.Parent.UID === compUID) {
            compPins.push(pin);
        }
    }
    if (compPins.length === 0) {
        console.popup("Selected component has no pins!", 16, "Error", 0);
        console.error("Selected component has no pins!");
        return -1;
    }

    var pinsToProcess = [];

    for (var i = 0; i < pinList.length; i++) {
        // console.message(pinList[i].pinNumber + " - " + pinList[i].netName);
    }
    for (var i = 0; i < compPins.length; i++) {
        var pin = compPins[i];
        var pinObj = pin.Pin;
        var attr = pinObj.FindAttribute("Pin Number");
        if (!attr) {
            console.error("Pin has no number!");
            continue;
        }
        var pinNumber = StringLib.trim(attr.Value);
        var match = LinqLib.Enumerable(pinList).where(function (item) {
            return parseInt(item.pinNumber, 10) == parseInt(pinNumber, 10);
        }).toArray()[0];
        if (match) {
            pinsToProcess.push({
                pin: pin,
                desiredNetName: match.netName
            });
        }
        else {
        }
    }

    if (pinsToProcess.length === 0) {
        console.popup("Selected component has no pins from file!", 16, "Error", 0);
        console.error("Selected component has no pins from file!");
        return;
    }

    block.DeSelectAll();
    var oHelper = Scripting.CreateObject("JScriptHelper.ScriptHelper");
    var localNull = oHelper.Nothing;
    // var desName = Application.Documents.Item(1).Name;
    var root = MG_Utils.getSchematicRoot();

    for (var i = 0; i < pinsToProcess.length; i++) {

        var pinData = pinsToProcess[i];
        var pin = pinData.pin;
        var desiredNetName = pinData.desiredNetName;
        var pinNumber = pin.Pin.FindAttribute("Pin Number").Value;

        // var path = pin.Parent.GetName(FULL_PATH_NAME);
        // if (root == path) {
        //     var parts = path.split('\\');
        //     path = parts.slice(1, parts.length - 1).join('\\')
        // }
        // var sheet = pin.Parent.SheetNum;
        // var selected = Application.SelectPathCompPin(root, path, sheet, pinNumber, 1);
        // if (selected) {
        //     Application.ActiveView.ZoomSelect();
        // }

        var connection = pin.Connection;
        var net = null;
        var segment = null;
        if (connection) {
            net = connection.Net;
            segment = connection.Segment;
            if (net.LogicalNetName === desiredNetName) {
                continue;
            }
        }
        var point = pin.GetLocation();
        var x = point.X;
        var y = point.Y;
        var xEnd = x;
        if (pin.Side === VDLEFT) {
            xEnd -= 20;
        } else {
            xEnd += 20;
        }
        net = block.AddNet(x, y, xEnd, y, pin, localNull, VD_WIRE);

        connection = pin.Connection;
        if (!connection) {
            console.popup("Error while creating net for " + pinNumber + " pin", 16, "Error", 0);
            console.error("Error while creating net for " + pinNumber + " pin");
            continue;
        }

        net = connection.Net;
        segment = connection.Segment;

        var label = net.GetLabel(segment);
        var labelX = (pin.Side === VDLEFT) ? x - 10 : x + 10;

        if (!label) {
            label = net.AddLabel(segment, desiredNetName, labelX, y);
            label.Orientation = VDORIENT_IDENTITY;
            label.Origin = (pin.Side === VDLEFT) ? VDALIGN_LR : VDALIGN_LL;
            label.Visible = VDLABELVISIBLE;
        } else {
            label.TextString = desiredNetName;
            label.Visible = VDLABELVISIBLE;
        }

        label.Selected = false;
        net.Selected = false;
    }

    block.DeSelectAll();

    var EndTime = new Date().getTime();
    var runtime = (EndTime - StartTime) / 1000;

    console.popup("Successfully named " + pinsToProcess.length + " pins!", 64, "Result", 0);
    console.success("Successfully named " + pinsToProcess.length + " pins in " + runtime + "s");
}
