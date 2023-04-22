import { Component, OnInit, ApplicationRef, ViewEncapsulation, NgZone  } from '@angular/core';
import { StorageService } from '../storage.service';
import { GCP } from '../gcps-utils.service';
import { Router } from '@angular/router';
import { icon, Map, marker } from 'leaflet';
import * as L from 'leaflet';
import * as proj4 from 'proj4';
import Autolayers from './Leaflet.Autolayers/leaflet-autolayers';
import SimpleMarkers from './Leaflet.SimpleMarkers/Control.SimpleMarkers';
import Geocoder from './Leaflet.Geocoder/Control.Geocoder';

import Basemaps from './Basemaps';

@Component({
    selector: 'app-gcps-map',
    templateUrl: './gcps-map.component.html',
    styleUrls: ['./gcps-map.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class GcpsMapComponent implements OnInit {

    public gcps: GcpInfo[] = [];
    public selectedGCP: GcpInfo = null;
    public isReady: boolean;

    private markers: L.FeatureGroup;
    private map: L.Map;

    // Set the initial set of displayed layers (we could also use the leafletLayers input binding for this)
    options = {
        zoom: 7,
        zoomControl: false
    };

    constructor(private storage: StorageService, private router: Router, private appRef: ApplicationRef, private ngZone: NgZone) {
        if (typeof storage.gcps === 'undefined' ||
            typeof storage.imageGcps === 'undefined' ||
            typeof storage.projection === 'undefined') {

            router.navigateByUrl('/');

            return;
        }
    }

    private updateGcps(adjustMapBounds: Boolean = false): void{
        const prj = proj4.default.Proj(this.storage.projection.eq);

        this.markers.clearLayers();
        this.gcps.length = 0;
        this.storage.gcps.forEach(item => {
            const coords = proj4.default.transform(
                prj,
                proj4.default.WGS84,
                [item.easting, item.northing, item.elevation]);
            const elevation = isNaN(item.elevation) ? "None" : item.elevation;

            const markerLayer = marker(new L.LatLng(coords.y, coords.x, coords.z), {
                title: item.name,
                riseOnHover: true,
                icon: icon({
                    iconSize: [25, 41],
                    iconAnchor: [13, 41],
                    iconUrl: 'leaflet/marker-icon-2x.png',
                    shadowUrl: 'leaflet/marker-shadow.png'
                })
            });
            
            const imageIcon = `<svg role="img" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="images" class="svg-inline--fa fa-images fa-w-18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="currentColor" d="M480 416v16c0 26.51-21.49 48-48 48H48c-26.51 0-48-21.49-48-48V176c0-26.51 21.49-48 48-48h16v208c0 44.112 35.888 80 80 80h336zm96-80V80c0-26.51-21.49-48-48-48H144c-26.51 0-48 21.49-48 48v256c0 26.51 21.49 48 48 48h384c26.51 0 48-21.49 48-48zM256 128c0 26.51-21.49 48-48 48s-48-21.49-48-48 21.49-48 48-48 48 21.49 48 48zm-96 144l55.515-55.515c4.686-4.686 12.284-4.686 16.971 0L272 256l135.515-135.515c4.686-4.686 12.284-4.686 16.971 0L512 208v112H160v-48z"></path></svg>`;
            const trashIcon = `<svg role="img" aria-hidden="true" focusable="false" data-prefix="fas" data-icon="trash" class="svg-inline--fa fa-trash fa-w-14" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16zM53.2 467a48 48 0 0 0 47.9 45h245.8a48 48 0 0 0 47.9-45L416 128H32z"></path></svg>`;

            const domPopup = document.createElement("div");
            const domText = document.createElement("div");
            domText.innerHTML = `<b>${item.name}</b>
                <hr class="my-2">
                <b>Latitude:</b>&nbsp;${coords.y}<br />
                <b>Longitude:</b>&nbsp;${coords.x}<br />
                <b>Elevation:</b>&nbsp;${elevation}<br/>
                <a style="color: #fff;" class="btn btn-sm btn-primary mt-2" href="#/images-tagger/${encodeURIComponent(item.name)}">${imageIcon} Tag</a>`;
            domPopup.append(domText);
            
            const deleteBtn = document.createElement("a");
            deleteBtn.style.color = "#fff";
            deleteBtn.className = "btn btn-sm btn-danger mt-2";
            deleteBtn.innerHTML = trashIcon;

            deleteBtn.addEventListener("click", e => {
                if (window.confirm("Are you sure you want to remove this GCP?")){
                    this.remove(item.name);
                }
            });

            domPopup.append(deleteBtn);
            
            markerLayer.bindPopup(domPopup, {
                    offset: [0, -20]
                });

            const gcpInfo: GcpInfo = {
                gcp: item,
                marker: markerLayer,
                images: this.storage.imageGcps !== null ?
                    this.storage.imageGcps.filter(img => img.gcpName === item.name).map(img => img.imgName) : []
            };

            markerLayer.on('click', e => {
                this.select(gcpInfo);
                this.appRef.tick();
            });

            this.markers.addLayer(markerLayer);
            this.gcps.push(gcpInfo);
        });
        this.checkIsReady();

        if (adjustMapBounds){
            let bounds = this.markers.getBounds();

            if (!bounds.isValid()){
                // A famous default place...
                bounds = L.latLngBounds(
                        L.latLng(46.8423257894203, -91.9943240825542),
                        L.latLng(46.84267620076861, -91.9939864695641),
                    );
            }
    
            this.map.fitBounds(bounds, {
                maxZoom: 20,
                animate: true
            });
        }

        this.appRef.tick();
    }

    private checkIsReady(): void {

        // It's sufficient to tag at least one image
        this.isReady = this.gcps.filter(gcp => gcp.images.length !== 0).length > 0;

    }


    onMapReady(map: Map) {
        this.map = map;
        if (!map.getContainer().classList.contains("leaflet-touch")){
            map.getContainer().classList.add("leaflet-touch");
        }

        // Add Geocoder
        new Geocoder({defaultMarkGeocode: false})
        .on('markgeocode', function(e) {
            map.fitBounds(e.geocode.bbox);
        })
        .addTo(map);

        // Setup basemaps
        const basemaps = {};
        Basemaps.forEach((src, idx) => {
          const { url, ...props } = src;
          const tileProps = JSON.parse(JSON.stringify(props));
          tileProps.maxNativeZoom = tileProps.maxZoom;
          tileProps.maxZoom = tileProps.maxZoom + 99;
          const layer = L.tileLayer(url, tileProps);

          if (idx === 0) {
            layer.addTo(map);
          }

          basemaps[props.label] = layer;
        });

        const customLayer = L.layerGroup();
        customLayer.on("add", a => {
          let url = window.prompt(`Enter a tile URL template. Valid tokens are:
{z}, {x}, {y} for Z/X/Y tile scheme
{-y} for flipped TMS-style Y coordinates

Example:
https://a.tile.openstreetmap.org/{z}/{x}/{y}.png
`, 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png');
        
        if (url){
          customLayer.clearLayers();
          const l = L.tileLayer(url, {
                maxNativeZoom: 24,
                maxZoom: 99,
                minZoom: 0
            });
            customLayer.addLayer(l);
            l.bringToBack();
          }
        });
        basemaps["Custom"] = customLayer;
        basemaps["None"] = L.layerGroup();
        

        new Autolayers({
            overlays: {},
            selectedOverlays: [],
            baseLayers: basemaps
          }).addTo(map);

        // Add markers control
        new SimpleMarkers({
            delete_control: false,
            allow_popup: false,
            add_marker_callback: latlng => {
                // Get marker location and convert to user proj
                const {lat, lng} = latlng;
                const [x, y] = proj4.default(this.storage.projection.eq, [lng, lat]);

                let counter = this.storage.gcps.length;
                let name = 'gcp' + counter.toString().padStart(2, '0');
                while (this.storage.gcps.some((gcp) => gcp.name === name)) {
                    counter++;
                    name = 'gcp' + counter.toString().padStart(2, '0');
                }

                this.storage.gcps.push({
                    name: name,
                    northing:y,
                    easting: x,
                    elevation: NaN
                });

                this.updateGcps();
            }
        }).addTo(map);

        // Add zoom control
        L.control.zoom({
            position: 'bottomleft'
        }).addTo(map);
      
        this.markers = L.featureGroup().addTo(map);

        setTimeout(() => {
            this.updateGcps(true);
        }, 1);
    }

    select(gcp: GcpInfo) {
        this.selectedGCP = gcp;
        this.selectedGCP.marker.openPopup();
        this.appRef.tick();
    }

    remove(gcpName: string) {
        if (this.selectedGCP.gcp.name === gcpName){
            this.selectedGCP.marker.closePopup();
            this.selectedGCP = null;
        }

        this.storage.imageGcps = this.storage.imageGcps.filter(imgGcp => imgGcp.gcpName !== gcpName);
        this.storage.gcps = this.storage.gcps.filter(gcp => gcp.name !== gcpName);
        this.updateGcps();
    }

    editImages(gcp: GCP) {
        this.ngZone.run(() => this.router.navigateByUrl('/images-tagger/' + encodeURIComponent(gcp.name))).then();
    }

    onSmartImagesLayoutChanged = null;

    ngOnInit(): void {
        this.onSmartImagesLayoutChanged = () => {
            this.updateGcps();
        };
        window.addEventListener("smartImagesLayoutChanged", this.onSmartImagesLayoutChanged);
    }

    ngOnDestroy(){
        if (this.onSmartImagesLayoutChanged) window.removeEventListener("smartImagesLayoutChanged", this.onSmartImagesLayoutChanged);
    }
    

    next(): void {
        this.router.navigateByUrl('/export-config');
    }

    back(): void {
        this.router.navigateByUrl('/load-config');
    }
}

class GcpInfo {
    public gcp: GCP;
    public marker: L.Marker;
    public images: string[];
}

