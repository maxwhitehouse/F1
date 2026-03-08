var map = L.map("map").setView([20.78, -156.33], 12); // maui-ish 20.7984° N, 156.3319° W
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap"
}).addTo(map);


var gridsGroup = L.layerGroup().addTo(map);

function build3x3Grid(centerLonLat, cellSide, units) {
  var center = turf.point(centerLonLat);

  var halfWidth = (3 * cellSide) / 2;
  var buffered = turf.buffer(center, halfWidth, { units: units });
  var bbox = turf.bbox(buffered);

  var grid = turf.squareGrid(bbox, cellSide, { units: units });

  var cells = grid.features
    .map(function (f) {
      var c = turf.centroid(f);
      var d = turf.distance(center, c, { units: units });
      return { feature: f, dist: d };
    })
    .sort(function (a, b) { return a.dist - b.dist; })
    .slice(0, 9)
    .map(function (x) { return x.feature; });

  return turf.featureCollection(cells);
}


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

  var layer = L.geoJSON(grid3x3, {
    style: function () {
      return { weight: 2, fillOpacity: 0.15 };
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

//   // Optional: add a center marker (Leaflet uses [lat, lon]!)
//   L.circleMarker([c.lonlat[1], c.lonlat[0]], { radius: 5 }).addTo(gridsGroup)
//     .bindPopup("<b>Center:</b> " + c.name);
// });

// Fit map to everything
var combined = allBounds[0];
for (var i = 1; i < allBounds.length; i++) combined = combined.extend(allBounds[i]);
map.fitBounds(combined);});