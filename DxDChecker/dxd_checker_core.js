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
includeJS(libsRoot + "Core\\json_lib.js");
includeJS(libsRoot + "Core\\string_lib.js");
includeJS(libsRoot + "Core\\filesystem_lib.js");
includeJS(libsRoot + "Core\\output_lib.js");
includeJS(libsRoot + "Core\\linq_lib.js");
includeJS(libsRoot + "Core\\mg_utils.js");

var checkCells = true;
var checkFonts = true;
var checkSimilar = true;
var checkObsolete = true;
var checkGlobals = true;
var checkPNs = true;

Scripting.DontExit = true;
var mentorOutput = OutputLib.createConsole(new OutputLib.MentorDriver("Design Checker"));
mentorOutput.message("---------Design checking---------");
var allComps = Application.DesignComponents("", Application.GetProjectData().GetiCDBDesignRootBlock(Application.GetActiveDesign()), "-1");

var designComps = [];
for (var i = 1; i <= allComps.Count; i++) {
    var comp1 = allComps.Item(i);
    if (comp1.Type == VDTS_COMPONENT && comp1.Refdes) {
        designComps.push(comp1);
    }
}
mentorOutput.message("Total components count:  " + designComps.length)

var designComps1 = new LinqLib.Enumerable(designComps).distinct(function (c) { return c.FindAttribute("Part Number").Value }).toArray();
mentorOutput.message("Unique components count:  " + designComps1.length)

if (checkCells) {
    mentorOutput.message("")
    mentorOutput.message("Checking missing cells...");
    var szlib_path = "\\\\edm\\main_lib\\main_lib.szDb";
    if (!(FileSystemLib.fileExists(szlib_path))) {
        mentorOutput.warning("Serialized library not found! Skip cell check...");
    }
    else {
        var szdb = FileSystemLib.readJsonFile(szlib_path);
        var library = szdb.full_library;
        var r1 = []
        var resultArray = [];
        libsweep: for (var partitioncounter = 0; partitioncounter < library.length; partitioncounter++) {
            var partition = szdb.full_library[partitioncounter];
            for (var partsCounter = 0; partsCounter < partition.Components.length; partsCounter++) {
                var libComponent = partition.Components[partsCounter]
                var libraryPN = libComponent.PartNumber;

                var tempArr = LinqLib.Enumerable(designComps1).where(function (c) { return c.FindAttribute("Part Number").Value == libraryPN }).toArray();
                if (tempArr && tempArr.length > 0) {
                    r1 = r1.concat(tempArr);
                    var cells = libComponent.Attributes["Comp Cells"];
                    if (!cells || cells == "") {
                        resultArray.push(libraryPN);
                    }
                    designComps1 = LinqLib.Enumerable(designComps1).where(function (c) { return c.FindAttribute("Part Number").Value != libraryPN }).toArray();
                }
                if (designComps1.length == 0) {
                    break libsweep;
                }
            }
        }
    }

    if (resultArray.length > 0) {
        mentorOutput.warning("Design has components without cells:");
        for (var i = 0; i < resultArray.length; i++) {
            mentorOutput.warning(resultArray[i]);
        }
    }
    else {
        mentorOutput.success("All components has cells!");
    }

    if (designComps1.length != 0) {
        mentorOutput.message("")
        mentorOutput.error("Design components not found in library!");
        for (var i = 0; i < designComps1.length; i++) {
            mentorOutput.error(getAttributeValue(designComps1[i], "Part Number"));
        }
    }
}

if (checkFonts) {
    mentorOutput.message("")
    mentorOutput.message("Checking fonts...");
    var hierarchy = MG_Utils.buildInstanceHierarchy(MG_Utils.getSchematicRoot());

    function printInstanceTree(node) {
        for (var s = 0; s < node.sheets.length; s++) {
            var sheet = node.sheets[s];
            node.openHierarchicalPage(sheet.number);
            for (var c = 0; c < sheet.components.length; c++) {
                var comp = sheet.components[c];
                printInstanceTree(comp);
            }
        }
    }

    printInstanceTree(hierarchy);

    var allTexts = MG_Utils.convertArray(Application.Query(VDM_TEXT, VD_ALL));
    var fontErrors = false;
    for (var i = 0; i < allTexts.length; i++) {
        if (allTexts[i].Font != 0) {
            fontErrors = true;
            var page;
            var attr = allTexts[i].Parent.FindAttribute("@SHEET");
            if (attr)
                page = attr.Value;
            else {
                page = "NaN"
            }
            // mentorOutput.error("Text " + allTexts[i].TextString + "has wrong font!" + allTexts[i].Font + ", " + allTexts[i].Parent.GetName(FULL_PATH_NAME) + "." + page);
            mentorOutput.error("Text \"" + allTexts[i].TextString + "\" on page " + allTexts[i].Parent.GetName(FULL_PATH_NAME) + "." + page + " has wrong font!");
        }
    }
    if (!fontErrors) {
        mentorOutput.success("No fonts errors found!");
    }
}

if (checkSimilar) {
    mentorOutput.message("")
    mentorOutput.message("Checking similar parts...");

    var resistors = new LinqLib.Enumerable(designComps).where(function (c) { return /^R\d+$/.test(c.Refdes); }).toArray();
    resistors = new LinqLib.Enumerable(resistors).distinct(function (c) { return getAttributeValue(c, "Part Number") }).toArray();

    var findPrev = false;
    findPrev = checkDuplicates(resistors, findPrev, "resistors");

    var capacitors = new LinqLib.Enumerable(designComps).where(function (c) { return /^C\d+$/.test(c.Refdes); }).toArray();
    capacitors = new LinqLib.Enumerable(capacitors).distinct(function (c) { return getAttributeValue(c, "Part Number") }).toArray();

    findPrev = checkDuplicates(capacitors, findPrev, "capacitros");

    var inductors = new LinqLib.Enumerable(designComps).where(function (c) { return /^L\d+$/.test(c.Refdes); }).toArray();
    inductors = new LinqLib.Enumerable(inductors).distinct(function (c) { return getAttributeValue(c, "Part Number") }).toArray();

    findPrev = checkDuplicates(inductors, findPrev, "inductors");

    if (!findPrev) {
        mentorOutput.success("No duplicate components found!");
    }
}

if (checkObsolete) {
    mentorOutput.message("")
    mentorOutput.message("Checking obsolete parts...");
    var compsWithoutObsolete = [];
    var obsoleteComps = new LinqLib.Enumerable(designComps).where(function (c) { var attr = c.FindAttribute("Obsolete"); if (attr) return (attr.Value == "True" || attr.InstanceValue == "True"); compsWithoutObsolete.push(c); return false }).toArray();
    obsoleteComps = new LinqLib.Enumerable(obsoleteComps).distinct(function (c) { return c.FindAttribute("Part Number").Value }).toArray();
    if (compsWithoutObsolete.length > 0) {
        mentorOutput.message("")
        mentorOutput.error("Design has components without Obsolete property:");
        for (var i = 0; i < compsWithoutObsolete.length; i++) {
            mentorOutput.error("UID:" + compsWithoutObsolete[i].UID);
        }
    }
    if (obsoleteComps.length > 0) {
        mentorOutput.warning("Design has obsolete components:");
        for (var i = 0; i < obsoleteComps.length; i++) {
            mentorOutput.warning(obsoleteComps[i].FindAttribute("Part Number").Value);
        }
    }
    else {
        mentorOutput.success("No obsolete components found!");
    }
}

if (checkGlobals) {
    var globalComps = new LinqLib.Enumerable(MG_Utils.convertArray(allComps)).where(function (c) { return c.SymbolBlock.LibraryName == "Globals" }).toArray();
    if (globalComps.length > 0) {
        mentorOutput.message("")
        mentorOutput.error("Design has global components:");
        for (var i = 0; i < globalComps.length; i++) {
            mentorOutput.error("UID:" + globalComps[i].UID + " - " + globalComps[i].SymbolBlock.GetName(SHORT_NAME) + "(" + globalComps[i].SymbolBlock.LibraryName + ")");
        }
    }
}

mentorOutput.message("")
mentorOutput.info("DO NOT FORGET TO RUN DXD VERIFY!")

function getAttributeValue(component, attrName) {
    var attr = component.FindAttribute(attrName);
    if (attr) {
        var value = attr.InstanceValue;
        if (!value)
            value = attr.Value;
        if (value)
            return value;
        else
            return null
    }
    return null;
}

function checkDuplicates(resistors, findPrev, groupName) {
    var res_groups = [];
    var valueGroups = new LinqLib.Enumerable(resistors).groupBy(function (x) { return getAttributeValue(x, "Value") }).toArray();
    for (var i = 0; i < valueGroups.length; i++) {
        {
            var sizeGroups = new LinqLib.Enumerable(valueGroups[i].items).where(function (x) { return x.FindAttribute("PackageName") }).groupBy(function (x) { return getAttributeValue(x, "PackageName") }).toArray();
            for (var j = 0; j < sizeGroups.length; j++) {
                if (sizeGroups[j].items.length > 1) {
                    var resGroup = [];
                    for (var k = 0; k < sizeGroups[j].items.length; k++) {
                        resGroup.push(sizeGroups[j].items[k]);
                    }
                    res_groups.push(resGroup);
                }
            }
        }
    }
    if (res_groups.length > 0) {        
        if (findPrev)
            mentorOutput.message("")
        findPrev = true;
        mentorOutput.warning("Found duplicate value-size " + groupName + ":")
        for (var i = 0; i < res_groups.length; i++) {
            mentorOutput.warning("")
            mentorOutput.warning("Group " + (i + 1) + ": Value = " + getAttributeValue(res_groups[i][0], "Value") + ", Size = " + (getAttributeValue(res_groups[i][0], "PackageName")))
            for (var k = 0; k < res_groups[i].length; k++) {
                mentorOutput.warning(res_groups[i][k].FindAttribute("Part Number").Value);
            }
        }
    }

    return findPrev;
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
