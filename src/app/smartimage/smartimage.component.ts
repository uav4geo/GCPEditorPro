import { Component, OnInit, Output, EventEmitter, Input, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import * as Panzoom from '@panzoom/panzoom';
import { fromEvent, timer, TimeoutError } from 'rxjs';
import { CoordsXY } from '../../shared/common';

@Component({
    selector: 'app-smartimage',
    templateUrl: './smartimage.component.html',
    styleUrls: ['./smartimage.component.scss']
})
export class SmartimageComponent implements OnInit, AfterViewInit {
    showMessage: boolean;

    constructor() { }

    @Input()
    get pinLocation() {
        return this.pinLocationValue;
    }

    set pinLocation(val) {
        this.pinLocationValue = val;
        this.syncPinPosition();
        this.pinLocationChange.emit(this.pinLocationValue);
    }

    @Output() public pin = new EventEmitter();
    @Input() public src: string;
    @ViewChild('img') img: ElementRef;
    @ViewChild('pin') pinDiv: ElementRef;
    @ViewChild('msg') msgDiv: ElementRef;

    pinLocationValue: CoordsXY = null;
    onSmartImagesLayoutChanged = null;

    private panzoom: Panzoom.PanzoomObject = null;

    @Output()
    pinLocationChange = new EventEmitter<CoordsXY>();

    private wheelMessageTimeout: any;

    @HostListener('window:resize', ['$event'])
    onResize(event) {
        this.syncPinPosition();
    }

    ngAfterViewInit(): void {
        this.panzoom = Panzoom.default(this.img.nativeElement, {
            maxScale: 300,
            cursor: 'default',
            animate: false,
            canvas: true,
            step: 0.7
        });

        const click = fromEvent(this.img.nativeElement, 'click');

        let start = Date.now();

        let timeout: any = null;

        const panzoomchange = fromEvent(this.img.nativeElement, 'panzoomchange');

        panzoomchange.subscribe((e: CustomEvent) => {

            if (this.pinLocation != null) {

                this.pinDiv.nativeElement.style.display = 'none';

                if (timeout !== null) {
                    clearTimeout(timeout);
                }

                timeout = setTimeout(() => {
                    this.syncPinPosition();
                    this.pinDiv.nativeElement.style.display = 'block';
                }, 250);
            }

            start = Date.now();

        });

        click.subscribe((e: MouseEvent) => {

            const millis = Date.now() - start;

            start = Date.now();

            if (millis > 250) {

                this.pinLocation = this.getPos(e);

                const rect = this.img.nativeElement.parentElement.getClientRects()[0];

                this.pinDiv.nativeElement.style.left = (e.clientX - rect.left - this.pinDiv.nativeElement.width / 2) + 'px';
                this.pinDiv.nativeElement.style.top = (e.clientY - rect.top - this.pinDiv.nativeElement.height / 2) + 'px';

                this.pin.emit(this.pinLocation);

            }
        });

        // this.img.nativeElement.parentElement.addEventListener('wheel', this.panzoom.zoomWithWheel);
        this.img.nativeElement.parentElement.addEventListener('wheel', (e: WheelEvent) => {
            if (!e.shiftKey) {
                this.displayWheelMessage();

                return;
            }
            // Panzoom will automatically use `deltaX` here instead
            // of `deltaY`. On a mac, the shift modifier usually
            // translates to horizontal scrolling, but Panzoom assumes
            // the desired behavior is zooming.
            this.panzoom.zoomWithWheel(e);
        });
        this.img.nativeElement.parentElement.addEventListener('mouseleave', () => {
            this.msgDiv.nativeElement.style.opacity = 0;
        })

        this.syncPinPosition();

        this.onSmartImagesLayoutChanged = () => {
            setTimeout(this.syncPinPosition.bind(this), 250);
        };
        window.addEventListener("smartImagesLayoutChanged", this.onSmartImagesLayoutChanged);
    }

    ngOnDestroy() {
        if (this.onSmartImagesLayoutChanged) window.removeEventListener("smartImagesLayoutChanged", this.onSmartImagesLayoutChanged);
    }

    private displayWheelMessage() {
        clearTimeout(this.wheelMessageTimeout);
        this.msgDiv.nativeElement.style.opacity = 1;
        this.wheelMessageTimeout = setTimeout(() => {
            this.msgDiv.nativeElement.style.opacity = 0;
        }, 2000);
    }

    private syncPinPosition() {
        if (this.pinLocationValue === null || this.panzoom === null) {
            return;
        }
        const location = this.getPinLocation();
        if (!location) return;

        this.pinDiv.nativeElement.style.left = (location.x - this.pinDiv.nativeElement.width / 2) + 'px';
        this.pinDiv.nativeElement.style.top = (location.y - this.pinDiv.nativeElement.height / 2) + 'px';
        this.pinDiv.nativeElement.style.display = 'block';
    }

    public clearPin(){
        this.pinLocation = null;
        this.pinDiv.nativeElement.style.display = 'none';
    }

    private getPinLocation(): CoordsXY {

        if (this.panzoom === null) {
            return;
        }

        const zoom = this.panzoom.getScale();

        const rect = this.img.nativeElement.getClientRects()[0];
        if (!rect) return;
        const parentRect = this.img.nativeElement.parentElement.getClientRects()[0];

        const naturalWidth = this.img.nativeElement.naturalWidth;
        const naturalHeight = this.img.nativeElement.naturalHeight;
        
        const width = rect.width / zoom; //this.img.nativeElement.width;
        const height = rect.height / zoom; //this.img.nativeElement.height;
        
        const scaleX = width / naturalWidth;
        const scaleY = height / naturalHeight;

        const left = (rect.left - parentRect.left) + this.pinLocationValue.x * scaleX * zoom;
        const top = (rect.top - parentRect.top) + this.pinLocationValue.y * scaleY * zoom;

        return { x: left, y: top };
    }

    ngOnInit(): void {
    }

    private getPos(e: MouseEvent): CoordsXY {
        const zoom = this.panzoom.getScale();

        const rect = this.img.nativeElement.getClientRects()[0];
        const naturalWidth = this.img.nativeElement.naturalWidth;
        const naturalHeight = this.img.nativeElement.naturalHeight;
        const width = rect.width / zoom; //this.img.nativeElement.width;
        const height = rect.height / zoom; //this.img.nativeElement.height;
        const scaleX = width / naturalWidth;
        const scaleY = height / naturalHeight;

        const relx = e.clientX - rect.left;
        const rely = e.clientY - rect.top;

        const x = relx / zoom;
        const y = rely / zoom;

        const realX = x / scaleX;
        const realY = y / scaleY;

        return { x: realX, y: realY };
    }

}
