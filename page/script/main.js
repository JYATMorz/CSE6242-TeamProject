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
let selectedPath = { selectedValue: null, path: null };

// enter code to define margin and dimensions for svg
const margin = { top: 20, right: 20, bottom: 20, left: 20 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// define any other global variables 
const pathToJSON = "data/la-county-neighborhoods-v6.geojson";
const pathToCSV = "";
const zoom = d3.zoom()
    .scaleExtent([zoomSlideRange.min, zoomSlideRange.max])
    .on("zoom", zoomed);

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
        d3.select(this).classed("selectedBtn", d.attrSelected);
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
    svg.transition().call(zoom.scaleBy, 1.25);
});
zoomOut.on("click", function () {
    zoomLevel = zoomSlide.property("value");
    if (zoomLevel > zoomSlideRange.min) {
        zoomSlide.property("value", --zoomLevel);
    }
    console.log("Call Zoom Out Function Here");
    svg.transition().call(zoom.scaleBy, 0.8);
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
const translateStr = "translate(" + margin.left + "," + margin.top + ")";
const gRegion = svg.append("g").attr("id", "svgGeoRegion")
    .attr("transform", translateStr);

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
        regionDropdown.on("change", dropdownChange);
    }
}

function regionClicked(event, d) {
    if (d.values.selected) {
        changeRegionColor(false);
    } else {
        if (selectedPath.path !== null) {
            changeRegionColor(false);
        }
        selectedPath.path = d3.select(this);
        selectedPath.selectedValue = d.values;
        changeRegionColor(true);
    }
}

function changeRegionColor(boo) {
    if (boo) {
        selectedPath.path.raise().transition().style("fill", "goldenrod");
    } else {
        selectedPath.path.raise().transition().style("fill", null);
    }
    selectedPath.selectedValue.selected = boo;
}

function dropdownChange(event, d) {
    let selectedRegion = this.options[this.selectedIndex].value;
    gRegion.selectAll("path").remove();
    gRegion.selectAll("text").remove();
    svg.call(
        zoom.transform,
        d3.zoomIdentity,
        d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
    );
    switch (selectedRegion) {
        case "Los Angeles":
            createMap(region, crimeData);
            break;
        default:
            noData();
            break;
    }
}

function createMap(region, crimeData) {
    projection.fitSize([width, height], region);

    let regionFeatures = [...region.features];
    regionFeatures.forEach(feature => {
        feature.values = {
            selected: false
            // more crime data here
        };
    });

    gRegion.selectAll("path")
        .data(regionFeatures).enter()
        .append("path")
        .attr("d", path)
        .attr("id", "gRegion")
        .attr("fill", "gray")
        .on("mouseover", mapMouseOver)
        .on("mouseout", mapMouseOut)
        .on("click", regionClicked);

    svg.call(zoom)
        .on("wheel.zoom", null);
}

function noData() {
    gRegion.append("text")
        .attr("class", "notification-text")
        .attr("x", 0.5 * width)
        .attr("y", 0.5 * height)
        .text("No Data");
}

function updateAttr(attrBtnObj) {
    if (attrBtnObj.attrSelected) {
        console.log(attrBtnObj);
        console.log("Update Information Box Using Given Object");
    }
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

function mapMouseOver(event, d) {
    d3.select(this).raise().attr("fill", "lightgray");
}

function mapMouseOut(event, d) {
    d3.select(this).raise().attr("fill", "gray");
}

function zoomed({ transform }) {
    gRegion.attr("transform", translateStr + " " + transform);
}