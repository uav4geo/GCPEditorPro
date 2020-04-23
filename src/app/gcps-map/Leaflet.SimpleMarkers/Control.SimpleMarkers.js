/* jshint plusplus: false */
/* globals L */
import * as L from 'leaflet';

L.Control.SimpleMarkers = L.Control.extend({
    options: {
        position: 'topleft',
        add_control: true,
        delete_control: true,
        allow_popup: true,
        marker_icon: undefined,
        marker_draggable: false,
        add_marker_callback: undefined
    },
    map: undefined,
    markerList: [],

    onAdd: function (map) {
        "use strict";
        this.map = map;
        var marker_container = L.DomUtil.create('div', 'marker_controls');

        if (this.options.add_control) {
            var add_marker_div = L.DomUtil.create('div', 'add_marker_control', marker_container);
            this.add_marker_div = add_marker_div;
            add_marker_div.title = 'Add a GCP';
            L.DomEvent.addListener(add_marker_div, 'click', L.DomEvent.stopPropagation)
                .addListener(add_marker_div, 'click', L.DomEvent.preventDefault)
                .addListener(add_marker_div, 'click', this.enterAddMarkerMode.bind(this));
        }
        if (this.options.delete_control) {
            var del_marker_div = L.DomUtil.create('div', 'del_marker_control', marker_container);
            del_marker_div.title = 'Delete a GCP';


            L.DomEvent.addListener(del_marker_div, 'click', L.DomEvent.stopPropagation)
                .addListener(del_marker_div, 'click', L.DomEvent.preventDefault)
                .addListener(del_marker_div, 'click', this.enterDelMarkerMode.bind(this));
        }

        return marker_container;
    },

    enterAddMarkerMode: function () {
        "use strict";
        if (!this.add_marker_div.classList.contains("selected")){
            if (this.markerList !== '') {
                for (var marker = 0; marker < this.markerList.length; marker++) {
                    if (typeof(this.markerList[marker]) !== 'undefined') {
                        this.markerList[marker].removeEventListener('click', this.onMarkerClickDelete.bind(this));
                    }
                }
            }
            this.add_marker_div.classList.add('selected');
            this.map._container.style.cursor = 'crosshair';
            this.map.addEventListener('click', this.onMapClickAddMarker.bind(this));
        }else{
            this.add_marker_div.classList.remove('selected');
            this.map.removeEventListener('click');
            this.map._container.style.cursor = 'auto';
        }
    },

    enterDelMarkerMode: function () {
        "use strict";
        for (var marker = 0; marker < this.markerList.length; marker++) {
            if (typeof(this.markerList[marker]) !== 'undefined') {
                this.markerList[marker].addEventListener('click', this.onMarkerClickDelete.bind(this));
                this.map._container.style.cursor = 'crosshair';
            }
        }
    },

    onMapClickAddMarker: function (e) {
        "use strict";
        if (this.options.add_marker_callback){
            this.options.add_marker_callback(e.latlng);
        }
        this.add_marker_div.classList.remove('selected');
        this.map.removeEventListener('click');
        this.map._container.style.cursor = 'auto';

        // var marker_options = {draggable: this.options.marker_draggable};
        // if (this.options.marker_icon) {
        //     marker_options.icon = this.options.marker_icon;
        // }
        // var marker = L.marker(e.latlng, marker_options);
        // if (this.options.allow_popup) {
        //     var popupContent =  "You clicked on the map at " + e.latlng.toString();
        //     var the_popup = L.popup({maxWidth: 160, closeButton: false});
        //     the_popup.setContent(popupContent);
        //     marker.bindPopup(the_popup).openPopup();
        // }
        // if (this.options.add_marker_callback) {
        //     this.options.add_marker_callback(marker);
        // }
        // marker.addTo(this.map);
        // this.markerList.push(marker);

        return false;
    },

    onMarkerClickDelete: function (e) {
        "use strict";
        this.map._container.style.cursor = 'auto';
        if (this.markerList.indexOf(e.target)) {
            this.map.removeLayer(e.target);
            var marker_index = this.markerList.indexOf(e.target);
            delete this.markerList[marker_index];

            for (var marker = 0; marker < this.markerList.length; marker++) {
                if (typeof(this.markerList[marker]) !== 'undefined') {
                    this.markerList[marker].removeEventListener('click', this.onMarkerClickDelete);
                }
            }
            return false;
        }
    }
});

export default L.Control.SimpleMarkers;
