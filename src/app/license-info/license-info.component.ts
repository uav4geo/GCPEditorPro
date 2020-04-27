import { Component, OnInit } from '@angular/core';
import { StorageService } from '../storage.service';

@Component({
    selector: 'app-license-info',
    templateUrl: './license-info.component.html',
    styleUrls: ['./license-info.component.scss']
})
export class LicenseInfoComponent implements OnInit {
    constructor(public storageService: StorageService) {

    }

    ngOnInit(): void {
        
    }

    enterLicense(): void{
        window.dispatchEvent(new CustomEvent('enterLicense'));
    }
}
