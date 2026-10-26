import { Component, Output, EventEmitter, Input, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CoordsXY } from '../../shared/common';

const MAX_SCALE = 300;
const WHEEL_STEP = Math.exp(0.7 / 3);
const DRAG_THRESHOLD = 3;

@Component({
    selector: 'app-smartimage',
    templateUrl: './smartimage.component.html',
    styleUrls: ['./smartimage.component.scss']
})
export class SmartimageComponent implements AfterViewInit, OnDestroy {

    @Input()
    get pinLocation() {
        return this.pinLocationValue;
    }

    set pinLocation(val) {
        this.pinLocationValue = val;
        this.render();
        this.pinLocationChange.emit(this.pinLocationValue);
    }

    @Output() public pin = new EventEmitter();
    @Input() public src: string;

    @Input()
    get crosshair() {
        return this.crosshairValue;
    }

    set crosshair(val) {
        this.crosshairValue = val;
        this.render();
    }

    crosshairValue = false;

    @Input()
    get size() {
        return this.sizeValue;
    }

    set size(val) {
        this.sizeValue = val;
        this.layout();
    }

    sizeValue = 320;
    @ViewChild('img') img: ElementRef;
    @ViewChild('svg') svg: ElementRef;
    @ViewChild('image') image: ElementRef;
    @ViewChild('pin') pinGroup: ElementRef;
    @ViewChild('cross') crossGroup: ElementRef;
    @ViewChild('msg') msgDiv: ElementRef;

    @Output()
    pinLocationChange = new EventEmitter<CoordsXY>();

    pinLocationValue: CoordsXY = null;

    private naturalWidth = 0;
    private naturalHeight = 0;
    private displayWidth = 0;
    private displayHeight = 0;
    private view = { x: 0, y: 0, w: 0, h: 0 };

    private pointer: { id: number, x: number, y: number, panning: boolean } = null;
    private hover: { x: number, y: number } = null;
    private wheelMessageTimeout: any;
    private listeners: [string, any][] = [];

    ngAfterViewInit(): void {
        const svg = this.svg.nativeElement;

        this.listen('pointerdown', (e: PointerEvent) => {
            if (e.button !== 0 || this.pointer !== null) return;
            this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, panning: false };
            svg.setPointerCapture(e.pointerId);
        });

        this.listen('pointermove', (e: PointerEvent) => {
            this.hover = { x: e.clientX, y: e.clientY };
            const p = this.pointer;
            if (p === null || p.id !== e.pointerId) {
                this.renderCrosshair();
                return;
            }
            if (!p.panning && Math.hypot(e.clientX - p.x, e.clientY - p.y) < DRAG_THRESHOLD) return;
            if (!p.panning) {
                p.panning = true;
                svg.classList.add('panning');
            }
            const ctm = svg.getScreenCTM();
            this.view.x -= (e.clientX - p.x) / ctm.a;
            this.view.y -= (e.clientY - p.y) / ctm.d;
            p.x = e.clientX;
            p.y = e.clientY;
            this.clampView();
            this.render();
        });

        this.listen('pointerup', (e: PointerEvent) => {
            const p = this.pointer;
            if (p === null || p.id !== e.pointerId) return;
            this.pointer = null;
            svg.classList.remove('panning');
            if (p.panning || this.naturalWidth === 0) return;

            const pos = this.toImage(e.clientX, e.clientY);
            pos.x = Math.min(Math.max(pos.x, 0), this.naturalWidth);
            pos.y = Math.min(Math.max(pos.y, 0), this.naturalHeight);

            this.pinLocation = pos;
            this.pin.emit(this.pinLocation);
        });

        this.listen('pointercancel', () => {
            this.pointer = null;
            svg.classList.remove('panning');
        });

        this.listen('wheel', (e: WheelEvent) => {
            if (!e.shiftKey) {
                this.displayWheelMessage();
                return;
            }
            e.preventDefault();
            clearTimeout(this.wheelMessageTimeout);
            this.msgDiv.nativeElement.style.transitionDuration = '0s';
            this.msgDiv.nativeElement.style.opacity = 0;
            if (this.naturalWidth === 0) return;

            const delta = e.deltaY || e.deltaX;
            if (delta === 0) return;

            const scale = this.naturalWidth / this.view.w;
            const newScale = Math.min(MAX_SCALE, Math.max(1, delta < 0 ? scale * WHEEL_STEP : scale / WHEEL_STEP));
            const p = this.toImage(e.clientX, e.clientY);
            const ratio = scale / newScale;

            this.view.x = p.x - (p.x - this.view.x) * ratio;
            this.view.y = p.y - (p.y - this.view.y) * ratio;
            this.view.w *= ratio;
            this.view.h *= ratio;
            this.clampView();
            this.render();
        });

        this.listen('mouseleave', () => {
            this.msgDiv.nativeElement.style.opacity = 0;
        });

        this.listen('pointerleave', () => {
            this.hover = null;
            this.renderCrosshair();
        });
    }

    ngOnDestroy() {
        const svg = this.svg.nativeElement;
        this.listeners.forEach(([type, fn]) => svg.removeEventListener(type, fn));
        clearTimeout(this.wheelMessageTimeout);
    }

    public onImageLoad() {
        const img = this.img.nativeElement;
        this.naturalWidth = img.naturalWidth;
        this.naturalHeight = img.naturalHeight;
        this.view = { x: 0, y: 0, w: this.naturalWidth, h: 0 };

        const image = this.image.nativeElement;
        image.setAttribute('width', this.naturalWidth);
        image.setAttribute('height', this.naturalHeight);
        image.setAttribute('href', img.currentSrc || img.src);

        this.layout();
    }

    private layout() {
        if (!this.svg || this.naturalWidth === 0) return;

        const fit = Math.min(1, this.sizeValue / this.naturalWidth, this.sizeValue / this.naturalHeight);
        this.displayWidth = Math.max(1, Math.round(this.naturalWidth * fit));
        this.displayHeight = Math.max(1, Math.round(this.naturalHeight * fit));
        this.view.h = this.view.w * this.displayHeight / this.displayWidth;

        const svg = this.svg.nativeElement;
        svg.setAttribute('width', this.displayWidth);
        svg.setAttribute('height', this.displayHeight);

        this.clampView();
        this.render();
    }

    public clearPin(){
        this.pinLocation = null;
    }

    private listen(type: string, fn: any) {
        this.svg.nativeElement.addEventListener(type, fn, type === 'wheel' ? { passive: false } : undefined);
        this.listeners.push([type, fn]);
    }

    private toImage(clientX: number, clientY: number): CoordsXY {
        const svg = this.svg.nativeElement;
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        return { x: p.x, y: p.y };
    }

    private clampView() {
        this.view.x = Math.min(Math.max(this.view.x, -this.view.w / 2), this.naturalWidth - this.view.w / 2);
        this.view.y = Math.min(Math.max(this.view.y, -this.view.h / 2), this.naturalHeight - this.view.h / 2);
    }

    private render() {
        if (!this.svg || this.naturalWidth === 0) return;

        const v = this.view;
        this.svg.nativeElement.setAttribute('viewBox', `${v.x} ${v.y} ${v.w} ${v.h}`);
        this.image.nativeElement.style.imageRendering = this.displayWidth * window.devicePixelRatio / v.w >= 1 ? 'pixelated' : 'auto';

        const g = this.pinGroup.nativeElement;
        if (this.pinLocationValue) {
            const s = v.w / this.displayWidth;
            g.setAttribute('transform', `translate(${this.pinLocationValue.x} ${this.pinLocationValue.y}) scale(${s})`);
            g.style.display = '';
        } else {
            g.style.display = 'none';
        }

        this.renderCrosshair();
    }

    private renderCrosshair() {
        if (!this.crossGroup) return;

        const g = this.crossGroup.nativeElement;
        if (!this.crosshairValue || this.hover === null || this.naturalWidth === 0) {
            g.style.display = 'none';
            return;
        }

        const v = this.view;
        const p = this.toImage(this.hover.x, this.hover.y);
        const d = `M${p.x} ${v.y}V${v.y + v.h}M${v.x} ${p.y}H${v.x + v.w}`;
        for (const path of g.children) path.setAttribute('d', d);
        g.style.display = '';
    }

    private displayWheelMessage() {
        clearTimeout(this.wheelMessageTimeout);
        this.msgDiv.nativeElement.style.transitionDuration = '';
        this.msgDiv.nativeElement.style.opacity = 1;
        this.wheelMessageTimeout = setTimeout(() => {
            this.msgDiv.nativeElement.style.opacity = 0;
        }, 2000);
    }

}
