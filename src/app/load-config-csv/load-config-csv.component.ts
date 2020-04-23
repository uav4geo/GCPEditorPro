import { Component, OnInit } from '@angular/core';
import { GCPsDescriptor, GcpsUtilsService, CsvParseResult, ElevationMeasureUnit } from '../gcps-utils.service';
import { Papa } from 'ngx-papaparse';
import { StorageService } from '../storage.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-load-config-csv',
    templateUrl: './load-config-csv.component.html',
    styleUrls: ['./load-config-csv.component.scss']
})
export class LoadConfigCsvComponent implements OnInit {

    public descriptor: GCPsDescriptor;

    constructor(private papa: Papa,
                private utilsService: GcpsUtilsService,
                private storageService: StorageService,
                private router: Router) {

    }

    public hideCsvInstructions = true;
    public hideCsvTemplates = false;
    public errors: string[];
    public csvFileName: string[] = null;
    public csvHeader: string[];
    public epsgProj4: string;
    public isReady = false;
    public csvParseResult: CsvParseResult = null;

    public csvSelected(event) {

        const file = event.target.files[0];

        if (typeof file === 'undefined') {
            return;
        }

        this.csvFileName = null;
        this.descriptor = null;
        this.errors = null;
        this.csvHeader = null;
        this.isReady = false;

        const reader = new FileReader();
        reader.readAsText(file, 'UTF-8');

        reader.onload = evt => {

            const content = evt.target.result as string;

            this.papa.parse(content, {
                skipEmptyLines: true,
                complete: result => {

                    // Show CSV loading errors
                    if (result.errors.length > 0) {
                        if (this.errors === null) this.errors = [];
                        for (const err of result.errors) {
                            this.errors.push(err.type + ' - ' + err.code + ': ' + err.message +
                                (typeof err.row !== 'undefined' ? ' in row ' + err.row : ''));
                        }
                        return;

                    }

                    // Parse CSV
                    const res = this.utilsService.getGCPsFromCsvData(result.data, this.epsgProj4);

                    // Show CSV parsing errors
                    if (res.errors.length > 0) {
                        this.errors = res.errors;
                        this.csvParseResult = null;
                        return;
                    }

                    this.errors = null;
                    this.csvHeader = result.data[0];
                    this.descriptor = res.descriptor;
                    this.csvFileName = file.name;

                    this.csvParseResult = res;
                    this.isReady = res.descriptor.projection != null;


                }
            });
        };
        reader.onerror = () => {
            this.csvHeader = null;
            this.descriptor = null;
            this.csvFileName = null;
            this.errors = ['Unable to load file'];
        };

    }

    epsgProj4change(e): void {
        if (this.csvParseResult != null) {
            this.csvParseResult.descriptor.projection = this.utilsService.getProjection(this.epsgProj4);
            this.isReady = this.csvParseResult.descriptor.projection != null;
        }else{
            this.isReady = false;
        }
    }

    next(): void {
        if (!this.isReady) return;

        this.storageService.gcps = this.csvParseResult.descriptor.gcps;
        this.storageService.projection = this.csvParseResult.descriptor.projection;
        this.storageService.imageGcps = [];

        this.router.navigateByUrl('/gcps-map');
    }

    ngOnInit(): void {
        if (typeof this.storageService.gcps !== 'undefined' &&
            this.storageService.gcps !== null &&
            this.storageService.gcps.length > 0) {

            this.descriptor = {
                gcps: this.storageService.gcps,
                projection: this.storageService.projection
            };

            this.csvParseResult = {
                descriptor: this.descriptor,
                errors: []
            };

            this.epsgProj4 = this.descriptor.projection.str;

            this.isReady = true;
        }
    }

    toggleCsvInstructions(): void{
        this.hideCsvInstructions = !this.hideCsvInstructions;
    }

    toggleCsvTemplates(): void{
        this.hideCsvTemplates = !this.hideCsvTemplates;
    }
}
