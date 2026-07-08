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

/**
 * Main object.
 * @namespace MG_Utils
 */

if (typeof MG_Utils === 'undefined') {
    MG_Utils = {};
}

/**
 * Converts an MG collection to a plain array.
 * @memberof MG_Utils
 * @function convertArray
 * @param {MGCollection} collection - Source collection.
 * @returns {Array}
 */
MG_Utils.convertArray = function (collection) {
    if (collection) {
        var result = [];
        if (collection.Count) {
            for (var i = 1; i <= collection.Count; i++) {
                result.push(collection.Item(i));
            }
            return result;
        }
        else {
            var i = 1;
            var item;
            try {
                item = collection.Item(i);
            }
            catch (e) {
                return [];
            }
            while (item) {
                result.push(collection.Item(i));
                i = i + 1;
                try {
                    item = collection.Item(i);
                }
                catch (e) {
                    return result;
                }
            }
            return result;
        }
    }
    else {
        return null;
    }
};

/**
 * @constructor
 * @memberof MG_Utils
 * @param {Object} instanceObject - COM object of the instance
 * @param {string} instanceName - instance name (RefDes)
 * @param {string} symbolName - symbol name
 * @param {boolean} isComposite - whether it is composite
 * @param {string} fullPath - full path in the hierarchy
 * @param {string|number} sheetNumber - sheet number of the parent block
 */
MG_Utils.InstanceNode = function (instanceObject, instanceName, symbolName, isComposite, fullPath, sheetNumber) {
    this.instanceObject = instanceObject;
    this.UID = instanceObject.UID;
    this.instanceName = instanceName;
    this.symbolName = symbolName;
    this.isComposite = isComposite;
    this.fullPath = fullPath;
    this.sheetNumber = sheetNumber;
    this.sheets = [];
    this.children = [];
};

/**
 * Opens a hierarchical page (for composite nodes) via PushPath
 * @param {string|number} [sheetNum=1] - sheet number
 * @returns {boolean} operation success
 */
MG_Utils.InstanceNode.prototype.openHierarchicalPage = function (sheetNum) {

    var output = OutputLib.createConsole(new OutputLib.MentorDriver("Hierarchy tool"));
    if (!this.isComposite) {
        output.error(this.instanceName + " is not a composite symbol, can't push!");
        return false;
    }

    var activeDesign = Application.GetActiveDesign();
    if (!activeDesign) {
        output.error("No active designs found!");
        return false;
    }
    var projData = Application.GetProjectData();
    var rootBlockName = projData.GetiCDBDesignRootBlock(activeDesign);
    if (!rootBlockName) return false;

    var topBlockSpec = rootBlockName + ".1";
    var sheet = sheetNum || "1";

    var hierarchyPath = "";
    var parts = this.fullPath.split('\\');
    if (parts.length > 1) {
        hierarchyPath = parts.slice(1).join('\\');
    } else {
        var pathParts = [];
        var cur = this;
        while (cur && cur.parentNode && cur.parentNode.instanceName !== rootBlockName) {
            pathParts.unshift(cur.instanceName);
            cur = cur.parentNode;
        }
        if (pathParts.length > 0) {
            hierarchyPath = pathParts.join('\\');
        }
    }

    hierarchyPath = this.fullPath;

    try {
        var result = Application.PushPath(topBlockSpec, hierarchyPath, sheet);
        if (result) {
            return true;
        } else {
        }
    } catch (e) {
        output.error("Exception: " + e.message);
    }
    return false;
};

/**
 * Builds the instance hierarchy tree for the specified root design.
 * @memberof MG_Utils
 * @param {string} rootDesignName - name of the root block (usually returned by GetiCDBDesignRootBlock)
 * @returns {MG_Utils.InstanceNode} project tree
 */
MG_Utils.buildInstanceHierarchy = function (rootDesignName) {

    var output = OutputLib.createConsole(new OutputLib.MentorDriver("Hierarchy tool"));
    var components = Application.DesignComponents("", rootDesignName, "-1", "", true);
    var compArray = this.convertArray(components);

    var instanceMap = {};
    var childrenMap = {};
    for (var i = 0; i < compArray.length; i++) {
        var comp = compArray[i];
        var compPath = comp.GetName(0);
        if (!compPath) continue;

        var parts = compPath.split('\\');
        var instanceName = comp.GetName(1);
        var parentPath = parts.length > 1 ? parts.slice(0, parts.length - 1).join('\\') : null;
        var symBlock = comp.SymbolBlock;
        var isComposite = symBlock && symBlock.SymbolType == VDB_COMPOSITE;
        var parentBlock = comp.Parent;
        var sheetNumber = parentBlock ? parentBlock.SheetNum : '?';

        var node = new this.InstanceNode(
            comp,
            instanceName,
            symBlock ? symBlock.GetName(1) : '',
            isComposite,
            compPath,
            sheetNumber
        );
        instanceMap[compPath] = node;

        if (parentPath !== null) {
            if (!childrenMap[parentPath]) childrenMap[parentPath] = [];
            childrenMap[parentPath].push(compPath);
        }
    }

    for (var path in instanceMap) {
        if (!instanceMap.hasOwnProperty(path)) continue;
        var node = instanceMap[path];
        if (!node.isComposite) continue;

        var childPaths = childrenMap[path] || [];
        var sheetMap = {};
        for (var c = 0; c < childPaths.length; c++) {
            var childNode = instanceMap[childPaths[c]];
            if (!childNode) continue;
            var sheetNum = childNode.sheetNumber;
            if (!sheetMap[sheetNum]) {
                sheetMap[sheetNum] = { number: sheetNum, components: [] };
            }
            sheetMap[sheetNum].components.push(childNode);
        }
        for (var sn in sheetMap) {
            if (sheetMap.hasOwnProperty(sn)) {
                node.sheets.push(sheetMap[sn]);
            }
        }
        for (var c = 0; c < childPaths.length; c++) {
            var childNode = instanceMap[childPaths[c]];
            if (childNode) node.children.push(childNode);
        }
    }

    var allChildPaths = [];
    for (var p in childrenMap) {
        if (childrenMap.hasOwnProperty(p)) {
            var arr = childrenMap[p];
            for (var j = 0; j < arr.length; j++) allChildPaths.push(arr[j]);
        }
    }
    var uniqueChildPaths = new LinqLib.Enumerable(allChildPaths).distinct().toArray();

    var rootPaths = [];
    for (var ip in instanceMap) {
        if (instanceMap.hasOwnProperty(ip)) {
            var isChild = new LinqLib.Enumerable(uniqueChildPaths).any(function (cp) { return cp === ip; });
            if (!isChild) rootPaths.push(ip);
        }
    }

    var rootNode = new this.InstanceNode(rootDesignName, '[Design Root]', true, rootDesignName, '');
    var rootSheetMap = {};
    for (var r = 0; r < rootPaths.length; r++) {
        var topNode = instanceMap[rootPaths[r]];
        if (!topNode) continue;
        var sheetNum = topNode.sheetNumber;
        if (!rootSheetMap[sheetNum]) {
            rootSheetMap[sheetNum] = { number: sheetNum, components: [] };
        }
        rootSheetMap[sheetNum].components.push(topNode);
    }
    for (var sn in rootSheetMap) {
        if (rootSheetMap.hasOwnProperty(sn)) {
            rootNode.sheets.push(rootSheetMap[sn]);
        }
    }
    for (var r = 0; r < rootPaths.length; r++) {
        var topNode = instanceMap[rootPaths[r]];
        if (topNode) rootNode.children.push(topNode);
    }

    return rootNode;
}

/**
 * Returns the name of the schematic root block
 * @memberof MG_Utils
 * @returns {string} Schematic root block name
 */
MG_Utils.getSchematicRoot = function () {
    var name = Application.GetProjectData().GetiCDBDesignRootBlock(Application.GetActiveDesign());
    return name;
}