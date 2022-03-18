import { AfterViewInit, Inject, Injectable, OnInit, Renderer2, RendererFactory2 } from '@angular/core';
import { CoordsXY } from '../shared/common';
import { NgOpenCVService, OpenCVLoadResult } from 'ng-open-cv';
import { BehaviorSubject, forkJoin, Observable } from 'rxjs';
import { tap, switchMap, filter } from 'rxjs/operators';
import { StorageService } from './storage.service';
import { DOCUMENT } from '@angular/common';
import { Point } from 'leaflet';

declare var cv: any;

@Injectable({
    providedIn: 'root'
})
export class GcpsDetectorService {

    private r2: Renderer2;

    constructor(private ngOpenCVService: NgOpenCVService,
        private storage: StorageService,
        rendererFactory: RendererFactory2,
        @Inject(DOCUMENT) private document: Document,
    ) {

        this.r2 = rendererFactory.createRenderer(null, null);
    }

    private areClassifiersLoaded: boolean;

    // *** Add here more classifiers ***
    private classifiers = [
        "gcp-square-base.xml",  
        "gcp-bw-quads.xml"
    ];

    loadClassifiers(): Promise<any> {

        return Promise.all(
            this.classifiers.map(c =>
                this.ngOpenCVService.createFileFromUrl(c, `assets/opencv/data/haarcascades/${c}`).toPromise())
        );
    }

    async detect(imgName: string): Promise<CoordsXY> {

        if (!this.areClassifiersLoaded) {
            await this.loadClassifiers();
            this.areClassifiersLoaded = true;
        }

        return new Promise<CoordsXY>((resolve, reject) => {

            var url = this.storage.getImageUrl(imgName);

            const container = this.r2.createElement('div');
            this.r2.setStyle(container, 'position', 'absolute');
            this.r2.setStyle(container, 'top', '0');
            this.r2.setStyle(container, 'left', '0');
            this.r2.setStyle(container, 'width', '100%');
            this.r2.setStyle(container, 'height', '100%');
            this.r2.setStyle(container, 'opacity', '0');
            this.r2.setStyle(container, 'overflow', 'hidden');
            this.r2.setStyle(container, 'z-index', '-1');

            this.r2.appendChild(this.document.body, container);

            // This is a shitshow, but it works.
            const imgTag = this.r2.createElement('img');
            this.r2.setAttribute(imgTag, 'id', 'tmp-img');
            this.r2.setStyle(imgTag, 'display', 'block');

            this.r2.setAttribute(imgTag, 'src', url);

            this.r2.appendChild(container, imgTag);

            imgTag.onload = () => {

                try {
                    const img = cv.imread(imgTag);
                    const scale = 1.05;
                    const neighbors = 3;
                    const minSize = new cv.Size(30, 30);
                    const maxSize = new cv.Size(0, 0);

                    let res = null;

                    // console.log('loaded image with size: ', img.size());

                    for (let i = 0; i < this.classifiers.length; i++) {

                        // console.log("detecting with classifier: ", this.classifiers[i]);

                        const classifier = new cv.CascadeClassifier();
                        classifier.load(this.classifiers[i]);
                        const rects = new cv.RectVector();

                        classifier.detectMultiScale(img, rects, scale, neighbors, 0, minSize, maxSize);

                        // We cant estimate the quality of the match, so we just return the first one
                        if (rects.size() > 0) {

                            const rect = rects.get(0);

                            res = { x: rect.x + (rect.width / 2), y: rect.y + (rect.height / 2) };

                            // console.log("Found GCP at ", res);

                            rects.delete();
                            classifier.delete();

                            break;

                        } else
                            // console.log("No GCP found");

                        rects.delete();
                        classifier.delete();

                    }

                    this.r2.removeChild(this.document.body, container);
                    img.delete();

                    resolve(res);

                } catch (e) {
                    reject(e);
                }
            };
        });

    }

}
