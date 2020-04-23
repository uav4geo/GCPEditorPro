#!/bin/bash

rm -fr dist
npm run electron-build
npm run dist
