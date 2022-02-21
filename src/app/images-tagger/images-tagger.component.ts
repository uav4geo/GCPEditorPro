import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ApplicationRef, TemplateRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { GPSCoords, StorageService } from '../storage.service';
import { ImageGcp, GCP } from '../gcps-utils.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'

import * as rfdc from 'rfdc';
import * as proj4 from 'proj4';
import { PinLocation } from '../smartimage/smartimage.component';
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

const clone = rfdc();

@Component({
    selector: 'app-images-tagger',
    templateUrl: './images-tagger.component.html',
    styleUrls: ['./images-tagger.component.scss']
})
export class ImagesTaggerComponent implements OnInit, OnDestroy {

    public gcp: GCP;
    public gcpCoords: CoordsXYZ;
    public errors: string[] = [];

    public images: ImageDescriptor[] = null;

    @ViewChild('dnd') dnd: ElementRef;
    private handleDrop = null;

    @ViewChild('imagesUpload') imagesUpload: ElementRef;

    constructor(private router: Router,
        private route: ActivatedRoute,
        private storage: StorageService,
        private sanitizer: DomSanitizer,
        private appRef: ApplicationRef,
        private modalService: NgbModal) {

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

    ngAfterViewInit(): void {
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

        const prj = proj4.default.Proj(this.storage.projection.eq);

        // We need this to be able to calculate the distance
        this.gcpCoords = proj4.default.transform(
            prj,
            proj4.default.WGS84,
            [this.gcp.easting, this.gcp.northing, this.gcp.elevation]);

        let temp = this.storage.images.map(img => {

            const gcps = this.storage.imageGcps.filter(imgGcp => imgGcp.imgName === img.name);
            const res = gcps.find(item => item.gcpName === gcpName);

            if (res !== undefined) {
                return {
                    image: {
                        gcpName: this.gcp.name,
                        geoX: this.gcp.easting,
                        geoY: this.gcp.northing,
                        geoZ: this.gcp.elevation,
                        imX: res.imX,
                        imY: res.imY,
                        imgName: img.name,
                        extras: []
                    },
                    isTagged: res.imX !== 0 && res.imY !== 0,
                    pinLocation: { x: res.imX, y: res.imY },
                    imageUrl: this.storage.getImageUrl(img.name) !== null ? this.sanitizer.bypassSecurityTrustResourceUrl(this.storage.getImageUrl(img.name)) : null,
                    otherGcps: gcps.map(gcp => gcp.gcpName),
                    coords: img.getCoords(),
                    distance: 0
                };
            } else {
                return {
                    image: {
                        gcpName: this.gcp.name,
                        geoX: this.gcp.easting,
                        geoY: this.gcp.northing,
                        geoZ: this.gcp.elevation,
                        imX: 0,
                        imY: 0,
                        imgName: img.name,
                        extras: []
                    },
                    isTagged: false,
                    pinLocation: null,
                    imageUrl: this.storage.getImageUrl(img.name) !== null ? this.sanitizer.bypassSecurityTrustResourceUrl(this.storage.getImageUrl(img.name)) : null,
                    otherGcps: gcps.map(gcp => gcp.gcpName),
                    coords: img.getCoords(),
                    distance: 0
                };
            }

        });

        Promise.all(temp.map(item => item.coords)).then(coords => {
            for (let i = 0; i < coords.length; i++) {
                var coord = coords[i];
                var item = temp[i];

                if (coord == null) {
                    item.distance = Number.MAX_VALUE;
                    continue;
                }

                item.distance = this.getDistanceFromLatLonInKm(this.gcpCoords.x, this.gcpCoords.y, coord.lat, coord.lng);
            }

            this.images = temp.sort((a, b) => {
                return a.distance > b.distance ? 1 : -1;
            });

        });

    }

    public handleImages(files: File[]) {

        var newImages = [];

        for (const file of files) { // for multiple files
            (f => {
                const name = f.name;
                const type = f.type;

                const url = (window.URL ? URL : webkitURL).createObjectURL(f);
                const imageUrl = url !== null ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;

                // Save image
                const image = this.storage.saveImageRaw(f, url);

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
                        imageUrl: imageUrl,
                        otherGcps: [],
                        coords: image.getCoords(),
                        distance: 0
                    };

                    newImages.push(descr);
                    // Otherwise we add the loaded data to the array
                } else {
                    res[0].imageUrl = imageUrl;
                }
            })(file);

            let temp = this.images.concat(newImages);

            Promise.all(temp.map(item => item.coords)).then(coords => {
                for (let i = 0; i < coords.length; i++) {
                    var coord = coords[i];
                    var item = temp[i];

                    if (coord == null) {
                        item.distance = Number.MAX_VALUE;
                        continue;
                    }

                    item.distance = this.getDistanceFromLatLonInKm(this.gcpCoords.x, this.gcpCoords.y, coord.lat, coord.lng);
                }

                this.images = temp.sort((a, b) => {
                    return a.distance > b.distance ? 1 : -1;
                });

            });

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

        let internal_remove = () => {
            this.images = this.images.filter(item => item.image.imgName !== desc.image.imgName);
            this.storage.removeImage(desc.image.imgName);

            // Notify smart images that pins might have to be refreshed
            window.dispatchEvent(new CustomEvent('smartImagesLayoutChanged'));
        };

        if (desc.otherGcps.length > 0) {

            const modalRef = this.modalService.open(ConfirmDialogComponent, { ariaLabelledBy: 'modal-basic-title' });

            modalRef.componentInstance.title = "Remove image";
            modalRef.componentInstance.text = "This image is associated with other GCPs. Do you want to remove it from the list?";
            modalRef.result.then((result) => {
                if (result === 'yes') internal_remove();
            });

        } else {
            internal_remove();
        }

    }

    public getClass(desc: ImageDescriptor) {

        let cls = null;

        if (desc.imageUrl !== null) {
            if (desc.isTagged) {
                cls = 'badge-success';
            } else {
                if (desc.otherGcps.length !== 0) {
                    cls = 'badge-primary';
                } else {
                    cls = 'badge-info';
                }
            }
        } else {
            cls = 'badge-warning';
        }

        var obj = {};
        obj[cls] = true;
        return obj;
    }

    public getName(desc: ImageDescriptor) {

        let name = desc.image.imgName;

        if (desc.otherGcps.length !== 0) {
            name = name + ' (' + desc.otherGcps.join(', ') + ')';
        }

        return name;
    }

    // Credit https://stackoverflow.com/a/27943
    private getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
        var R = 6371; // Radius of the earth in km
        var dLat = this.deg2rad(lat2 - lat1);  // deg2rad below
        var dLon = this.deg2rad(lon2 - lon1);
        var a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
            ;
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d;
    }

    private deg2rad(deg) {
        return deg * (Math.PI / 180)
    }
}

class ImageDescriptor {
    public image: ImageGcp;
    public isTagged: boolean;
    public pinLocation: PinLocation;
    public imageUrl: SafeResourceUrl;
    public otherGcps: string[];
    public coords: Promise<GPSCoords>;
    public distance: number;
}

class CoordsXYZ {
    public x: number;
    public y: number;
    public z: number;
}
