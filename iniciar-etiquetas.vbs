Option Explicit

Dim fso, shell, scriptDir, batPath

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

' Pasta onde o .vbs está
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Caminho do .bat
batPath = scriptDir & "\iniciar-etiquetas-silencioso.bat"

' ============================
' 1) MATA PROCESSOS ANTIGOS
' ============================

' Se usa Node:
shell.Run "taskkill /IM node.exe /F >nul 2>&1", 0, True

' Se usa Bun (deixe se usar):
shell.Run "taskkill /IM bun.exe /F >nul 2>&1", 0, True

' ============================
' 2) INICIA NOVAMENTE
' ============================

shell.Run """" & batPath & """", 0, False
