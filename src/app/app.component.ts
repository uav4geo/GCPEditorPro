import { Component, isDevMode, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterEvent } from '@angular/router';


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
    @ViewChild('root') root: ElementRef;

    constructor(private router: Router) {
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
    }

    isActive(route: string): boolean {
        return this.router.isActive(route, false);
    }

    startOver(): void{
        if (window.confirm("Are you sure you want to start over? Unsaved progress will be lost.")){
            window.location.reload(true);
        }
    }
}
