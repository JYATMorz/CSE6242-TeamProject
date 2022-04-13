/**
 * source\la-county-neighborhoods-v6.geojson:
 * https://apps.gis.ucla.edu/geodata/dataset/los-angeles-county-neighborhoods
 */

const regionNameObj = {
    China: ["Shenzhen", "Shanghai"],
    USA: ["Atlanta", "Los Angeles"]
};
const attrBtn = new Array(5);
for (let i = 0; i < attrBtn.length; i++) {
    attrBtn[i] = {
        attrName: "Attrbute Type " + (i + 1),
        attrSelected: false
    };
};
const zoomSlideRange = { min: 2, max: 8 };
const timeSlideRange = { min: new Date("2010-01"), max: new Date("2020-12") };


// enter code to define margin and dimensions for svg
const margin = { top: 20, right: 20, bottom: 20, left: 20 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// define any other global variables 
const pathToJSON = "data/la-county-neighborhoods-v6.geojson";

// enter code to create color scale
const colorHue = ["#fee5d9", "#fcae91", "#fb6a4a", "#cb181d"];
const colorScale = d3.scaleQuantile().range(colorHue);
const legendColor = new Array(colorHue.length);
for (let i = 0; i < legendColor.length; i++) {
    legendColor[i] = { index: i, colorHex: colorHue[i] };
}

// enter code to control Attribute Buttons
const attrBtnList = d3.select("#attr-selection");
attrBtnList.selectAll("button")
    .data(attrBtn).enter()
    .append("button").attr("class", "navigator-bar")
    .attr("type", "button")
    .text(d => d.attrName)
    .classed("selectedBtn", d => d.attrSelected)
    .on("click", function (event, d) {
        d.attrSelected = !d.attrSelected;
        d3.select(this)
            .classed("selectedBtn", d.attrSelected);
        // call map update function here to select chosen Attribute(s)
        updateAttr(d);
    });

// enter code to control zoom
const zoomIn = d3.select("#zoom-in");
const zoomOut = d3.select("#zoom-out");
const zoomSlide = d3.select("#zoom-slide")
    .property("min", zoomSlideRange.min)
    .property("max", zoomSlideRange.max);

zoomIn.on("click", function () {
    zoomLevel = zoomSlide.property("value");
    if (zoomLevel < zoomSlideRange.max) {
        zoomSlide.property("value", ++zoomLevel);
    }
    console.log("Call Zoom In Function Here");
});
zoomOut.on("click", function () {
    zoomLevel = zoomSlide.property("value");
    if (zoomLevel > zoomSlideRange.min) {
        zoomSlide.property("value", --zoomLevel);
    }
    console.log("Call Zoom Out Function Here");
});
zoomSlide.on("input", function () {
    console.log("Call Zoom Function Here");
});

// enter code to control time range
const timeSlide = d3.select("#time-slide")
    .property("max", -1)
    .property("min", -findMonthDiff(timeSlideRange.min, timeSlideRange.max))
    .property("value", -findMonthDiff(timeSlideRange.min, timeSlideRange.max));
const timeOutput = d3.select("#time-output").text(outputStr());
timeSlide.on("input", function () {
    timeSlideColor();
    timeOutput.text(outputStr());
    console.log("Call Time Selection Function Here");
});

// enter code to control region selection dropdown
const regionDropdown = d3.select("#location-select");

// enter code to create svg
const svg = d3.select("#svg-div").append("svg").attr("id", "svgGeoMap")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom);
const gRegion = svg.append("g").attr("id", "svgGeoRegion")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// enter code to define projection and path required for Choropleth
const projection = d3.geoAlbers();
const path = d3.geoPath(projection);

// import csv/json data
let error = "", region = {}, crimeData = [];
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
}).then(() => ready(error, region, crimeData, regionNameObj));

function ready(error, region, crimeData, regionNameObj) {
    if (error.length != 0) {
        console.log(error);
        alert(error);
    } else if (Object.keys(region).length == 0 || Object.keys(regionNameObj).length == 0) {
        console.log("Error:\nNo error in Promise.\nBut some data is empty!");
        alert("Error:\nNo error in Promise.\nBut some data is empty!");
    } else {
        // enter code to extract all datas from crimeData

        // enter code to append the region options to the dropdown
        regionDropdown.selectAll("optgroup")
            .data(Object.keys(regionNameObj)).enter()
            .append("optgroup").attr("class", "region-select")
            .attr("label", d => d);
        for (let country in regionNameObj) {
            if (Object.hasOwnProperty.call(regionNameObj, country)) {
                let regionArr = regionNameObj[country];
                regionDropdown.selectAll("optgroup")
                    .filter((d, i) => d == country)
                    .selectAll("option")
                    .data(regionArr).enter()
                    .append("option").attr("class", "region-select")
                    .attr("value", d => d)
                    .text(d => d);
            }
        }
        // event listener for the dropdown. 
        // Update geoMap when selection changes.
        regionDropdown.on("change", function () {
            selectedRegion = this.options[this.selectedIndex].value;
            createMap(region, crimeData, selectedRegion);
        });
    }
}

function createMap(region, crimeData, selectedRegion) {
    gRegion.selectAll("path").remove();
    gRegion.selectAll("text").remove();
    if (selectedRegion != "Los Angeles") {
        gRegion.append("text")
            .attr("class", "notification-text")
            .attr("x", 0.5 * width)
            .attr("y", 0.5 * height)
            .text("No Data");
    } else {
        projection.fitSize([width, height], region);
        gRegion.selectAll("path")
            .data(region.features).enter()
            .append("path")
            .attr("d", path)
            .attr("stroke-width", "0.2px")
            .attr("stroke", "white")
            .attr("fill", "gray")
            .on("mouseover", function (event, d) { // changed in d3.js v6 ↓
                d3.select(this).raise()
                    .attr("fill", "lightgray")
            }).on("mouseout", function (event, d) { // ↑ (replaced data, index, element)
                d3.select(this).raise()
                    .attr("fill", "gray")
            });
    }
}

function updateAttr(attrBtnObj) {
    console.log(attrBtnObj);
    console.log("Update Information Box Using Given Object");
}

function findMonthDiff(startDate, endDate) {
    startDateMonths = startDate.getUTCFullYear() * 12 + startDate.getUTCMonth();
    endDateMonths = endDate.getUTCFullYear() * 12 + endDate.getUTCMonth();
    return endDateMonths - startDateMonths;
}

function findMonthAfter(endDate, months) {
    let startYear = endDate.getUTCFullYear() + parseInt(months / 12);
    let startMonth = endDate.getUTCMonth() + months % 12;
    let startDate = new Date(Date.UTC(startYear, startMonth));
    return startDate;
}

function dateToString(date) {
    return date.getUTCFullYear() + "-"
        + String(date.getUTCMonth() + 1).padStart(2, "0");
}

function outputStr() {
    return "From "
        + dateToString(findMonthAfter(timeSlideRange.max, timeSlide.property("value")))
        + "\nTo " + dateToString(timeSlideRange.max);
}

function timeSlideColor() {
    let value = (timeSlide.property("value") - timeSlide.property("min") + 1)
        / (timeSlide.property("max") - timeSlide.property("min") + 1) * 100;
    let style = "linear-gradient(to right, azure " + value
        + "%, cadetblue " + value + "% 100%)";
    timeSlide.style("background", style);
}