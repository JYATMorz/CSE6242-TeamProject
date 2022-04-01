/**
 * source\la-county-neighborhoods-v6.geojson:
 * https://apps.gis.ucla.edu/geodata/dataset/los-angeles-county-neighborhoods
 */

const regionObj = {
    China: ["Shenzhen", "Shanghai"],
    USA: ["Atlanta", "Los Angeles"]
};
console.log(Object.keys(regionObj));

// enter code to define margin and dimensions for svg
const margin = { top: 20, right: 20, bottom: 20, left: 20 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// define any other global variables 
const pathToJSON = "..\data\la-county-neighborhoods-v6.geojson";

// import csv/json data
let region = {}, crimeData = [];
// const csvPromise = new Promise((resolve, reject) => {});
const jsonPromise = new Promise((resolve, reject) => {
    d3.json(pathToJSON)
        .then(temp => resolve(temp))
        .catch(err => reject("JSON\n" + err));
});
Promise.all([jsonPromise]).then(value => {
    region = value[0];
}).catch(err => {
    error = "Error in " + err;
}).then(() => ready(err, region, crimeData));

function ready(err, region, crimeData) {

}

// enter code to create color scale
const colorHue = ["#fee5d9", "#fcae91", "#fb6a4a", "#cb181d"];
const colorScale = d3.scaleQuantile().range(colorHue);
const legendColor = new Array(colorHue.length);
for (let i = 0; i < legendColor.length; i++) {
    legendColor[i] = { index: i, colorHex: colorHue[i] };
}

// enter code to control zoom
const zoomIn = d3.select("#zoom-in");
const zoomOut = d3.select("#zoom-out");
const slideRange = { min: 2, max: 8 }
const zoomSlide = d3.select("#zoom-slide")
    .property("min", slideRange.min)
    .property("max", slideRange.max);

zoomIn.on("click", function () {
    zoomLevel = zoomSlide.property("value");
    if (zoomLevel < slideRange.max) {
        zoomSlide.property("value", ++zoomLevel);
    }
    console.log("Call Zoom In Function Here");
});
zoomOut.on("click", function () {
    zoomLevel = zoomSlide.property("value");
    if (zoomLevel > slideRange.min) {
        zoomSlide.property("value", --zoomLevel);
    }
    console.log("Call Zoom Out Function Here");
});
zoomSlide.on("input", function () {
    console.log("Call Zoom Function Here");
});

// enter code to control region selection dropdown
const regionDropdown = d3.select("#location-select")

// enter code to create svg
const svg = d3.select("#svg-div").append("svg").attr("id", "svgGeoMap")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);
const gRegion = svg.append("g").attr("id", "svgGeoRegion")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");