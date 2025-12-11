Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

' Pasta onde o próprio .vbs está
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Monta o caminho completo do .bat na mesma pasta
batPath = scriptDir & "\iniciar-etiquetas-silencioso.bat"

shell.Run """" & batPath & """", 0, False
