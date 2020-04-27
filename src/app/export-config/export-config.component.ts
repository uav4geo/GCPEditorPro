import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from '../storage.service';
import { ImageGcp, GCP, Projection, GcpsUtilsService } from '../gcps-utils.service';
import * as FileSaver from 'file-saver';
import { stringify } from 'querystring';

@Component({
    selector: 'app-export-config',
    templateUrl: './export-config.component.html',
    styleUrls: ['./export-config.component.scss']
})
export class ExportConfigComponent implements OnInit {

    public imageGcps: ImageGcp[];
    public gcps: GCP[];
    public projection: Projection;
    public extras: string[];

    constructor(private router: Router, public storage: StorageService, private utils: GcpsUtilsService) {

        if (typeof storage.imageGcps === 'undefined' ||
            storage.imageGcps === null ||
            storage.imageGcps.length === 0 ||
            typeof storage.projection === 'undefined' ||
            storage.projection === null) {

            router.navigateByUrl('/');
            return;
        }

        this.imageGcps = storage.imageGcps;
        this.gcps = storage.gcps;
        this.projection = storage.projection;
        this.extras = utils.generateExtrasNames(this.imageGcps);
    }

    ngOnInit(): void {
    }

    activate(): void{
        window.dispatchEvent(new CustomEvent('enterLicense'));
    }

    private getTxtContent(): string {

        let content = this.projection.str + '\n';

        for (const img of this.imageGcps) {
            content += `${img.geoX}\t${img.geoY}\t${img.geoZ}\t${img.imX}\t${img.imY}\t${img.imgName}\t${img.gcpName}\t${img.extras.join('\t')}`.trim() + '\n';
        }

        return content;
    }

    public exportTxt() {
        if (this.storage.getLicense().demo){
            window.dispatchEvent(new CustomEvent('enterLicense'));
            return;
        }

        const content = this.getTxtContent();

        const file = new File([content], 'gcp_list.txt', {type: 'text/plain;charset=utf-8'});
        FileSaver.saveAs(file, 'gcp_list.txt');
    }

    public back() {
        this.router.navigateByUrl('/gcps-map');
    }


}
