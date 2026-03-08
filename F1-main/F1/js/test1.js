var map = L.map("map").setView([20.78, -156.33], 12); 
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap"
}).addTo(map);

var gridsGroup = L.layerGroup().addTo(map);

function build3x3Grid(centerLonLat, cellSide, units) {
  var center = turf.point(centerLonLat);

  var half = 1.5 * cellSide;

  var cornerDist = half * Math.SQRT2;

  var ne = turf.destination(center, cornerDist, 45, { units: units });
  var sw = turf.destination(center, cornerDist, 225, { units: units });

  var eps = cellSide * 0.001;

  var bbox = [
    sw.geometry.coordinates[0] - eps, 
    sw.geometry.coordinates[1] - eps, 
    ne.geometry.coordinates[0] + eps, 
    ne.geometry.coordinates[1] + eps  
  ];

  var grid = turf.squareGrid(bbox, cellSide, { units: units });

  var filtered = grid.features.filter(function (f) {
    var c = turf.centroid(f).geometry.coordinates; 
    return (
      c[0] >= bbox[0] && c[0] <= bbox[2] &&
      c[1] >= bbox[1] && c[1] <= bbox[3]
    );
  });

  return turf.featureCollection(filtered.slice(0, 9));
}

var centers = [
  { name: "Lahaina", lonlat: [-156.675913, 20.881157] },
  { name: "Waiohuli", lonlat: [-156.351146, 20.730348] },
  { name: "Kahului", lonlat: [-156.46786, 20.88071] }
];

var cellSide = 0.2;
var units = "miles";

var allBounds = [];

centers.forEach(function (c) {
  var grid3x3 = build3x3Grid(c.lonlat, cellSide, units);

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
      var cent = turf.centroid(feature).geometry.coordinates; 
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

var combined = allBounds[0];
for (var i = 1; i < allBounds.length; i++) combined = combined.extend(allBounds[i]);
map.fitBounds(combined.pad(0.1));});