// =====================
// Map setup
// =====================
var map = L.map("map").setView([20.78, -156.33], 12);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap"
}).addTo(map);

var gridsGroup = L.layerGroup().addTo(map);

// =====================
// Always-3x3 grid builder
// =====================
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

// =====================
// Your three centers (Turf order: [lon, lat])
// =====================
var centers = [
  { name: "Lahaina", lonlat: [-156.675913, 20.881157] },
  { name: "East of Kihei", lonlat: [-156.351146, 20.730348] },
  { name: "Kahului", lonlat: [-156.46786, 20.88071] }
];

var cellSide = 0.3;
var units = "miles";

// We'll store Leaflet layers for later re-styling on slider changes
var gridLayers = [];

// =====================
// Cell indexing: assign (row,col) consistently
// We sort cells by centroid lat desc, lon asc:
// top row first, left-to-right within row
// =====================
function addRowColIds(featureCollection) {
  var feats = featureCollection.features.slice();

  feats.sort(function (a, b) {
    var ca = turf.centroid(a).geometry.coordinates; // [lon,lat]
    var cb = turf.centroid(b).geometry.coordinates;

    // higher latitude first (top row)
    if (cb[1] !== ca[1]) return cb[1] - ca[1];
    // smaller longitude first (left col)
    return ca[0] - cb[0];
  });

  // assign row/col: 0..2
  feats.forEach(function (f, idx) {
    var row = Math.floor(idx / 3);
    var col = idx % 3;
    f.properties = f.properties || {};
    f.properties.row = row;
    f.properties.col = col;
    f.properties.cellId = "(" + row + "," + col + ")";
  });

  return turf.featureCollection(feats);
}

// =====================
// Model logic (your paper's rule)
// Compliance is dominant iff: L*theta + p*F > c
// (Section 4.3) :contentReference[oaicite:1]{index=1}
// =====================
function getParams() {
  return {
    L: +document.getElementById("L").value,
    theta: +document.getElementById("theta").value,
    p: +document.getElementById("p").value,
    F: +document.getElementById("F").value,
    c: +document.getElementById("c").value
  };
}

function equilibrium(params) {
  var lhs = params.L * params.theta + params.p * params.F;
  var rhs = params.c;
  var comply = lhs > rhs;

  return {
    comply: comply,
    lhs: lhs,
    rhs: rhs,
    label: comply ? "(C, C) is Nash (C dominant)" : "(N, N) is Nash (N dominant)"
  };
}

// =====================
// Styling helpers
// =====================
function styleForCell(params, eq, feature) {
  // You can later make center cell different. For now, same outcome everywhere.
  // Example: center cell thicker outline
  var isCenter = (feature.properties.row === 1 && feature.properties.col === 1);

  return {
    color: "#000",
    weight: isCenter ? 3 : 2,
    fillOpacity: 0.25,
    // Leaflet accepts fillColor. Keep it simple:
    fillColor: eq.comply ? "#4CAF50" : "#E53935"
  };
}

function popupHtml(centerName, params, eq, feature) {
  return (
    "<b>" + centerName + "</b><br>" +
    "Cell: <b>" + feature.properties.cellId + "</b><br><br>" +
    "<b>Decision rule:</b> Lθ + pF > c<br>" +
    "Lθ + pF = " + eq.lhs.toFixed(2) + "<br>" +
    "c = " + eq.rhs.toFixed(2) + "<br>" +
    "<b>Equilibrium:</b> " + (eq.comply ? "(C,C)" : "(N,N)") + "<br><br>" +
    "<small>" +
    "L=" + params.L + ", θ=" + params.theta.toFixed(2) +
    ", p=" + params.p.toFixed(2) + ", F=" + params.F + ", c=" + params.c +
    "</small>"
  );
}

// =====================
// Draw initial grids
// =====================
var allBounds = [];

centers.forEach(function (c) {
  var fc = build3x3Grid(c.lonlat, cellSide, units);
  fc = addRowColIds(fc);

  var layer = L.geoJSON(fc, {
    style: function (feature) {
      var params = getParams();
      var eq = equilibrium(params);
      return styleForCell(params, eq, feature);
    },
    onEachFeature: function (feature, lyr) {
      var params = getParams();
      var eq = equilibrium(params);
      lyr.bindPopup(popupHtml(c.name, params, eq, feature));
    }
  }).addTo(gridsGroup);

//   // center marker
  L.circleMarker([c.lonlat[1], c.lonlat[0]], { radius: 5, weight: 2 })
    .addTo(gridsGroup)
    .bindPopup("<b>Center:</b> " + c.name);

  gridLayers.push({ name: c.name, layer: layer, center: c.lonlat });

  allBounds.push(layer.getBounds());
});

// fit bounds once
var combined = allBounds[0];
for (var i = 1; i < allBounds.length; i++) combined = combined.extend(allBounds[i]);
map.fitBounds(combined.pad(0.1));

// =====================
// UI wiring
// =====================
function renderUi() {
  var params = getParams();
  var eq = equilibrium(params);

  document.getElementById("Lval").textContent = params.L;
  document.getElementById("thetaval").textContent = params.theta.toFixed(2);
  document.getElementById("pval").textContent = params.p.toFixed(2);
  document.getElementById("Fval").textContent = params.F;
  document.getElementById("cval").textContent = params.c;

  document.getElementById("status").innerHTML =
    "<b>" + eq.label + "</b><br>" +
    "Lθ + pF = " + eq.lhs.toFixed(2) + " vs c = " + eq.rhs.toFixed(2);

  // update styles + popups for every grid layer
  gridLayers.forEach(function (g) {
    g.layer.eachLayer(function (lyr) {
      var feature = lyr.feature;
      lyr.setStyle(styleForCell(params, eq, feature));
      lyr.setPopupContent(popupHtml(g.name, params, eq, feature));
    });
  });
}

["L", "theta", "p", "F", "c"].forEach(function (id) {
  document.getElementById(id).addEventListener("input", renderUi);
});

renderUi();