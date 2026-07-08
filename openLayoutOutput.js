
var pcbDoc = Application.ActiveDocument;
pcbDoc.Validate(Scripting.CreateObject("MGCPCBAutomationLicensing.Application").GetToken(pcbDoc.Validate(0)))

var path = pcbDoc.Path + "Output";

var objShell = new ActiveXObject("WScript.Shell");
var strPath = "explorer.exe /e," + path;
objShell.Run(strPath);