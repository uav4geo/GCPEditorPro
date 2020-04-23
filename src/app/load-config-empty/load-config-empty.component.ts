import { Component, OnInit } from '@angular/core';
import { StorageService } from '../storage.service';
import { GcpsUtilsService, Projection } from '../gcps-utils.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-load-config-empty',
    templateUrl: './load-config-empty.component.html',
    styleUrls: ['./load-config-empty.component.scss']
})
export class LoadConfigEmptyComponent implements OnInit {

    constructor(private utilsService: GcpsUtilsService,
                private storageService: StorageService,
                private router: Router) {

    }

    public epsgProj4: string;
    public isReady = true;
    public projection: Projection;

    epsgProj4change(e): void {
        this.projection = this.utilsService.getProjection(this.epsgProj4);
        this.isReady = this.projection != null;
    }

    next(): void {
        if (!this.isReady) return;

        const go = () => {
            this.storageService.gcps = [];
            this.storageService.projection = this.projection || this.utilsService.getProjection("EPSG:4326");
            this.storageService.imageGcps = [];
            this.router.navigateByUrl('/gcps-map');
        };

        if (this.storageService.gcps){
            if (window.confirm("It looks like you have some work in progress. This will create a new GCP file. Unsaved progress will be lost. Are you sure?")){
                go();
            }
        }else{
            go();
        }
    }

    ngOnInit(): void {
        if (this.storageService.projection == null) {
            this.projection = this.utilsService.getProjection("EPSG:4326");
        }else{
            this.epsgProj4 = this.storageService.projection.str;
        }
        
        this.isReady = true;
    }
}
