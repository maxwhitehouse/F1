var map = L.map("map").setView([20.78, -156.33], 12); // maui-ish
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap"
}).addTo(map);

var gridsGroup = L.layerGroup().addTo(map);

// Always-3x3 grid builder
function build3x3Grid(centerLonLat, cellSide, units) {
  var center = turf.point(centerLonLat);

  // total grid width = 3 * cellSide, so half-width = 1.5 * cellSide
  var half = 1.5 * cellSide;

  // distance from center to a corner of that square
  var cornerDist = half * Math.SQRT2;

  // corners (bearings in degrees)
  var ne = turf.destination(center, cornerDist, 45, { units: units });
  var sw = turf.destination(center, cornerDist, 225, { units: units });

  // tiny padding to prevent rounding from dropping a row/col
  var eps = cellSide * 0.001;

  var bbox = [
    sw.geometry.coordinates[0] - eps, // minLon
    sw.geometry.coordinates[1] - eps, // minLat
    ne.geometry.coordinates[0] + eps, // maxLon
    ne.geometry.coordinates[1] + eps  // maxLat
  ];

  // build grid
  var grid = turf.squareGrid(bbox, cellSide, { units: units });

  // keep only cells whose centroids fall within bbox
  var filtered = grid.features.filter(function (f) {
    var c = turf.centroid(f).geometry.coordinates; // [lon, lat]
    return (
      c[0] >= bbox[0] && c[0] <= bbox[2] &&
      c[1] >= bbox[1] && c[1] <= bbox[3]
    );
  });

  // should be 9; slice is a safe fallback
  return turf.featureCollection(filtered.slice(0, 9));
}

// Your centers (Turf order: [lon, lat])
var centers = [
  { name: "Lahaina", lonlat: [-156.675913, 20.881157] },
  { name: "East of Kihei", lonlat: [-156.351146, 20.730348] },
  { name: "Kahului", lonlat: [-156.46786, 20.88071] }
];

var cellSide = 0.3;
var units = "miles";

var allBounds = [];

centers.forEach(function (c) {
  var grid3x3 = build3x3Grid(c.lonlat, cellSide, units);

  // optional debug: should always be 9
  console.log(c.name + " cells:", grid3x3.features.length);

  var layer = L.geoJSON(grid3x3, {
    style: function () {
      return {
        color: "#000",
        weight: 2,
        fillOpacity: 0.15
      };
    },
    onEachFeature: function (feature, lyr) {
      var cent = turf.centroid(feature).geometry.coordinates; // [lon, lat]
      lyr.bindPopup(
        "<b>" + c.name + "</b><br>" +
        "Cell centroid: " + cent[1].toFixed(4) + ", " + cent[0].toFixed(4)
      );
    }
  }).addTo(gridsGroup);

  allBounds.push(layer.getBounds());

//   // Optional: center marker (Leaflet order: [lat, lon])
//   L.circleMarker([c.lonlat[1], c.lonlat[0]], { radius: 5 })
//     .addTo(gridsGroup)
//     .bindPopup("<b>Center:</b> " + c.name);
// });

// Fit map to everything (outside the loop)
var combined = allBounds[0];
for (var i = 1; i < allBounds.length; i++) combined = combined.extend(allBounds[i]);
map.fitBounds(combined.pad(0.1));});