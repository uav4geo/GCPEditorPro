#!/bin/bash

rm -fr dist
npm run electron-build
npm run dist

cd dist
if [ -e ./GCPEditorPro.AppImage ]; then
	# Linux
	mv -v GCPEditorPro.AppImage GCPEditorPro
	zip GCPEditorPro-Linux.zip GCPEditorPro

    # Make WebODM plugin
    mkdir -p -v plugin-staging/
    cp -R ../plugin ./plugin-staging/gcp-editor-pro
    cp -R gcp-editor-pro ./plugin-staging/gcp-editor-pro/public
    cd plugin-staging
    zip -r ../GCPEditorPro-WebODM-Plugin.zip gcp-editor-pro
fi

