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
const zoomSlideRange = { min: 1, max: 6 };
const timeSlideRange = { min: new Date("2010-01"), max: new Date("2020-12") };
const selectedPath = { selected: null, path: null, pointer: null };

// enter code to create svg
const svg = d3.select("#svg-div").append("svg").attr("id", "svgGeoMap");
const gRegion = svg.append("g").attr("id", "svgGeoRegion");

// define any other global variables 
const pathToJSON = "data/la-county-neighborhoods-v6.geojson";
const pathToCSV = "data/crime_clean_v1.0.csv";
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

// enter code to control region title & tip
const titleDiv = d3.select("#region-title");
const tipDiv = d3.select("#region-tip");
d3.select(window).on("resize", function () {
    const svgRect = svgPos();
    tipDiv
        .style("left", svgRect.svgLeft + svgRect.svgWidth / 2 + "px")
        .style("top", svgRect.svgTop + "px")
        .style("width", svgRect.svgWidth / 2 + "px")
        .style("height", svgRect.svgHeight + "px");
});

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

zoomIn.on("click", function (event, d) {
    let zoomLevel = zoomSlide.property("value");
    if (zoomLevel < zoomSlideRange.max) {
        zoomSlide.property("value", ++zoomLevel);
        zoomMap(zoomLevel);
    }
});
zoomOut.on("click", function (event, d) {
    let zoomLevel = zoomSlide.property("value");
    if (zoomLevel > zoomSlideRange.min) {
        zoomSlide.property("value", --zoomLevel);
        zoomMap(zoomLevel);
    }
});
zoomSlide.on("input", function (event, d) {
    let zoomLevel = zoomSlide.property("value");
    zoomMap(zoomLevel);
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

// enter code to define projection and path required for Choropleth
const projection = d3.geoAlbers();
const path = d3.geoPath(projection);

// import csv/json data
const csvPromise = new Promise((resolve, reject) => {
    d3.dsv(",", pathToCSV, d => {
        return;
        // data configuration here
    })
        .then(temp => resolve(temp))
        .catch(err => reject("CSV\n" + err));
});
const jsonPromise = new Promise((resolve, reject) => {
    d3.json(pathToJSON)
        .then(temp => resolve(temp))
        .catch(err => reject("JSON\n" + err));
});


let error = "", region = {}, crimeData = [];
Promise.all([jsonPromise, csvPromise]).then(value => {
    region = value[0];
    // crimeData = value[1];
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

        // console.log(new Set(crimeData));

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

function dropdownChange(event, d) {
    const selectedRegion = this.options[this.selectedIndex].value;
    gRegion.selectAll("path").remove();
    gRegion.selectAll("text").remove();
    switch (selectedRegion) {
        case "Los Angeles":
            createMap(region, crimeData);
            break;
        default:
            noData();
            break;
    }
    svg.call(zoom.scaleTo, zoomSlide.property("value"));
}

function createMap(region, crimeData) {
    const svgRect = svgPos();
    projection.fitSize([svgRect.svgWidth, svgRect.svgHeight], region);

    const regionFeatures = [...region.features];
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
        .classed("selectedRegion", false)
        .on("pointerover", mapPointerOver)
        .on("pointerout", mapPointerOut)
        .on("pointermove", mapPointerMove)
        .on("click", regionClicked);

    svg.call(zoom)
        .on("wheel.zoom", null)
        .on("dblclick.zoom", null);
}

function noData() {
    const svgRect = svgPos();
    gRegion.append("text")
        .attr("class", "notification-text")
        .attr("x", 0.5 * svgRect.svgWidth)
        .attr("y", 0.5 * svgRect.svgHeight)
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
    const startYear = endDate.getUTCFullYear() + parseInt(months / 12);
    const startMonth = endDate.getUTCMonth() + months % 12;
    const startDate = new Date(Date.UTC(startYear, startMonth));
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
    const value = (timeSlide.property("value") - timeSlide.property("min") + 1)
        / (timeSlide.property("max") - timeSlide.property("min") + 1) * 100;
    const style = "linear-gradient(to right, azure " + value
        + "%, cadetblue " + value + "% 100%)";
    timeSlide.style("background", style);
}

function mapPointerOver(event, d) {
    titleDiv.style("display", "block").text(d.properties.name);
}

function mapPointerOut(event, d) {
    titleDiv.style("display", null).text(null);
}

function mapPointerMove(event, d) {
    const coordinate = d3.pointer(event, d3.select("body"));
    const title = {
        x: coordinate[0] - 30 + "px",
        y: coordinate[1] - 50 + "px"
    }
    titleDiv.style("left", title.x).style("top", title.y);
}

function regionClicked(event, d) {
    const [[x0, y0], [x1, y1]] = path.bounds(d);
    const svgRect = svgPos();
    if (d.values.selected) {
        changeRegionColor(false);
        removeTooltip(svgRect, (x0 + x1) / 2, (y0 + y1) / 2);
    } else {
        if (selectedPath.path !== null) {
            changeRegionColor(false);
        }
        selectedPath.path = d3.select(this);
        selectedPath.selected = d.values;
        selectedPath.pointer = [(x0 + x1) / 2, (y0 + y1) / 2];
        changeRegionColor(true);
        createTooltip(svgRect, (x0 + x1) / 2, (y0 + y1) / 2, d);
    }
}

function removeTooltip(svgRect, centerX, centerY) {
    svg.transition().duration(800)
        .call(zoom.transform, d3.zoomIdentity
            .translate(svgRect.svgWidth / 2, svgRect.svgHeight / 2)
            .scale(zoomSlide.property("value"))
            .translate(-centerX, -centerY));
    d3.select("body").style("overflow-x", "hidden");
    tipDiv.text(null)
        .transition().duration(800)
        .style("transform", "translateX(800px)")
        .style("left", null).style("top", null)
        .style("width", null).style("height", null)
        .on("end", function () {
            tipDiv.style("display", null)
                .style("transform", null);
            d3.select("body").style("overflow-x", null);
        });
}

function createTooltip(svgRect, centerX, centerY, d) {
    svg.transition().duration(800)
        .call(zoom.transform, d3.zoomIdentity
            .translate(svgRect.svgWidth / 4, svgRect.svgHeight / 2)
            .scale(zoomSlide.property("value"))
            .translate(-centerX, -centerY));
    tipDiv.style("display", "block")
        .transition().duration(800)
        .style("left", svgRect.svgLeft + svgRect.svgWidth / 2 + "px")
        .style("top", svgRect.svgTop + "px")
        .style("width", svgRect.svgWidth / 2 + "px")
        .style("height", svgRect.svgHeight + "px")
        .on("end", function () {
            tipDiv.text(d.properties.name);
            // add charts here !!!
        });
}

function changeRegionColor(boo) {
    if (boo) {
        selectedPath.path.raise().transition()
            .style("stroke-width", "1px")
            .style("fill", "goldenrod");
        selectedPath.selected.selected = boo;
    } else {
        selectedPath.path.raise().transition()
            .style("stroke-width", null)
            .style("fill", null);
        selectedPath.selected.selected = boo;
        selectedPath.path = null;
        selectedPath.selected = null;
    }
}

function svgPos() {
    const svgRect = svg.node().getBoundingClientRect();
    return {
        svgLeft: svgRect.x + window.scrollX,
        svgTop: svgRect.y + window.scrollY,
        svgWidth: svgRect.width,
        svgHeight: svgRect.height
    };
}

function zoomed({ transform }) {
    gRegion.attr("transform", transform);
}

function zoomMap(zoomLevel) {
    if (selectedPath.path !== null) {
        const svgRect = svgPos();
        svg.transition().duration(500)
            .call(zoom.transform,
                d3.zoomIdentity
                    .translate(svgRect.svgWidth / 4, svgRect.svgHeight / 2)
                    .scale(zoomLevel)
                    .translate(-selectedPath.pointer[0], -selectedPath.pointer[1]));
    } else {
        svg.transition().call(zoom.scaleTo, zoomLevel);
    }
}
