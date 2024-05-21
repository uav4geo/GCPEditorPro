import { Component, isDevMode, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterEvent } from '@angular/router';
import {NgbModal, NgbModalRef} from '@ng-bootstrap/ng-bootstrap';
import { validate, DevLicense } from './licenser';
import { StorageService } from './storage.service';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
    @ViewChild('root') root: ElementRef;
    @ViewChild('licenseModal') licenseModal: NgbModalRef;

    private closeResult = '';
    public license = '';
    public licenseHint = '';
    public showEnterLicense = false;
    public validLicense = null;
    public closeModalOnHideLicense = false;

    constructor(private router: Router, private modalService: NgbModal, private storageService: StorageService) {
        if (isDevMode()) {
            router.events.pipe().subscribe(e => {
                console.log(e);
            });
        }
    }

    ngAfterViewInit(): void{
        // Handle drag & drop
        let dropArea = this.root.nativeElement;
        function preventDefaults (e) {
            e.preventDefault()
            e.stopPropagation()
        }
    
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });
    
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                this.root.nativeElement.classList.add("highlight");
            }, false);
        });
          
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                this.root.nativeElement.classList.remove("highlight");
            }, false);
        })
    
        const handleDrop = e => {
            window.dispatchEvent(new CustomEvent('droppedFiles', {detail: {files: e.dataTransfer.files}}));
        };
        dropArea.addEventListener('drop', handleDrop, false);

        if (isDevMode() && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "0.0.0.0")){
            this.storageService.license = new DevLicense();
        }else{
            if (!this.storageService.hasLicense()){
                this.closeModalOnHideLicense = false;
                this.open(this.licenseModal);
            }
        }

        window.addEventListener('enterLicense', () => {
            this.showEnterLicense = true;
            this.closeModalOnHideLicense = true;
            this.open(this.licenseModal);
        });

        // iFrame window height broadcast
        if ( window.location !== window.parent.location ) {
            // The page is in an iframe, broadcast height
            setInterval(function() {
                window.parent.postMessage(document.body.scrollHeight, "*");
            }, 200); 
        }
    }

    isActive(route: string): boolean {
        return this.router.isActive(route, false);
    }

    startOver(): void{
        if (window.confirm("Are you sure you want to start over? Unsaved progress will be lost.")){
            window.location.reload(true);
        }
    }

    enterLicense(): void{
        this.showEnterLicense = true;
    }

    hideLicense(modal): void{
        if (this.closeModalOnHideLicense){
            modal.close();
        }else{
            this.showEnterLicense = false;
            this.license = '';
        }
    }

    licenseChange(license): void{
        this.licenseHint = "";

        if (license.length > 0){
            this.validLicense = !validate('gcpeditorpro', license, (hint) => {
                this.licenseHint = hint;
            }).demo;
        }else{
            this.validLicense = null;
        }
    }

    activate(modal): void{
        this.storageService.saveLicense(this.license);
        modal.close();
    }

    open(content) {
        this.modalService.open(content, {ariaLabelledBy: 'modal-basic-title'}).result.then((result) => {
            // Nothing
        }, (reason) => {
            this.open(this.licenseModal);
        });
    }
}
