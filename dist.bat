yarn
rd /s /q dist
call npm run electron-build
call npm run dist

cd dist
powershell Compress-Archive GCPEditorPro.exe GCPEditorPro-Windows.zip