import { Injectable, isDevMode } from '@angular/core';
import { GCPsDescriptor, TxtDescriptor, GCP, ImageGcp, Projection, ElevationMeasureUnit } from './gcps-utils.service';
import { base64ArrayBuffer } from 'src/shared/utils';
import { validate, LicenseInfo, DemoLicense, DevLicense } from './licenser';
import exifr from 'exifr';
import { GPSCoords } from '../shared/common';
import { TiffRendererService, isTiff } from './tiff-renderer.service';

const DISPLAY_CACHE_SIZE = 30;

@Injectable({
    providedIn: 'root'
})
export class StorageService {

    public gcps: GCP[];
    public imageGcps: ImageGcp[] = [];
    public projection: Projection;
    public images: ImageInfo[] = [];
    public license: LicenseInfo;
    public prevNames: object = {};
    public mapView: { center: { lat: number, lng: number }, zoom: number } = null;

    private displayCache: { name: string, url: Promise<string> }[] = [];

    public saveImage(image: ImageInfo): ImageInfo {
        const match = this.images.filter(item => item.name === image.name);
        if (match.length === 0) {
            this.images.push(image);
        } else {
            match[0].url = image.url;
            match[0].file = image.file;
            this.evictDisplayUrl(image.name);
        }
        return image;
    }

    public removeImage(imageName: string): void {
        const match = this.images.find(item => item.name === imageName);
        if (match) {
            this.images.splice(this.images.indexOf(match), 1);
            this.evictDisplayUrl(imageName);
        }

        this.imageGcps = this.imageGcps.filter(item => item.imgName !== imageName);
    }

    public saveImageRaw(f: File, imageUrl: string): ImageInfo {
        const image: ImageInfo = new ImageInfo(f, imageUrl);
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

    public getDisplayUrl(name: string): Promise<string> {
        const image = this.images.find(item => item.name === name);
        if (!image) return Promise.resolve(null);
        if (!isTiff(image.file)) return Promise.resolve(image.url);

        let entry = this.displayCache.find(item => item.name === name);
        if (entry) {
            this.displayCache.splice(this.displayCache.indexOf(entry), 1);
        } else {
            entry = { name, url: this.tiffRenderer.render(image.file) };
            entry.url.catch(e => {
                console.error('Cannot decode ' + name, e);
                this.evictDisplayUrl(name);
            });
        }
        this.displayCache.push(entry);

        while (this.displayCache.length > DISPLAY_CACHE_SIZE) {
            this.evictDisplayUrl(this.displayCache[0].name);
        }

        return entry.url;
    }

    public hasDisplayUrl(name: string): boolean {
        const image = this.images.find(item => item.name === name);
        if (!image) return false;
        return !isTiff(image.file) || !!this.displayCache.find(item => item.name === name);
    }

    private evictDisplayUrl(name: string) {
        const entry = this.displayCache.find(item => item.name === name);
        if (!entry) return;
        this.displayCache.splice(this.displayCache.indexOf(entry), 1);
        entry.url.then(url => (window.URL ? URL : webkitURL).revokeObjectURL(url), () => {});
    }

    public hasLicense(): boolean {
        return (!!localStorage.getItem("license") && !this.getLicense().demo) || this.getLicense().dev;
    }

    public getLicense(): LicenseInfo {
        // return new DevLicense(); 
        
        if (!this.license && allowedIframe()) {
            this.license = new DevLicense();
        }

        if (!this.license) {
            const licstr = localStorage.getItem("license") || "";
            this.license = validate('gcpeditorpro', licstr);
        }

        if (!this.license) {
            this.license = new DemoLicense();
        }

        return this.license;
    }

    public saveLicense(license: string) {
        if (!validate('gcpeditorpro', license).demo) {
            this.license = null;
            localStorage.setItem("license", license);
        }
    }

    constructor(private tiffRenderer: TiffRendererService) { }
}

function allowedIframe(): boolean {
    try {
        if (window.self === window.top) return false;
        const ao = (location as any).ancestorOrigins;
        const origin = ao && ao.length ? ao[ao.length - 1] : (document.referrer ? new URL(document.referrer).origin : '');
        return origin === 'https://webodm.net' || origin === 'https://www.webodm.net';
    } catch (e) {
        return false;
    }
}

class ImageInfo {

    constructor(file: File, url: string) {
        this.name = file.name;
        this.url = url;
        this.file = file;
    }

    public name: string;
    public url: string | null;
    public file: File;
    private _coords: GPSCoords;

    public getCoords() : Promise<GPSCoords> {

        if (this._coords)
            return Promise.resolve(this._coords);
        
        const prom = new Promise<GPSCoords>(async (resolve, reject) => {
            try{
                let {latitude, longitude } = await exifr.gps(this.url);
                this._coords = {
                    lat: latitude,
                    lng: longitude,
                    alt: 0
                }; 
                resolve(this._coords);
            }catch(e){
                resolve(null);
            }
        });

        return prom;
        
    }
}


