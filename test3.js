// =====================
// Map
// =====================
var map = L.map("map").setView([20.82, -156.35], 11);
// Default basemap
var osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// =====================
// Basemap switcher
// =====================
function addBasemapSwitcher(map) {
  var mapboxAccessToken = 'pk.eyJ1IjoibWF4d2hpdGVob3VzZSIsImEiOiJjbG9peW9nY3UxZTN5MnJvMWV2ZGVxZ3VqIn0.a8iEZsSCZA7IP7mtskj4TQ';

  var basemaps = {
    'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }),

    'Stamen Terrain': L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/outdoors-v11/tiles/256/{z}/{x}/{y}@2x?access_token=' + mapboxAccessToken, {
      tileSize: 256,
      zoomOffset: 0,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery &copy; <a href="https://www.mapbox.com/">Mapbox</a>'
    }),

    'Esri World Imagery': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }),

    'Custom Mapbox Style': L.tileLayer('https://api.mapbox.com/styles/v1/maxwhitehouse/clonh3vft003t01r7667peoxu/tiles/256/{z}/{x}/{y}@2x?access_token=' + mapboxAccessToken, {
      tileSize: 256,
      zoomOffset: 0,
      attribution: '@MaxWhitehouse'
    }),

    'Mapbox Satellite': L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v11/tiles/256/{z}/{x}/{y}@2x?access_token=' + mapboxAccessToken, {
      tileSize: 256,
      zoomOffset: 0,
      attribution: 'Imagery &copy; <a href="https://www.mapbox.com/">Mapbox</a>'
    }),

    'Mapbox Streets': L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/256/{z}/{x}/{y}@2x?access_token=' + mapboxAccessToken, {
      tileSize: 256,
      zoomOffset: 0,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery &copy; <a href="https://www.mapbox.com/">Mapbox</a>'
    }),

    'Mapbox Dark': L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/dark-v10/tiles/256/{z}/{x}/{y}@2x?access_token=' + mapboxAccessToken, {
      tileSize: 256,
      zoomOffset: 0,
      attribution: 'Imagery &copy; <a href="https://www.mapbox.com/">Mapbox</a>'
    }),

    'MtbMap': L.tileLayer('https://tile.mtbmap.cz/mtbmap_tiles/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &amp; USGS'
    })
  };

  L.control.layers(basemaps).addTo(map);
}

addBasemapSwitcher(map);

// =====================
// Grid group
// =====================
var gridsGroup = L.layerGroup().addTo(map);

var gridParams = {
  "Lahaina": { L: 100, theta: 0.25, p: 0.30, F: 150, c: 120 },
  "Waiohuli": { L: 100, theta: 0.25, p: 0.30, F: 150, c: 120 },
  "Kahului": { L: 100, theta: 0.25, p: 0.30, F: 150, c: 120 }
};

function equilibrium(params) {
  var lhs = params.L * params.theta + params.p * params.F;

  return {
    comply: lhs > params.c,
    lhs: lhs
  };
}

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

  return turf.featureCollection(grid.features.slice(0, 9));
}

var centers = [
  { name: "Lahaina", lonlat: [-156.675913, 20.881157], uiId: "lahaina-ui" },
  { name: "Waiohuli", lonlat: [-156.351146, 20.730348], uiId: "Waiohuli-ui" },
  { name: "Kahului", lonlat: [-156.46786, 20.88071], uiId: "kahului-ui" }
];

var gridLayers = {};

centers.forEach(function (c) {
  var grid = build3x3Grid(c.lonlat, 0.3, "miles");

  var layer = L.geoJSON(grid, {
    style: function () {
      var eq = equilibrium(gridParams[c.name]);

      return {
        color: "#000",
        weight: 2,
        fillOpacity: 0.35,
        fillColor: eq.comply ? "#4CAF50" : "#E53935"
      };
    },

    onEachFeature: function (feature, lyr) {
      lyr.on("click", function () {
        document.querySelectorAll(".ui-box").forEach(function (el) {
          el.style.display = "none";
        });

        document.getElementById(c.uiId).style.display = "block";
      });

      var params = gridParams[c.name];
      var eq = equilibrium(params);

      lyr.bindPopup(
        "<b>" + c.name + "</b><br>" +
        "Lθ + pF = " + eq.lhs.toFixed(2) + "<br>" +
        "c = " + params.c + "<br>" +
        "<b>Equilibrium: " + (eq.comply ? "(C,C)" : "(N,N)") + "</b>"
      );
    }
  }).addTo(gridsGroup);

  gridLayers[c.name] = layer;
});

function renderGrid(name) {
  var params = gridParams[name];
  var eq = equilibrium(params);

  gridLayers[name].eachLayer(function (layer) {
    layer.setStyle({
      color: "#000",
      weight: 2,
      fillOpacity: 0.35,
      fillColor: eq.comply ? "#4CAF50" : "#E53935"
    });

    layer.setPopupContent(
      "<b>" + name + "</b><br>" +
      "Lθ + pF = " + eq.lhs.toFixed(2) + "<br>" +
      "c = " + params.c + "<br>" +
      "<b>" + (eq.comply ? "(C,C)" : "(N,N)") + "</b>"
    );
  });

  if (name === "Lahaina") {
    document.getElementById("lahaina-status").innerHTML =
      "<b>" + (eq.comply ? "Compliance equilibrium" : "Non-compliance equilibrium") + "</b>";
  }

  if (name === "Waiohuli") {
    document.getElementById("Waiohuli-status").innerHTML =
      "<b>" + (eq.comply ? "Compliance equilibrium" : "Non-compliance equilibrium") + "</b>";
  }

  if (name === "Kahului") {
    document.getElementById("kahului-status").innerHTML =
      "<b>" + (eq.comply ? "Compliance equilibrium" : "Non-compliance equilibrium") + "</b>";
  }
}

// Lahaina sliders
["L", "theta", "p", "F", "c"].forEach(function (param) {
  var id = "Lahaina-" + param;
  var slider = document.getElementById(id);
  var label = document.getElementById(id + "-val");

  label.textContent = slider.value;

  slider.addEventListener("input", function () {
    gridParams["Lahaina"][param] = +this.value;
    label.textContent = this.value;
    renderGrid("Lahaina");
  });
});

// East of Kihei sliders
["L", "theta", "p", "F", "c"].forEach(function (param) {
  var id = "Waiohuli-" + param;
  var slider = document.getElementById(id);
  var label = document.getElementById(id + "-val");

  label.textContent = slider.value;

  slider.addEventListener("input", function () {
    gridParams["Waiohuli"][param] = +this.value;
    label.textContent = this.value;
    renderGrid("Waiohuli");
  });
});

// Kahului sliders
["L", "theta", "p", "F", "c"].forEach(function (param) {
  var id = "Kahului-" + param;
  var slider = document.getElementById(id);
  var label = document.getElementById(id + "-val");

  label.textContent = slider.value;

  slider.addEventListener("input", function () {
    gridParams["Kahului"][param] = +this.value;
    label.textContent = this.value;
    renderGrid("Kahului");
  });
});

function zoomToGrid(name){

  if(!gridLayers[name]) return;
  
  var bounds = gridLayers[name].getBounds();
  
  map.fitBounds(bounds, {
  padding:[40,40]
  });
  
  }
renderGrid("Lahaina");
renderGrid("Waiohuli");
renderGrid("Kahului");

// =====================
// Intro / tutorial modal
// =====================
function openIntroModal() {
  document.getElementById("intro-modal").style.display = "flex";
}

function closeIntroModal() {
  document.getElementById("intro-modal").style.display = "none";
}

document.getElementById("close-intro").addEventListener("click", closeIntroModal);
document.getElementById("help-button").addEventListener("click", openIntroModal);

// show modal when page loads
openIntroModal();

// =====================
// Step 2 tutorial popup
// =====================
function showControlsTutorial(){

  var tutorialPopup = L.popup({
    closeButton: true,
    autoClose: false,
    closeOnClick: false,
    maxWidth: 300
  })
  .setLatLng([20.83, -156.42])
  .setContent(
    "<b>Map Controls</b><br><br>" +
    "• Use the <b>basemap switcher</b> in the top right to change the map style.<br><br>" +
    "• Use the <b>zoom buttons</b> to quickly navigate to Lahaina, Waiohuli, or Kahului.<br><br>" +
    "• Click any grid to open the model controls."
  )
  .openOn(map);

}

document.getElementById("close-intro").addEventListener("click", function(){
  closeIntroModal();
  showControlsTutorial();
});