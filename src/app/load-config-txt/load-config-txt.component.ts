import { Component, OnInit } from '@angular/core';
import { Papa } from 'ngx-papaparse';
import { GcpsUtilsService, TxtDescriptor, TxtParseResult, GCP, Projection, ImageGcp } from '../gcps-utils.service';
import { StorageService } from '../storage.service';
import { Router } from '@angular/router';
import { base64ArrayBuffer } from 'src/shared/utils';

@Component({
    selector: 'app-load-config-txt',
    templateUrl: './load-config-txt.component.html',
    styleUrls: ['./load-config-txt.component.scss']
})
export class LoadConfigTxtComponent implements OnInit {

    public errors: string[] = null;
    public isReady = false;
    public header: string;
    public txtFileName: string;
    public descriptor: TxtDescriptor = null;
    public txtParseResult: TxtParseResult;
    public extras: string[];
    public images: string[] = null;
    public hideTxtExample = true;
    public hideTxtSpecs = true;

    public loadValue = 0;

    private handleDrop = null;

    constructor(
        private papa: Papa,
        private utilsService: GcpsUtilsService,
        private storageService: StorageService,
        private router: Router) {
    }

    public imagesSelected(event) {

        this.images = null;
        const files: File[] = event.target.files;

        if (typeof files === 'undefined') {
            return;
        }

        this.handleFiles(files);
    }

    public handleFiles(files){
        this.images = [];

        const matchedFiles = Object.assign([], files).filter(f => {
            return this.descriptor.imageGcps.filter(item => item.imgName === f.name).length > 0;
        });

        let count = matchedFiles.length;
        let loaded = 0;

        for (const file of matchedFiles) { // for multiple files
            (f => {
                const name = f.name;
                const type = f.type;

                try{
                    const imageUrl = (window.URL ? URL : webkitURL).createObjectURL(f);
                    this.storageService.saveImageRaw(name, type, imageUrl);
    
                    this.images.push(name);
    
                    loaded++;

                    this.loadValue = Math.round(loaded / count * 100);
                }catch(e){
                    console.error('Cannot load file: ' + name);
                    count--;
                }
            })(file);
        }
    }

    ngOnDestroy(): void {
        if (this.handleDrop) window.removeEventListener("droppedFiles", this.handleDrop);
    }

    ngAfterViewInit(): void{
        this.handleDrop = e => {
            // Find first TXT
            const files = [...e.detail.files];
            for (let i = 0; i < files.length; i++){
                if (files[i].name.toLowerCase().endsWith("txt")){
                    this.handleTxt(files[i], (err: any) => {
                        if (!err){
                            // Parse rest
                            this.handleFiles(files);
                        }
                    });
                    break;
                }
            }
        };  
        window.addEventListener("droppedFiles", this.handleDrop);
    }

    public isLoaded(name: string): boolean {
        return this.images !== null ? this.images.filter(item => item === name).length !== 0 : false;
    }

    public txtSelected(event) {
        const file = event.target.files[0];

        if (typeof file === 'undefined') {
            return;
        }

        this.handleTxt(file);
    }

    public handleTxt(file, done = undefined){
        this.txtFileName = null;
        this.descriptor = null;
        this.errors = [];
        this.isReady = false;
        this.extras = [];

        const reader = new FileReader();
        reader.readAsText(file, 'UTF-8');

        reader.onload = evt => {

            const content = evt.target.result as string;

            const lines = content.split('\n');
            this.header = lines[0];
            const body = lines.slice(1).join('\n');

            this.papa.parse(body, {
                skipEmptyLines: true,
                delimitersToGuess: [' ', '\t'],
                complete: result => {

                    // Show CSV loading errors
                    if (result.errors.length > 0) {
                        for (const err of result.errors) {
                            this.errors.push(err.type + ' - ' + err.code + ': ' + err.message +
                                (typeof err.row !== 'undefined' ? ' in row ' + err.row : ''));
                        }
                        return;

                    }

                    // Parse TXT
                    const res = this.utilsService.getGCPsFromTxtData(this.header, result.data);

                    // Show TXT parsing errors
                    if (res.errors.length > 0) {
                        this.errors = res.errors;
                        this.txtParseResult = null;
                        return;
                    }

                    this.extras = this.utilsService.generateExtrasNames(res.descriptor.imageGcps);

                    this.errors = null;
                    this.descriptor = res.descriptor;
                    this.txtFileName = file.name;

                    this.txtParseResult = res;
                    this.isReady = true;
                    if (done !== undefined) done();
                }
            });
        };
        reader.onerror = () => {
            this.descriptor = null;
            this.txtFileName = null;
            this.errors = ['Unable to load file'];
            if (done !== undefined) done(new Error(JSON.stringify(this.errors)));
        };
    }

    ngOnInit(): void {
        if (this.storageService.imageGcps !== null &&
            this.storageService.imageGcps.length > 0) {

            this.descriptor = {
                gcps: this.storageService.gcps,
                projection: this.storageService.projection,
                imageGcps: this.storageService.imageGcps
            };

            this.txtParseResult = {
                descriptor: this.descriptor,
                errors: []
            };

            this.extras = this.utilsService.generateExtrasNames(this.descriptor.imageGcps);

            this.images = this.storageService.images.map(item => item.name);

            this.isReady = true;
        }
    }

    next() {
        this.storageService.projection = this.txtParseResult.descriptor.projection;
        this.storageService.imageGcps = this.txtParseResult.descriptor.imageGcps;
        this.storageService.gcps = this.txtParseResult.descriptor.gcps;

        this.router.navigateByUrl('/gcps-map');

    }

    toggleTxtExample() {
        this.hideTxtExample = !this.hideTxtExample;
    }

    toggleTxtSpecs() {
        this.hideTxtSpecs = !this.hideTxtSpecs;
    }

}

