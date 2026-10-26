import { Injectable } from '@angular/core';

// Browsers cannot display TIFF files (in particular 16/32 bit multispectral ones),
// so we decode them client side (see assets/tiff-worker.js) and convert them to
// a full resolution JPEG. Pixel coordinates are preserved 1:1.

const WORKER_URL = 'assets/tiff-worker.js';
const GEOTIFF_URL = 'geotiff/geotiff.js';

interface DecodedTiff {
    width: number;
    height: number;
    data: ArrayBuffer;
}

export function isTiff(file: File): boolean {
    return file.type === 'image/tiff' || /\.tiff?$/i.test(file.name);
}

@Injectable({
    providedIn: 'root'
})
export class TiffRendererService {

    private worker: Worker = null;
    private useWorker = typeof Worker !== 'undefined';
    private fallbackLoaded: Promise<void> = null;
    private nextId = 0;
    private pending: { [id: number]: { resolve: (res: DecodedTiff) => void, reject: (err: any) => void } } = {};

    // Decode one image at a time to keep memory usage in check
    private queue: Promise<any> = Promise.resolve();

    public render(file: File): Promise<string> {
        const job = this.queue.then(() => this.decode(file)).then(res => this.toObjectUrl(res));
        this.queue = job.catch(() => null);
        return job;
    }

    private decode(file: File): Promise<DecodedTiff> {
        if (this.useWorker) {
            return this.decodeInWorker(file).catch(err => {
                // Workers might not be allowed (e.g. file:// origins), fallback to the main thread
                if (err && err.workerFailed) {
                    console.warn('TIFF worker unavailable, decoding on main thread');
                    this.useWorker = false;
                    return this.decodeInMainThread(file);
                }
                throw err;
            });
        } else {
            return this.decodeInMainThread(file);
        }
    }

    private decodeInWorker(file: File): Promise<DecodedTiff> {
        if (this.worker === null) {
            try {
                this.worker = new Worker(WORKER_URL);
            } catch (e) {
                return Promise.reject({ workerFailed: true });
            }

            this.worker.onmessage = (e: MessageEvent) => {
                const p = this.pending[e.data.id];
                if (!p) return;
                delete this.pending[e.data.id];
                if (e.data.error) p.reject(new Error(e.data.error));
                else p.resolve(e.data);
            };
            this.worker.onerror = () => {
                Object.keys(this.pending).forEach(id => this.pending[id].reject({ workerFailed: true }));
                this.pending = {};
                this.worker.terminate();
                this.worker = null;
            };
        }

        return new Promise<DecodedTiff>((resolve, reject) => {
            const id = this.nextId++;
            this.pending[id] = { resolve, reject };
            this.worker.postMessage({ id, file });
        });
    }

    private decodeInMainThread(file: File): Promise<DecodedTiff> {
        if (this.fallbackLoaded === null) {
            this.fallbackLoaded = this.loadScript(GEOTIFF_URL).then(() => this.loadScript(WORKER_URL));
        }
        return this.fallbackLoaded.then(() => (window as any).renderTiff(file));
    }

    private loadScript(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Cannot load ' + url));
            document.head.appendChild(script);
        });
    }

    private toObjectUrl(res: DecodedTiff): Promise<string> {
        const canvas = document.createElement('canvas');
        canvas.width = res.width;
        canvas.height = res.height;
        canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(res.data), res.width, res.height), 0, 0);

        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                // Release the canvas memory right away
                canvas.width = canvas.height = 0;
                if (blob) resolve((window.URL ? URL : webkitURL).createObjectURL(blob));
                else reject(new Error('Cannot encode image (too large?)'));
            }, 'image/jpeg', 0.92);
        });
    }
}
