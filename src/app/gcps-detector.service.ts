import { Injectable } from '@angular/core';
import { CoordsXY } from '../shared/common';

import * as cv from "@techstark/opencv-js";

@Injectable({
    providedIn: 'root'
})
export class GcpsDetectorService {

    private areModelsLoaded = false;

    GcpsDetectorService() {}

    async loadDataFile(cvFilePath, url) {
        // see https://docs.opencv.org/master/utils.js
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const data = new Uint8Array(buffer);
        cv.FS_createDataFile("/", cvFilePath, data, true, false, false);
    }

    async loadModels() {
        try {
            await this.loadDataFile(
                "square.xml",
                "assets/models/square.xml"
            );

            this.areModelsLoaded = true;

        } catch (error) {
            console.error(error);
        }

    }

    async detect(imgName: string): Promise<CoordsXY> {

        if (!this.areModelsLoaded) 
            await this.loadModels();

        return Promise.resolve({
            x: 400,
            y: 400,
            z: 0
        });

    }

    constructor() { }

}
