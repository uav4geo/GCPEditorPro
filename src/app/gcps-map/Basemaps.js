export default [
  {
    attribution: "Map data: &copy; Google Maps",
    subdomains: ["mt0", "mt1", "mt2", "mt3"],
    maxZoom: 21,
    minZoom: 0,
    label: "Google Maps Hybrid",
    url: "https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
  },
  {
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
    minZoom: 0,
    label: "OSM Mapnik",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  }
];
