#!/bin/bash

rm -fr dist
npm run electron-build
npm run dist

cd dist
if [ -e ./GCPEditorPro.AppImage ]; then
	# Linux
	mv GCPEditorPro.AppImage GCPEditorPro
	zip GCPEditorPro-Linux.zip GCPEditorPro
fi

