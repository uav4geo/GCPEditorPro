import { Injectable } from '@angular/core';

const WORKER_URL = 'assets/tiff-worker.js';

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
    private nextId = 0;
    private pending: { [id: number]: { resolve: (res: DecodedTiff) => void, reject: (err: any) => void } } = {};

    private queue: Promise<any> = Promise.resolve();

    public render(file: File): Promise<string> {
        const job = this.queue.then(() => this.decode(file)).then(res => this.toObjectUrl(res));
        this.queue = job.catch(() => null);
        return job;
    }

    private decode(file: File): Promise<DecodedTiff> {
        if (this.worker === null) {
            this.worker = new Worker(WORKER_URL);

            this.worker.onmessage = (e: MessageEvent) => {
                const p = this.pending[e.data.id];
                if (!p) return;
                delete this.pending[e.data.id];
                if (e.data.error) p.reject(new Error(e.data.error));
                else p.resolve(e.data);
            };
            this.worker.onerror = () => {
                Object.keys(this.pending).forEach(id => this.pending[id].reject(new Error('TIFF decoder failed')));
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

    private toObjectUrl(res: DecodedTiff): Promise<string> {
        const canvas = document.createElement('canvas');
        canvas.width = res.width;
        canvas.height = res.height;
        canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(res.data), res.width, res.height), 0, 0);

        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                canvas.width = canvas.height = 0;
                if (blob) resolve((window.URL ? URL : webkitURL).createObjectURL(blob));
                else reject(new Error('Cannot encode image (too large?)'));
            }, 'image/jpeg', 0.92);
        });
    }
}
