call yarn
rd /s /q dist
set NODE_OPTIONS=--openssl-legacy-provider
call npm run electron-build
.\node_modules\.bin\electron-builder

cd dist
powershell Compress-Archive GCPEditorPro.exe GCPEditorPro-Windows.zip