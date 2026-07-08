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
 * Main object of the file system library.
 * @namespace FileSystemLib
 */

if (typeof FileSystemLib === 'undefined') {
    FileSystemLib = {};
}

var _fso = null;

/**
 * Initializes or returns the FileSystemObject.
 * @private
 * @returns {Object} FileSystemObject.
 */
function getFSO() {
    if (!_fso) {
        try {
            _fso = new ActiveXObject("Scripting.FileSystemObject");
        } catch (e) {
            throw new Error("Failed to create FileSystemObject. Check ActiveX security settings.");
        }
    }
    return _fso;
}

/**
 * Normalizes a path to standard form (replaces / with \ and removes extra characters).
 * @memberof FileSystemLib
 * @function normalizePath
 * @param {string} path - Path to normalize.
 * @returns {string} Normalized path.
 * @example
 * FileSystemLib.normalizePath("C:/test//file.txt"); // "C:\test\file.txt"
 */
FileSystemLib.normalizePath = function (path) {
    if (!path) return "";
    var fso = getFSO();
    return fso.GetAbsolutePathName(path);
};

/**
 * Joins path segments into a single path.
 * @memberof FileSystemLib
 * @function joinPath
 * @param {...string} segments - Path segments to join.
 * @returns {string} Joined path.
 * @example
 * FileSystemLib.joinPath("C:", "test", "file.txt"); // "C:\test\file.txt"
 */
FileSystemLib.joinPath = function () {
    var fso = getFSO();
    var result = "";

    for (var i = 0; i < arguments.length; i++) {
        var segment = arguments[i];
        if (segment) {
            if (result) {
                result = fso.BuildPath(result, segment);
            } else {
                result = segment;
            }
        }
    }

    return result;
};

/**
 * Checks if a file exists.
 * @memberof FileSystemLib
 * @function fileExists
 * @param {string} filePath - Path to the file.
 * @returns {boolean} true if the file exists.
 * @example
 * if (FileSystemLib.fileExists("C:\\test.txt")) {
 *     // file exists
 * }
 */
FileSystemLib.fileExists = function (filePath) {
    try {
        var fso = getFSO();
        return fso.FileExists(filePath);
    } catch (e) {
        return false;
    }
};

/**
 * Checks if a folder (directory) exists.
 * @memberof FileSystemLib
 * @function folderExists
 * @param {string} folderPath - Path to the folder.
 * @returns {boolean} true if the folder exists.
 * @example
 * if (FileSystemLib.folderExists("C:\\Windows")) {
 *     // folder exists
 * }
 */
FileSystemLib.folderExists = function (folderPath) {
    try {
        var fso = getFSO();
        return fso.FolderExists(folderPath);
    } catch (e) {
        return false;
    }
};

/**
 * Checks if a file or folder exists.
 * @memberof FileSystemLib
 * @function exists
 * @param {string} path - Path to the file or folder.
 * @returns {boolean} true if the file or folder exists.
 */
FileSystemLib.exists = function (path) {
    return FileSystemLib.fileExists(path) || FileSystemLib.folderExists(path);
};

/**
 * Reads a text file.
 * @memberof FileSystemLib
 * @function readTextFile
 * @param {string} filePath - Path to the file.
 * @param {string} [encoding="utf-8"] - File encoding (utf-8, windows-1251, etc.).
 * @returns {string} File content.
 * @throws {Error} If the file does not exist or cannot be read.
 * @example
 * var content = FileSystemLib.readTextFile("C:\\test.txt");
 */
FileSystemLib.readTextFile = function (filePath, encoding) {
    if (!FileSystemLib.fileExists(filePath)) {
        throw new Error("File does not exist: " + filePath);
    }

    encoding = encoding || "utf-8";
    var content = "";
    var stream = null;

    try {
        stream = new ActiveXObject("ADODB.Stream");
        stream.Type = 2;
        stream.Charset = encoding;
        stream.Open();
        stream.LoadFromFile(filePath);
        content = stream.ReadText(-1);
        stream.Close();
    } catch (e) {
        try {
            var fso = getFSO();
            var file = fso.OpenTextFile(filePath, 1, false, 0);
            content = file.ReadAll();
            file.Close();
        } catch (e2) {
            throw new Error("Failed to read file: " + filePath + ". Error: " + e2.message);
        }
    } finally {
        if (stream && stream.State !== 0) {
            stream.Close();
        }
    }

    return content;
};

/**
 * Reads a text file line by line.
 * @memberof FileSystemLib
 * @function readTextFileLines
 * @param {string} filePath - Path to the file.
 * @param {string} [encoding="utf-8"] - File encoding.
 * @returns {Array} Array of file lines.
 * @example
 * var lines = FileSystemLib.readTextFileLines("C:\\test.txt");
 */
FileSystemLib.readTextFileLines = function (filePath, encoding) {
    var content = FileSystemLib.readTextFile(filePath, encoding);
    return content.split(/\r\n|\n|\r/);
};

/**
 * Reads a binary file as an array of bytes.
 * @memberof FileSystemLib
 * @function readBinaryFile
 * @param {string} filePath - Path to the file.
 * @returns {Array} Array of numbers (bytes) from 0 to 255.
 * @example
 * var bytes = FileSystemLib.readBinaryFile("C:\\image.jpg");
 */
FileSystemLib.readBinaryFile = function (filePath) {
    if (!FileSystemLib.fileExists(filePath)) {
        throw new Error("File does not exist: " + filePath);
    }

    var bytes = [];
    var stream = null;

    try {
        stream = new ActiveXObject("ADODB.Stream");
        stream.Type = 1;
        stream.Open();
        stream.LoadFromFile(filePath);

        var chunkSize = 4096;
        var buffer = stream.Read(chunkSize);

        while (buffer && buffer.length > 0) {
            for (var i = 0; i < buffer.length; i++) {
                bytes.push(buffer[i] & 0xFF);
            }
            buffer = stream.Read(chunkSize);
        }

        stream.Close();
    } catch (e) {
        throw new Error("Failed to read binary file: " + filePath + ". Error: " + e.message);
    } finally {
        if (stream && stream.State !== 0) {
            stream.Close();
        }
    }

    return bytes;
};

/**
 * Writes text to a file (overwrites if the file exists).
 * @memberof FileSystemLib
 * @function writeTextFile
 * @param {string} filePath - Path to the file.
 * @param {string} content - Text to write.
 * @param {string} [encoding="utf-8"] - Encoding for writing.
 * @param {boolean} [append=false] - If true, appends text to the end of the file.
 * @returns {boolean} true if writing was successful.
 * @example
 * FileSystemLib.writeTextFile("C:\\test.txt", "Hello World!");
 */
FileSystemLib.writeTextFile = function (filePath, content, encoding, append) {
    encoding = encoding || "utf-8";
    append = append || false;

    var stream = null;
    var success = false;

    try {
        var folderPath = FileSystemLib.getDirectoryName(filePath);
        if (folderPath && !FileSystemLib.folderExists(folderPath)) {
            FileSystemLib.createFolder(folderPath);
        }

        stream = new ActiveXObject("ADODB.Stream");
        stream.Type = 2;
        stream.Charset = encoding;
        stream.Open();

        if (append && FileSystemLib.fileExists(filePath)) {
            stream.LoadFromFile(filePath);
            stream.Position = stream.Size;
        }

        stream.WriteText(content);
        stream.SaveToFile(filePath, 2);
        stream.Close();
        success = true;
    } catch (e) {
        try {
            var fso = getFSO();
            var mode = append ? 8 : 2;
            var file = fso.OpenTextFile(filePath, mode, true, 0);
            file.Write(content);
            file.Close();
            success = true;
        } catch (e2) {
            throw new Error("Failed to write file: " + filePath + ". Error: " + e2.message);
        }
    } finally {
        if (stream && stream.State !== 0) {
            stream.Close();
        }
    }

    return success;
};

/**
 * Writes binary data to a file.
 * @memberof FileSystemLib
 * @function writeBinaryFile
 * @param {string} filePath - Path to the file.
 * @param {Array} bytes - Array of numbers (bytes) from 0 to 255.
 * @returns {boolean} true if writing was successful.
 */
FileSystemLib.writeBinaryFile = function (filePath, bytes) {
    var stream = null;
    var success = false;

    try {
        var folderPath = FileSystemLib.getDirectoryName(filePath);
        if (folderPath && !FileSystemLib.folderExists(folderPath)) {
            FileSystemLib.createFolder(folderPath);
        }

        stream = new ActiveXObject("ADODB.Stream");
        stream.Type = 1;
        stream.Open();

        var binaryData = new VBArray(bytes).toArray();
        stream.Write(binaryData);

        stream.SaveToFile(filePath, 2);
        stream.Close();
        success = true;
    } catch (e) {
        throw new Error("Failed to write binary file: " + filePath + ". Error: " + e.message);
    } finally {
        if (stream && stream.State !== 0) {
            stream.Close();
        }
    }

    return success;
};

/**
 * Creates a folder (including all nested folders).
 * @memberof FileSystemLib
 * @function createFolder
 * @param {string} folderPath - Path to the folder to create.
 * @returns {boolean} true if the folder was created successfully.
 * @example
 * FileSystemLib.createFolder("C:\\new\\folder\\path");
 */
FileSystemLib.createFolder = function (folderPath) {
    try {
        var fso = getFSO();

        if (fso.FolderExists(folderPath)) {
            return true;
        }

        var parentPath = FileSystemLib.getDirectoryName(folderPath);
        if (parentPath && parentPath !== folderPath && !fso.FolderExists(parentPath)) {
            FileSystemLib.createFolder(parentPath);
        }

        fso.CreateFolder(folderPath);
        return true;
    } catch (e) {
        throw new Error("Failed to create folder: " + folderPath + ". Error: " + e.message);
    }
};

/**
 * Deletes a folder and all its contents.
 * @memberof FileSystemLib
 * @function deleteFolder
 * @param {string} folderPath - Path to the folder to delete.
 * @param {boolean} [force=false] - If true, deletes the folder even if it is not empty.
 * @returns {boolean} true if the folder was deleted successfully.
 */
FileSystemLib.deleteFolder = function (folderPath, force) {
    if (!FileSystemLib.folderExists(folderPath)) {
        return true;
    }

    try {
        var fso = getFSO();
        force = force || false;

        if (force) {
            fso.DeleteFolder(folderPath, true);
        } else {
            fso.DeleteFolder(folderPath);
        }
        return true;
    } catch (e) {
        throw new Error("Failed to delete folder: " + folderPath + ". Error: " + e.message);
    }
};

/**
 * Cleans a folder (deletes all files and subfolders).
 * @memberof FileSystemLib
 * @function cleanFolder
 * @param {string} folderPath - Path to the folder to clean.
 * @returns {boolean} true if the folder was cleaned successfully.
 */
FileSystemLib.cleanFolder = function (folderPath) {
    if (!FileSystemLib.folderExists(folderPath)) {
        return false;
    }

    try {
        var fso = getFSO();
        var folder = fso.GetFolder(folderPath);

        var files = new Enumerator(folder.files);
        for (; !files.atEnd(); files.moveNext()) {
            try {
                fso.DeleteFile(files.item().Path, true);
            } catch (e) {
            }
        }

        var subfolders = new Enumerator(folder.SubFolders);
        for (; !subfolders.atEnd(); subfolders.moveNext()) {
            try {
                fso.DeleteFolder(subfolders.item().Path, true);
            } catch (e) {
            }
        }

        return true;
    } catch (e) {
        throw new Error("Failed to clean folder: " + folderPath + ". Error: " + e.message);
    }
};

/**
 * Deletes a file.
 * @memberof FileSystemLib
 * @function deleteFile
 * @param {string} filePath - Path to the file to delete.
 * @returns {boolean} true if the file was deleted successfully.
 */
FileSystemLib.deleteFile = function (filePath) {
    if (!FileSystemLib.fileExists(filePath)) {
        return true;
    }

    try {
        var fso = getFSO();
        fso.DeleteFile(filePath, true);
        return true;
    } catch (e) {
        throw new Error("Failed to delete file: " + filePath + ". Error: " + e.message);
    }
};

/**
 * Copies a file.
 * @memberof FileSystemLib
 * @function copyFile
 * @param {string} sourcePath - Path to the source file.
 * @param {string} destPath - Path to the destination file.
 * @param {boolean} [overwrite=true] - If true, overwrites an existing file.
 * @returns {boolean} true if copying was successful.
 */
FileSystemLib.copyFile = function (sourcePath, destPath, overwrite) {
    if (!FileSystemLib.fileExists(sourcePath)) {
        throw new Error("Source file does not exist: " + sourcePath);
    }

    overwrite = overwrite === undefined ? true : overwrite;

    try {
        var destFolder = FileSystemLib.getDirectoryName(destPath);
        if (destFolder && !FileSystemLib.folderExists(destFolder)) {
            FileSystemLib.createFolder(destFolder);
        }

        var fso = getFSO();
        fso.CopyFile(sourcePath, destPath, overwrite);
        return true;
    } catch (e) {
        throw new Error("Failed to copy file: " + sourcePath + ". Error: " + e.message);
    }
};

/**
 * Moves or renames a file.
 * @memberof FileSystemLib
 * @function moveFile
 * @param {string} sourcePath - Path to the source file.
 * @param {string} destPath - Path to the destination file.
 * @returns {boolean} true if moving was successful.
 */
FileSystemLib.moveFile = function (sourcePath, destPath) {
    if (!FileSystemLib.fileExists(sourcePath)) {
        throw new Error("Source file does not exist: " + sourcePath);
    }

    try {
        var destFolder = FileSystemLib.getDirectoryName(destPath);
        if (destFolder && !FileSystemLib.folderExists(destFolder)) {
            FileSystemLib.createFolder(destFolder);
        }

        var fso = getFSO();
        fso.MoveFile(sourcePath, destPath);
        return true;
    } catch (e) {
        throw new Error("Failed to move file: " + sourcePath + ". Error: " + e.message);
    }
};

/**
 * Gets information about a file.
 * @memberof FileSystemLib
 * @function getFileInfo
 * @param {string} filePath - Path to the file.
 * @returns {Object|null} Object with file information or null if the file does not exist.
 * @property {string} path - Full path to the file.
 * @property {string} name - File name with extension.
 * @property {string} nameWithoutExtension - File name without extension.
 * @property {string} extension - File extension (with dot).
 * @property {number} size - File size in bytes.
 * @property {Date} dateCreated - Creation date.
 * @property {Date} dateModified - Last modification date.
 * @property {Date} dateAccessed - Last access date.
 * @example
 * var info = FileSystemLib.getFileInfo("C:\\test.txt");
 * WScript.Echo("Size: " + info.size + " bytes");
 */
FileSystemLib.getFileInfo = function (filePath) {
    try {
        var fso = getFSO();
        var file = fso.GetFile(filePath);

        return {
            path: file.Path,
            name: file.Name,
            nameWithoutExtension: fso.GetBaseName(filePath),
            extension: fso.GetExtensionName(filePath),
            size: file.Size,
            dateCreated: file.DateCreated,
            dateModified: file.DateLastModified,
            dateAccessed: file.DateLastAccessed,
            attributes: file.Attributes,
            type: file.Type
        };
    } catch (e) {
        return null;
    }
};

/**
 * Gets information about a folder.
 * @memberof FileSystemLib
 * @function getFolderInfo
 * @param {string} folderPath - Path to the folder.
 * @returns {Object|null} Object with folder information or null if the folder does not exist.
 */
FileSystemLib.getFolderInfo = function (folderPath) {
    try {
        var fso = getFSO();
        var folder = fso.GetFolder(folderPath);

        return {
            path: folder.Path,
            name: folder.Name,
            size: folder.Size,
            dateCreated: folder.DateCreated,
            dateModified: folder.DateLastModified,
            dateAccessed: folder.DateLastAccessed,
            attributes: folder.Attributes,
            type: folder.Type
        };
    } catch (e) {
        return null;
    }
};

/**
 * Gets a list of files in a folder.
 * @memberof FileSystemLib
 * @function getFiles
 * @param {string} folderPath - Path to the folder.
 * @param {string} [pattern="*.*"] - Search pattern (e.g., "*.txt").
 * @param {boolean} [recursive=false] - If true, searches for files in all subfolders.
 * @returns {Array} Array of file paths.
 */
FileSystemLib.getFiles = function (folderPath, pattern, recursive) {
    if (!FileSystemLib.folderExists(folderPath)) {
        return [];
    }

    pattern = pattern || "*.*";
    recursive = recursive || false;

    var files = [];
    var fso = getFSO();

    function searchFolder(folder, pattern, recursive, resultArray) {
        try {
            var folderObj = fso.GetFolder(folder);
            var foundFiles = folderObj.Files;

            var fileEnum = new Enumerator(foundFiles);
            for (; !fileEnum.atEnd(); fileEnum.moveNext()) {
                var file = fileEnum.item();
                if (pattern === "*.*" || fso.GetExtensionName(file.Name).toLowerCase() ===
                    pattern.replace("*.", "").toLowerCase()) {
                    resultArray.push(file.Path);
                }
            }

            if (recursive) {
                var subfolders = folderObj.SubFolders;
                var folderEnum = new Enumerator(subfolders);
                for (; !folderEnum.atEnd(); folderEnum.moveNext()) {
                    searchFolder(folderEnum.item().Path, pattern, recursive, resultArray);
                }
            }
        } catch (e) {
        }
    }

    searchFolder(folderPath, pattern, recursive, files);
    return files;
};

/**
 * Gets a list of folders in a directory.
 * @memberof FileSystemLib
 * @function getFolders
 * @param {string} folderPath - Path to the parent folder.
 * @param {boolean} [recursive=false] - If true, searches for all subfolders recursively.
 * @returns {Array} Array of folder paths.
 */
FileSystemLib.getFolders = function (folderPath, recursive) {
    if (!FileSystemLib.folderExists(folderPath)) {
        return [];
    }

    recursive = recursive || false;

    var folders = [];
    var fso = getFSO();

    function searchFolders(folder, recursive, resultArray) {
        try {
            var folderObj = fso.GetFolder(folder);
            var subfolders = folderObj.SubFolders;
            var folderEnum = new Enumerator(subfolders);

            for (; !folderEnum.atEnd(); folderEnum.moveNext()) {
                var subfolder = folderEnum.item();
                resultArray.push(subfolder.Path);

                if (recursive) {
                    searchFolders(subfolder.Path, recursive, resultArray);
                }
            }
        } catch (e) {
        }
    }

    searchFolders(folderPath, recursive, folders);
    return folders;
};

/**
 * Gets the directory from a full file path.
 * @memberof FileSystemLib
 * @function getDirectoryName
 * @param {string} filePath - Full file path.
 * @returns {string} Path to the directory.
 */
FileSystemLib.getDirectoryName = function (filePath) {
    try {
        var fso = getFSO();
        return fso.GetParentFolderName(filePath);
    } catch (e) {
        return "";
    }
};

/**
 * Gets the file name from a full path.
 * @memberof FileSystemLib
 * @function getFileName
 * @param {string} filePath - Full file path.
 * @returns {string} File name with extension.
 */
FileSystemLib.getFileName = function (filePath) {
    try {
        var fso = getFSO();
        return fso.GetFileName(filePath);
    } catch (e) {
        return "";
    }
};

/**
 * Gets the file name without extension.
 * @memberof FileSystemLib
 * @function getFileNameWithoutExtension
 * @param {string} filePath - Full file path.
 * @returns {string} File name without extension.
 */
FileSystemLib.getFileNameWithoutExtension = function (filePath) {
    try {
        var fso = getFSO();
        return fso.GetBaseName(filePath);
    } catch (e) {
        return "";
    }
};

/**
 * Gets the file extension.
 * @memberof FileSystemLib
 * @function getFileExtension
 * @param {string} filePath - Full file path.
 * @returns {string} File extension (without dot).
 */
FileSystemLib.getFileExtension = function (filePath) {
    try {
        var fso = getFSO();
        return fso.GetExtensionName(filePath);
    } catch (e) {
        return "";
    }
};

/**
 * Changes the file extension in a path.
 * @memberof FileSystemLib
 * @function changeExtension
 * @param {string} filePath - Path to the file.
 * @param {string} newExtension - New extension (with or without dot).
 * @returns {string} New path with changed extension.
 */
FileSystemLib.changeExtension = function (filePath, newExtension) {
    var fso = getFSO();
    var baseName = fso.GetBaseName(filePath);
    var folder = fso.GetParentFolderName(filePath);

    if (newExtension && newExtension.charAt(0) !== '.') {
        newExtension = '.' + newExtension;
    }

    return FileSystemLib.joinPath(folder, baseName + (newExtension || ''));
};

/**
 * Gets the current working directory.
 * @memberof FileSystemLib
 * @function getCurrentDirectory
 * @returns {string} Current working directory.
 */
FileSystemLib.getCurrentDirectory = function () {
    try {
        var shell = new ActiveXObject("WScript.Shell");
        return shell.CurrentDirectory;
    } catch (e) {
        var fso = getFSO();
        return fso.GetAbsolutePathName(".");
    }
};

/**
 * Sets the current working directory.
 * @memberof FileSystemLib
 * @function setCurrentDirectory
 * @param {string} path - Path to the new working directory.
 * @returns {boolean} true if successful.
 */
FileSystemLib.setCurrentDirectory = function (path) {
    try {
        var shell = new ActiveXObject("WScript.Shell");
        shell.CurrentDirectory = path;
        return true;
    } catch (e) {
        return false;
    }
};

/**
 * Gets the system temporary directory.
 * @memberof FileSystemLib
 * @function getTempDirectory
 * @returns {string} Path to the temporary directory.
 */
FileSystemLib.getTempDirectory = function () {
    try {
        var shell = new ActiveXObject("WScript.Shell");
        return shell.ExpandEnvironmentStrings("%TEMP%");
    } catch (e) {
        return "C:\\Windows\\Temp";
    }
};

/**
 * Creates a temporary file.
 * @memberof FileSystemLib
 * @function createTempFile
 * @param {string} [prefix="tmp"] - File name prefix.
 * @param {string} [extension=".tmp"] - File extension.
 * @returns {string} Path to the created temporary file.
 */
FileSystemLib.createTempFile = function (prefix, extension) {
    prefix = prefix || "tmp";
    extension = extension || ".tmp";

    var tempDir = FileSystemLib.getTempDirectory();
    var uniqueName = "";
    var fso = getFSO();

    do {
        var randomNum = Math.floor(Math.random() * 1000000);
        uniqueName = prefix + "_" + randomNum + extension;
    } while (FileSystemLib.fileExists(FileSystemLib.joinPath(tempDir, uniqueName)));

    var tempFilePath = FileSystemLib.joinPath(tempDir, uniqueName);

    FileSystemLib.writeTextFile(tempFilePath, "");

    return tempFilePath;
};

/**
 * Opens a folder selection dialog and returns the selected path.
 * @memberof FileSystemLib
 * @function browseForFolder
 * @param {string} [title="Select folder"] - Window title.
 * @param {string} [initialFolder=""] - Initial folder to display.
 * @returns {string|null} Path to the selected folder or null if canceled.
 * @example
 * var folder = FileSystemLib.browseForFolder("Select directory", "C:\\");
 * if (folder) WScript.Echo(folder);
 */
FileSystemLib.browseForFolder = function (title, initialFolder) {
    title = title || "Select folder";
    initialFolder = initialFolder || "";

    try {
        var shell = new ActiveXObject("Shell.Application");
        var folder = shell.BrowseForFolder(0, title, 0, initialFolder);
        if (folder) {
            return folder.Self.Path;
        }
        return null;
    } catch (e) {
        return null;
    }
};

/**
 * Opens a file selection dialog and returns the selected path.
 * Uses PowerShell with a hidden window and a temporary result file.
 * @memberof FileSystemLib
 * @function browseForFile
 * @param {string} [filter="All files (*.*)|*.*"] - File filter in format "Description|*.ext1;*.ext2".
 * @param {string} [initialFolder=""] - Initial folder to display.
 * @param {string} [title="Select file"] - Window title.
 * @returns {string|null} Path to the selected file or null if canceled.
 * @example
 * var file = FileSystemLib.browseForFile("Text files (*.txt)|*.txt|All files (*.*)|*.*", "C:\\");
 * if (file) WScript.Echo(file);
 */
FileSystemLib.browseForFile = function (filter, initialFolder, title) {
    filter = (filter !== null && filter !== undefined && filter !== "") ? filter : "All files (*.*)|*.*";
    initialFolder = (initialFolder !== null && initialFolder !== undefined) ? initialFolder : "";
    title = (title !== null && title !== undefined && title !== "") ? title : "Select file";

    var shell = new ActiveXObject("WScript.Shell");
    var fso = getFSO();

    var tempFolder = fso.GetSpecialFolder(2);
    var scriptFile = tempFolder + "\\ps_script_" + new Date().getTime() + ".ps1";
    var resultFile = tempFolder + "\\ps_result_" + new Date().getTime() + ".txt";

    function escapePS(str) {
        return str.replace(/'/g, "''");
    }

    var psScript = 
        "Add-Type -AssemblyName System.Windows.Forms\r\n" +
        "$dlg = New-Object System.Windows.Forms.OpenFileDialog\r\n" +
        "$dlg.Title = '" + escapePS(title) + "'\r\n" +
        "$dlg.Filter = '" + escapePS(filter) + "'\r\n" +
        "$dlg.InitialDirectory = '" + escapePS(initialFolder) + "'\r\n" +
        "$dlg.FilterIndex = 1\r\n" +
        "if ($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {\r\n" +
        "    $dlg.FileName | Out-File -FilePath '" + resultFile.replace(/\\/g, '\\\\') + "' -Encoding ASCII\r\n" +
        "}\r\n";

    var stream = new ActiveXObject("ADODB.Stream");
    stream.Type = 2;
    stream.Charset = "utf-8";
    stream.Open();
    stream.WriteText(psScript);
    stream.SaveToFile(scriptFile, 2);
    stream.Close();

    var cmd = 'powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + scriptFile + '"';
    shell.Run(cmd, 0, true);

    fso.DeleteFile(scriptFile);

    if (fso.FileExists(resultFile)) {
        var file = fso.OpenTextFile(resultFile, 1);
        var selectedFile = file.ReadAll();
        file.Close();
        fso.DeleteFile(resultFile);
        if (selectedFile != "") {
            return selectedFile;
        }
    }
    return null;
};

/**
 * Opens a save file dialog (Save As) and returns the selected path.
 * @memberof FileSystemLib
 * @function browseForSaveFile
 * @param {string} [filter="All files (*.*)|*.*"] - File filter in format "Description|*.ext1;*.ext2".
 * @param {string} [initialFolder=""] - Initial folder.
 * @param {string} [defaultFileName=""] - Suggested file name.
 * @param {string} [title="Save file"] - Window title.
 * @returns {string|null} Path to the selected file or null if canceled.
 */
FileSystemLib.browseForSaveFile = function (filter, initialFolder, defaultFileName, title) {
    filter = (filter !== null && filter !== undefined && filter !== "") ? filter : "All files (*.*)|*.*";
    initialFolder = (initialFolder !== null && initialFolder !== undefined) ? initialFolder : "";
    defaultFileName = (defaultFileName !== null && defaultFileName !== undefined) ? defaultFileName : "";
    title = (title !== null && title !== undefined && title !== "") ? title : "Save file";

    var shell = new ActiveXObject("WScript.Shell");
    var fso = getFSO();

    var tempFolder = fso.GetSpecialFolder(2);
    var scriptFile = tempFolder + "\\ps_script_" + new Date().getTime() + ".ps1";
    var resultFile = tempFolder + "\\ps_result_" + new Date().getTime() + ".txt";

    function escapePS(str) {
        return str.replace(/'/g, "''");
    }

    var psScript = 
        "Add-Type -AssemblyName System.Windows.Forms\r\n" +
        "$dlg = New-Object System.Windows.Forms.SaveFileDialog\r\n" +
        "$dlg.Title = '" + escapePS(title) + "'\r\n" +
        "$dlg.Filter = '" + escapePS(filter) + "'\r\n" +
        "$dlg.InitialDirectory = '" + escapePS(initialFolder) + "'\r\n" +
        "$dlg.FileName = '" + escapePS(defaultFileName) + "'\r\n" +
        "$dlg.OverwritePrompt = $true\r\n" + 
        "$dlg.FilterIndex = 1\r\n" +
        "if ($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {\r\n" +
        "    $dlg.FileName | Out-File -FilePath '" + resultFile.replace(/\\/g, '\\\\') + "' -Encoding ASCII\r\n" +
        "}\r\n";

    var stream = new ActiveXObject("ADODB.Stream");
    stream.Type = 2;
    stream.Charset = "utf-8";
    stream.Open();
    stream.WriteText(psScript);
    stream.SaveToFile(scriptFile, 2);
    stream.Close();

    var cmd = 'powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + scriptFile + '"';
    shell.Run(cmd, 0, true);

    fso.DeleteFile(scriptFile);

    if (fso.FileExists(resultFile)) {
        var file = fso.OpenTextFile(resultFile, 1);
        var selectedFile = file.ReadAll();
        file.Close();
        fso.DeleteFile(resultFile);
        if (selectedFile != "") {
            return selectedFile;
        }
    }
    return null;
};

/**
 * Reads a JSON file and parses it.
 * @memberof FileSystemLib
 * @function readJsonFile
 * @param {string} filePath - Path to the JSON file.
 * @param {boolean} [safe=false] - If true, uses safe parsing.
 * @returns {Object} Parsed JSON object.
 * @throws {Error} If the file does not exist or contains invalid JSON.
 */
FileSystemLib.readJsonFile = function (filePath, safe) {
    if (!FileSystemLib.fileExists(filePath)) {
        throw new Error("JSON file does not exist: " + filePath);
    }

    var content = FileSystemLib.readTextFile(filePath, "utf-8");

    if (safe && typeof JSONLib !== 'undefined' && JSONLib.safeParse) {
        return JSONLib.safeParse(content, {});
    } else if (typeof JSONLib !== 'undefined' && JSONLib.parse) {
        return JSONLib.parse(content);
    } else if (typeof JSON !== 'undefined' && JSON.parse) {
        return JSON.parse(content);
    } else {
        throw new Error("JSON parsing library not found");
    }
};

/**
 * Writes an object to a JSON file.
 * @memberof FileSystemLib
 * @function writeJsonFile
 * @param {string} filePath - Path to the JSON file.
 * @param {Object} data - Data to write.
 * @param {boolean} [pretty=true] - If true, formats JSON for readability.
 * @returns {boolean} true if writing was successful.
 */
FileSystemLib.writeJsonFile = function (filePath, data, pretty) {
    pretty = pretty === undefined ? true : pretty;

    var jsonString = "";

    if (pretty && typeof JSONLib !== 'undefined' && JSONLib.stringify) {
        jsonString = JSONLib.stringify(data, null, 2);
    } else if (typeof JSONLib !== 'undefined' && JSONLib.stringify) {
        jsonString = JSONLib.stringify(data);
    } else if (typeof JSON !== 'undefined' && JSON.stringify) {
        jsonString = JSON.stringify(data, null, pretty ? 2 : 0);
    } else {
        throw new Error("JSON serialization library not found");
    }

    return FileSystemLib.writeTextFile(filePath, jsonString, "utf-8");
};

if (typeof FS === 'undefined') {
    FS = FileSystemLib;
}