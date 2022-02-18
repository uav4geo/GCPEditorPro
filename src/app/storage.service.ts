import { Injectable, isDevMode } from '@angular/core';
import { GCPsDescriptor, TxtDescriptor, GCP, ImageGcp, Projection, ElevationMeasureUnit } from './gcps-utils.service';
import { base64ArrayBuffer } from 'src/shared/utils';
import { validate, LicenseInfo, DemoLicense, DevLicense } from './licenser';

@Injectable({
    providedIn: 'root'
})
export class StorageService {

    public gcps: GCP[];
    public imageGcps: ImageGcp[] = [];
    public projection: Projection;
    public images: ImageInfo[] = [];
    public license: LicenseInfo;

    public saveImage(image: ImageInfo): ImageInfo {
        const match = this.images.filter(item => item.name === image.name);
        if (match.length === 0) {
            this.images.push(image);
        } else {
            match[0].url = image.url;
        }
        return image;
    }

    public removeImage(imageName: string) : void {
        const match = this.images.find(item => item.name === imageName);
        if (match) {
            this.images.splice(this.images.indexOf(match), 1);
        }

        this.imageGcps = this.imageGcps.filter(item => item.imgName !== imageName);
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

    public hasLicense(): boolean{
        return !!localStorage.getItem("license") && !this.getLicense().demo;
    }

    public getLicense(): LicenseInfo{
        if (!this.license){
            const licstr = localStorage.getItem("license") || "";
            this.license = validate('gcpeditorpro', licstr);
        }

        if (!this.license){
            this.license = new DemoLicense();
        }

        return this.license;
    }

    public saveLicense(license: string){
        if (!validate('gcpeditorpro', license).demo){
            this.license = null;
            localStorage.setItem("license", license);
        }
    }

    constructor() { }
}

class ImageInfo {
    public name: string;
    public url: string | null;
}

