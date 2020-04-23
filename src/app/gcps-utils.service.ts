import { Injectable } from '@angular/core';
import * as defs from 'node_modules/epsg/crs-defs.json';

@Injectable({
    providedIn: 'root'
})
export class GcpsUtilsService {

    constructor() { }

    public getProjection(projection: string): Projection {
        if (typeof projection === 'undefined' || projection === null || projection === "") {
            projection = "EPSG:4326"; // default
        }
        
        if (projection.toLowerCase().startsWith("epsg:")){
            projection = projection.replace(/^EPSG:/ig, '');
        }

        const ref = projection.split(' ');

        try {

            if (ref[0] === 'WGS84' && ref[1] === 'UTM') {
                const datum = ref[0];
                const utmPole = ref[2][ref[2].length - 2].toUpperCase();
                const utmZone = parseInt(ref[2].substr(0, ref[2].length - 1), 10);

                let proj4 = `+proj=utm +zone=${utmZone} +datum=${datum} +units=m +no_defs=True`;

                if (utmPole === 'S') {
                    proj4 += ' +south=True';
                }

                return {
                    eq: proj4,
                    str: projection
                };
            }

            if (projection.indexOf('+proj=') !== -1) {
                return {
                    eq: projection,
                    str: projection
                };
            }

            if (projection.toLowerCase().startsWith('epsg:')) {

                const proj = defs.default[projection.toUpperCase()];

                if (typeof proj === 'undefined' || proj == null) {
                    return null;
                }

                return {
                    eq: proj,
                    str: projection
                };

            // How deeply are we in love, JS? Just a good old VB6 IsNumeric was too much to ask
            } else if (+projection === +projection) {

                const proj = defs.default['EPSG:' + projection];

                if (typeof proj === 'undefined' || proj == null) {
                    return null;
                }

                return {
                    eq: proj,
                    str: 'EPSG:' + projection
                };
            }


        } catch (ex) {

            console.log(ex);
        }

        return null;
    }

    public getGCPsFromTxtData(projection: string, body: string[][]): TxtParseResult {

        const result: TxtParseResult = new TxtParseResult();

        const prj = this.getProjection(projection);

        if (prj === null) {
            result.errors = ['Invalid projection string'];
            return result;
        }

        result.errors = [];

        const imgGcps: ImageGcp[] = [];
        const gcps: GCP[] = [];

        for (let n = 0; n < body.length; n++) {
            const row = body[n];

            // Check fields count
            if (row.length < 6) {
                result.errors.push('Row ' + n + ' should have at least 6 colums');
                continue;
            }

            const imgGcp = new ImageGcp();

            // geo_x  geo_y   geo_z   im_x    im_y    image_name  gcp_name

            imgGcp.geoX = parseFloat(row[0]);

            if (isNaN(imgGcp.geoX)) {
                result.errors.push('In row ' + n + ' cannot parse geo_x value "' + row[0] + '" to float');
            }

            imgGcp.geoY = parseFloat(row[1]);

            if (isNaN(imgGcp.geoY)) {
                result.errors.push('In row ' + n + ' cannot parse geo_y value "' + row[1] + '" to float');
            }

            imgGcp.geoZ = parseFloat(row[2]);

            if (isNaN(imgGcp.geoZ)){
                if (row[2].trim().toLowerCase() === "nan"){
                    // nan values are allowed
                    imgGcp.geoZ = NaN;
                }else{
                    // Bad number/ not nan
                    result.errors.push('In row ' + n + ' cannot parse geo_z value "' + row[2] + '" to float');
                }
            }


            imgGcp.imX = parseFloat(row[3]);

            if (isNaN(imgGcp.imX)) {
                result.errors.push('In row ' + n + ' cannot parse im_x value "' + row[3] + '" to float');
            }

            imgGcp.imY = parseFloat(row[4]);

            if (isNaN(imgGcp.imY)) {
                result.errors.push('In row ' + n + ' cannot parse im_y value "' + row[4] + '" to float');
            }

            imgGcp.imgName = row[5]?.trim();

            if (imgGcp.imgName == null || imgGcp.imgName.length === 0) {
                result.errors.push('In row ' + n + ' missing imgName');
            }

            if (row.length > 6) {

                imgGcp.gcpName = row[6]?.trim();

                if (imgGcp.gcpName == null || imgGcp.gcpName.length === 0) {
                    result.errors.push('In row ' + n + ' missing gcpName');
                }

            }

            // Let's take the rest of the array
            imgGcp.extras = row.slice(7);

            // If everything went smooth
            if (result.errors.length === 0) {

                // If no GCP name was specifies we need to look for a matching one (same coords) or generate a new one
                if (imgGcp.gcpName == null) {

                    const matchingGcps = gcps.filter(gcp => gcp.northing === imgGcp.geoX &&
                        gcp.easting === imgGcp.geoY &&
                        gcp.elevation === imgGcp.geoZ);

                    if (matchingGcps.length === 0) {

                        // It generates something like gcp01 gcp02 ...
                        imgGcp.gcpName = 'gcp' + (gcps.length + 1).toString().padStart(2, '0');

                        gcps.push({
                            northing: imgGcp.geoX,
                            easting: imgGcp.geoY,
                            elevation: imgGcp.geoZ,
                            name: imgGcp.gcpName
                        });

                    } else {

                        // We found an existing gcp, so let's go with it
                        imgGcp.gcpName = matchingGcps[0].name;
                    }

                } else {

                    // Let's look for our GCP, if we don't find it we'll add it
                    if (gcps.filter(item => item.name === imgGcp.gcpName).length === 0) {
                        gcps.push({
                            northing: imgGcp.geoX,
                            easting: imgGcp.geoY,
                            elevation: imgGcp.geoZ,
                            name: imgGcp.gcpName
                        });
                    }
                }

                // Here it is our image
                imgGcps.push(imgGcp);

            }
        }

        result.descriptor = {
            projection: prj,
            imageGcps: imgGcps,
            gcps
        };

        return result;

    }

    public getGCPsFromCsvData(data: string[][], epsgProj4: string): CsvParseResult {

        const result: CsvParseResult = new CsvParseResult();

        // At least two rows
        if (data.length <= 1) {
            result.errors = ['Not enough rows'];
            return result;
        }

        const header = data[0];
        if (header.length !== 4) {
            result.errors = ['Header must have exactly 4 colums, but the file has ' + header.length];
            return result;
        }

        // People can choose the labels they want
        // we could enfore them by uncommenting this
        // if (header[0] !== 'GCP Label') {
        //     result.errors = ['Missing "GCP Label" header from first column'];
        //     return result;
        // }

        // const elevationCaption = header[3];

        // if (!(header[1] === 'Northing' || header[2] === 'Easting' || elevationCaption === 'Elevation (m)') &&
        //     !(header[1] === 'Latitude' || header[2] === 'Longitude' || elevationCaption === 'Elevation (m)') &&
        //     !(header[1] === 'Northing' || header[2] === 'Easting' || elevationCaption === 'Elevation (ft)')
        // ) {
        //     result.errors = ['Invalid column headers'];
        //     return result;
        // }

        const gcps: GCP[] = [];
        result.errors = [];
        const gcpsHashmap = {};

        // Skip the header, foreach row in csv
        for (let n = 1; n < data.length; n++) {
            const row = data[n];

            // Check fields count
            if (row.length !== 4) {
                result.errors.push('Row ' + n + ' should have 4 colums');
                continue;
            }

            const name = row[0].trim();
            const northing = parseFloat(row[1]);
            const easting = parseFloat(row[2]);
            const elevation = parseFloat(row[3]);

            if (name.length === 0) {
                result.errors.push('In row ' + n + ' the GCP Label is empty');
            } else {

                // Check for duplicates
                if (typeof gcpsHashmap[name] !== 'undefined') {
                    result.errors.push('In row ' + n + ' found duplicate GCP Label "' + name + '"');
                } else {
                    gcpsHashmap[name] = true;
                }

            }

            if (isNaN(northing)) {
                result.errors.push('In row ' + n + ' cannot read value "' + row[1] + '" (not a number?)');
            }

            if (isNaN(northing)) {
                result.errors.push('In row ' + n + ' cannot read value "' + row[1] + '" (not a number?)');
            }

            if (isNaN(northing)) {
                result.errors.push('In row ' + n + ' cannot read value "' + row[1] + '" (not a number?)');
            }

            if (result.errors.length === 0) {
                gcps.push({
                    easting,
                    elevation,
                    northing,
                    name
                });
            }
        }

        if (result.errors.length > 0) {
            return result;
        }

        const projection = this.getProjection(epsgProj4);

        result.descriptor = {
            gcps,
            projection
        };

        return result;

    }

    public generateExtrasNames(imageGcps: ImageGcp[]): string[] {
        // Let's generate the array of extras headers
        const extrasCount = Math.max(...imageGcps.map(item => item.extras.length));

        const extras = [];
        for (let n = 0; n < extrasCount; n++) {
            extras.push('extra' + (n + 1));
        }
        return extras;
    }
}

export class Projection {
    public str: string;
    public eq: string;
}

export enum ProjectionType {
    EPSG, Proj4
}

export enum ElevationMeasureUnit {
    Meters, Feets
}

export class CsvParseResult {
    public errors: string[];
    public descriptor: GCPsDescriptor;
}

export class GCPsDescriptor {
    public gcps: GCP[];
    public projection: Projection;
}

export class GCP {
    public name: string;
    public northing: number;
    public easting: number;
    public elevation: number;
}

export class TxtParseResult {
    public errors: string[];
    public descriptor: TxtDescriptor;
}

export class TxtDescriptor {
    public projection: Projection;
    public imageGcps: ImageGcp[];
    public gcps: GCP[];
}

export class ImageGcp {
    public geoX: number;
    public geoY: number;
    public geoZ: number;

    public imX: number;
    public imY: number;

    public imgName: string;
    public gcpName: string;

    public extras: string[];
}
