#!/bin/bash

yarn
rm -fr dist
npm run electron-build

cd dist

# Make WebODM plugin
mkdir -p -v plugin-staging/
cp -R ../plugin ./plugin-staging/gcp-editor-pro
cp -R gcp-editor-pro ./plugin-staging/gcp-editor-pro/public
cd plugin-staging
zip -r ../GCPEditorPro-WebODM-Plugin.zip gcp-editor-pro
