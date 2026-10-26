importScripts('../geotiff/geotiff.js');

var LOW_PERCENTILE = 0.02;
var HIGH_PERCENTILE = 0.98;

var MAX_SAMPLES = 500000;

function isPlain8Bit(image) {
    var fd = image.fileDirectory;
    var bps = fd.BitsPerSample || [8];
    var fmt = fd.SampleFormat || [1];
    for (var i = 0; i < bps.length; i++) {
        if (bps[i] !== 8 || (fmt[i] || 1) !== 1) return false;
    }
    var ph = fd.PhotometricInterpretation;
    var spp = image.getSamplesPerPixel();
    var extra = fd.ExtraSamples ? fd.ExtraSamples.length : 0;

    return (ph === 0 || ph === 1) ? spp - extra === 1 :
        (ph === 2 || ph === 3 || ph === 5 || ph === 6);
}

function pickSamples(image) {
    var spp = image.getSamplesPerPixel();
    var extra = image.fileDirectory.ExtraSamples ? image.fileDirectory.ExtraSamples.length : 0;
    var bands = Math.max(1, spp - extra);
    return bands >= 3 ? [0, 1, 2] : [0];
}

function stretchRange(band, nodata) {
    var len = band.length;
    var step = Math.max(1, Math.floor(len / MAX_SAMPLES));
    var samples = new Float64Array(Math.ceil(len / step));
    var n = 0;
    for (var i = 0; i < len; i += step) {
        var v = band[i];
        if (v !== v || v === nodata || v === Infinity || v === -Infinity) continue;
        samples[n++] = v;
    }
    if (n === 0) return [0, 1];

    samples = samples.subarray(0, n).sort();
    var lo = samples[Math.floor((n - 1) * LOW_PERCENTILE)];
    var hi = samples[Math.floor((n - 1) * HIGH_PERCENTILE)];
    if (hi <= lo) {
        lo = samples[0];
        hi = samples[n - 1];
    }
    if (hi <= lo) hi = lo + 1;
    return [lo, hi];
}

function renderTiff(file) {
    return GeoTIFF.fromBlob(file).then(function (tiff) {
        return tiff.getImage();
    }).then(function (image) {
        var width = image.getWidth();
        var height = image.getHeight();
        var size = width * height;
        var rgba = new Uint8ClampedArray(size * 4);

        if (isPlain8Bit(image)) {
            return image.readRGB({ interleave: true, enableAlpha: false }).then(function (rgb) {
                for (var i = 0, j = 0; i < size; i++, j += 3) {
                    rgba[i * 4] = rgb[j];
                    rgba[i * 4 + 1] = rgb[j + 1];
                    rgba[i * 4 + 2] = rgb[j + 2];
                    rgba[i * 4 + 3] = 255;
                }
                return { width: width, height: height, data: rgba.buffer };
            });
        }

        var samples = pickSamples(image);
        var nodata = image.getGDALNoData();

        return image.readRasters({ samples: samples, interleave: false }).then(function (rasters) {
            for (var c = 0; c < 3; c++) {
                var band = rasters[Math.min(c, rasters.length - 1)];
                var range = stretchRange(band, nodata);
                var lo = range[0];
                var scale = 255 / (range[1] - range[0]);
                for (var i = 0; i < size; i++) {
                    rgba[i * 4 + c] = (band[i] - lo) * scale;
                }
            }
            for (var i = 0; i < size; i++) rgba[i * 4 + 3] = 255;
            return { width: width, height: height, data: rgba.buffer };
        });
    });
}

self.onmessage = function (e) {
    var id = e.data.id;
    renderTiff(e.data.file).then(function (res) {
        res.id = id;
        self.postMessage(res, [res.data]);
    }, function (err) {
        self.postMessage({ id: id, error: (err && err.message) || String(err) });
    });
};
