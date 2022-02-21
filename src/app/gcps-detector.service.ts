import { Injectable } from '@angular/core';
import { CoordsXY } from '../shared/common';

import * as cv from "@techstark/opencv-js";

@Injectable({
    providedIn: 'root'
})
export class GcpsDetectorService {
    detect(imgName: string): Promise<CoordsXY> {

        

        return Promise.resolve({
            x: 400,
            y: 400,
            z: 0
        });

    }

    constructor() { }
}
