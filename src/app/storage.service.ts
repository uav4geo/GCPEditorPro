import { Injectable } from '@angular/core';
import { GCPsDescriptor, TxtDescriptor, GCP, ImageGcp, Projection, ElevationMeasureUnit } from './gcps-utils.service';
import { base64ArrayBuffer } from 'src/shared/utils';

@Injectable({
    providedIn: 'root'
})
export class StorageService {

    public gcps: GCP[];
    public imageGcps: ImageGcp[] = [];
    public projection: Projection;
    public images: ImageInfo[] = [];

    public saveImage(image: ImageInfo): ImageInfo {
        const match = this.images.filter(item => item.name === image.name);
        if (match.length === 0) {
            this.images.push(image);
        } else {
            match[0].url = image.url;
        }
        return image;
    }

    public saveImageRaw(name: string, type: string, imageUrl: string): ImageInfo {
        const image: ImageInfo = {name, url: imageUrl};
        return this.saveImage(image);
    }

    public getImageUrl(name: string): string {
        const match = this.images.filter(item => item.name === name);

        if (match.length === 0) {
            return null;
        } else {
            return match[0].url;
        }
    }

    constructor() { }
}

class ImageInfo {
    public name: string;
    public url: string | null;
}

