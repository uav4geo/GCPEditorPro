import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ApplicationRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { StorageService } from '../storage.service';
import { ImageGcp, GCP } from '../gcps-utils.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'

import * as rfdc from 'rfdc';
import { PinLocation } from '../smartimage/smartimage.component';

const clone = rfdc();

@Component({
    selector: 'app-images-tagger',
    templateUrl: './images-tagger.component.html',
    styleUrls: ['./images-tagger.component.scss']
})
export class ImagesTaggerComponent implements OnInit, OnDestroy {

    public gcp: GCP;
    public errors: string[] = [];

    public images: ImageDescriptor[] = null;

    @ViewChild('dnd') dnd: ElementRef;
    private handleDrop = null;

    @ViewChild('imagesUpload') imagesUpload: ElementRef;

    constructor(private router: Router, private route: ActivatedRoute, private storage: StorageService, private sanitizer: DomSanitizer, private appRef: ApplicationRef) {

        if (typeof storage.gcps === 'undefined' ||
            storage.gcps === null ||
            storage.gcps.length === 0 ||
            typeof storage.projection === 'undefined' ||
            storage.projection === null) {

            router.navigateByUrl('/');
            return;
        }
    }

    ngOnDestroy(): void {
        if (this.handleDrop) window.removeEventListener("droppedFiles", this.handleDrop);
    }

    ngAfterViewInit(): void{
        this.handleDrop = e => {
            this.handleImages(e.detail.files);
        };  
        window.addEventListener("droppedFiles", this.handleDrop);
    }

    ngOnInit(): void {
        const gcpName = this.route.snapshot.paramMap.get('gcp');

        if (typeof gcpName === 'undefined' || gcpName === null) {
            this.router.navigateByUrl('/');
            return;
        }

        const matches = this.storage.gcps.filter(gcp => gcp.name === gcpName);

        if (matches.length === 0) {
            console.warn('Cannot find matching GCP');
            this.router.navigateByUrl('/');
            return;
        }

        this.gcp = matches[0];

        const tmp = clone(this.storage.imageGcps.filter(img => img.gcpName === gcpName));

        this.images = tmp.map(itm => (
            {
                image: itm,
                isTagged: itm.imX !== 0 && itm.imY !== 0,
                pinLocation: { x: itm.imX, y: itm.imY },
                imageUrl: this.storage.getImageUrl(itm.imgName) !== null ? this.sanitizer.bypassSecurityTrustResourceUrl(this.storage.getImageUrl(itm.imgName)) : null
            }));
    }

    public handleImages(files){
        for (const file of files) { // for multiple files
            (f => {
                const name = f.name;
                const type = f.type;
                const url = (window.URL ? URL : webkitURL).createObjectURL(f);

                // Save image
                const image = this.storage.saveImageRaw(name, type, url);

                const res = this.images.filter(item => item.image.imgName === name);

                // If the image is not present, we add it with the GCP coordinates
                if (res.length === 0) {

                    const descr: ImageDescriptor = {
                        image: {
                            gcpName: this.gcp.name,
                            geoX: this.gcp.easting,
                            geoY: this.gcp.northing,
                            geoZ: this.gcp.elevation,
                            imX: 0,
                            imY: 0,
                            imgName: name,
                            extras: []
                        },
                        isTagged: false,
                        pinLocation: null,
                        imageUrl: image.url !== null ? this.sanitizer.bypassSecurityTrustResourceUrl(image.url) : null
                    };
                    this.images.push(descr);
                    // Otherwise we add the loaded data to the array
                } else {
                    res[0].imageUrl = image.url !== null ? this.sanitizer.bypassSecurityTrustResourceUrl(image.url) : null;
                }
            })(file);
        }

        // Notify smart images that pins might have to be refreshed
        window.dispatchEvent(new CustomEvent('smartImagesLayoutChanged'));

        // this.imagesUpload.nativeElement.value = null;
    }

    public imagesSelected(event) {

        const files: File[] = event.target.files;

        if (typeof files === 'undefined') {
            return;
        }

        return this.handleImages(files);
    }

    public ok(): void {

        // Save in storage
        const tmp = this.storage.imageGcps.filter(img => img.gcpName !== this.gcp.name);

        tmp.push(...this.images.filter(item => item.isTagged).map(itm => itm.image));

        this.storage.imageGcps = tmp;

        // Then go back
        this.back();
    }

    public back(): void {
        // Go back to GPCs map
        this.router.navigateByUrl('gcps-map');
    }

    public pin(location: PinLocation, desc: ImageDescriptor): void {
        desc.isTagged = true;
        desc.image.imX = location.x;
        desc.image.imY = location.y;
    }

    public remove(desc: ImageDescriptor) {
        this.images = this.images.filter(item => item.image.imgName !== desc.image.imgName);
        
        // Notify smart images that pins might have to be refreshed
        window.dispatchEvent(new CustomEvent('smartImagesLayoutChanged'));
    }
}

class ImageDescriptor {
    public image: ImageGcp;
    public isTagged: boolean;
    public pinLocation: PinLocation;
    public imageUrl: SafeResourceUrl;
}
