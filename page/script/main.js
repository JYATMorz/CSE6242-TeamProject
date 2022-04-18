// Map created by:
// Data collected from: 

// Define constant variables.
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
const timeSlideRange = { min: new Date("2010"), max: new Date("2020") };
const selectedPath = { property: null, path: null, pointer: null };

// Link svg elements to variables
const svg = d3.select("#svg-div").append("svg").attr("id", "svgGeoMap");
const gRegion = svg.append("g").attr("id", "svgGeoRegion");

// define any other global variables 
const pathToJSON = "data/LA_County_Boundaries_rewind.geojson";
const pathToCrimeCSV = "data/crime_clean.csv";
const pathToHouseCSV = "data/house_price_clean.csv";
const pathToEmployCSV = "data/unemployment_clean.csv";
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
        updateAttr(d);
    });

// enter code to control zoom
const zoomIn = d3.select("#zoom-in").on("click", zoomInBtn);
const zoomOut = d3.select("#zoom-out").on("click", zoomOutBtn);
const zoomSlide = d3.select("#zoom-slide")
    .property("min", zoomSlideRange.min)
    .property("max", zoomSlideRange.max)
    .on("input", zoomRangeSlider);

// enter code to control time range
const timeSlide = d3.select("#time-slide")
    .property("max", 0)
    .property("min", 0);
const timeOutput = d3.select("#time-output").text("Please Select\nThe Location");
timeSlide.on("input", function () {
    if (timeSlide.property("max") !== timeSlide.property("min")) {
        timeSlideColor();
        timeOutput.text(outputStr());
        console.log("Call Time Selection Function Here");
    }
});

// enter code to control region selection dropdown
const regionDropdown = d3.select("#location-select");

// enter code to define projection and path required for Choropleth
const projection = d3.geoMercator();
const path = d3.geoPath().projection(projection);

// import csv/json data
const crimeCSVPromise = new Promise((resolve, reject) => {
    d3.dsv(",", pathToCrimeCSV, d => {
        return {
            year: parseInt(d["Year"]),
            crimeViolent: parseInt(d["Violent_sum"]),
            crimeProperty: parseInt(d["Property_sum"]),
            city: d["City"]
        };
    })
        .then(temp => resolve(temp))
        .catch(err => reject("CSV for Crime Data\n" + err));
});
const houseCSVPromise = new Promise((resolve, reject) => {
    d3.dsv(",", pathToHouseCSV, d => d)
        .then(temp => resolve(temp))
        .catch(err => reject("CSV for House Price Data\n" + err));
});
const employCSVPromise = new Promise((resolve, reject) => {
    d3.dsv(",", pathToEmployCSV, d => {
        return {
            city: d["City"],
            year: parseInt(d["Year"]),
            employ: parseFloat(d["Unemployment Rate"])
        }
    })
        .then(temp => resolve(temp))
        .catch(err => reject("CSV for Umployment Rate Data\n" + err));
});
const jsonPromise = new Promise((resolve, reject) => {
    d3.json(pathToJSON)
        .then(temp => resolve(temp))
        .catch(err => reject("JSON\n" + err));
});


let error = "", region, crimeTemp, houseTemp, employTemp, yearRange;
const chartData = {};
Promise.all([jsonPromise, crimeCSVPromise, houseCSVPromise, employCSVPromise])
    .then(value => {
        region = value[0];
        crimeTemp = value[1];
        houseTemp = value[2];
        employTemp = value[3];
    }).catch(err => {
        error = "Error in " + err;
    }).then(() => ready(error, region, crimeTemp, houseTemp, employTemp, regionNameObj));


function ready(error, region, crimeTemp, houseTemp, employTemp, regionNameObj) {
    if (error.length != 0) {
        console.log(error);
        alert(error);
    } else if (Object.keys(region).length == 0 || Object.keys(regionNameObj).length == 0) {
        console.log("Error:\nNo error in Promise.\nBut some data is empty!");
        alert("Error:\nNo error in Promise.\nBut some data is empty!");
    } else {
        crimeTemp.forEach(data => {
            if (!chartData.hasOwnProperty(data.city)) {
                chartData[data.city] = {};
            }
            if (!chartData[data.city].hasOwnProperty(data.year)) {
                chartData[data.city][data.year] = {};
            }
            chartData[data.city][data.year].violent = data.crimeViolent;
            chartData[data.city][data.year].property = data.crimeProperty;
        });
        houseTemp.columns.forEach(column => {
            if (column != "City") {
                houseTemp.forEach(data => {
                    chartData[data["City"]][column].house = parseInt(data[column]);
                });
            }
        });
        employTemp.forEach(data => {
            chartData[data.city][data.year].unemploy = data.employ;
        });
        yearRange = Object.keys(chartData[Object.keys(chartData)[0]]);
        // y-axis !!!
        // could redefine timeSlideRange{min, max} here

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
    const svgRect = svgPos();
    clearSVG(svgRect);
    const selectedRegion = this.options[this.selectedIndex].value;

    switch (selectedRegion) {
        case "Los Angeles":
            createMap(region, chartData);
            timeSlide.property("max", -1)
                .property("min", -findYearDiff(timeSlideRange.min, timeSlideRange.max))
                .property("value", -findYearDiff(timeSlideRange.min, timeSlideRange.max));
            timeOutput.text(outputStr());
            break;
        default:
            noData(svgRect);
            break;
    }
    svg.call(zoom.scaleTo, zoomSlide.property("value"));
}

function createMap(region, chartData) {
    const svgRect = svgPos();
    projection.fitSize([svgRect.svgWidth, svgRect.svgHeight], region);

    const regionFeatures = [...region.features];
    regionFeatures.forEach(feature => {
        feature.properties.selected = false;
        if (Object.keys(chartData).includes(feature.properties["CITY_NAME"])) {
            feature.properties.data = chartData[feature.properties["CITY_NAME"]];
        }
    });

    gRegion.selectAll("path")
        .data(regionFeatures).enter()
        .append("path")
        .attr("d", path)
        .attr("id", d => {
            if (d.properties["CITY_NAME"] == "Unincorporated") {
                return "gUnincorporated";
            } else {
                return "gRegion";
            }
        })
        .on("pointerover", mapPointerOver)
        .on("pointerout", mapPointerOut)
        .on("pointermove", mapPointerMove)
        .on("click", regionClicked);

    svg.call(zoom)
        .on("wheel.zoom", null)
        .on("dblclick.zoom", null);
}

function noData(svgRect) {
    svg.call(zoom.translateTo, svgRect.svgWidth / 2, svgRect.svgHeight / 2);
    gRegion.append("text")
        .attr("class", "notification-text")
        .attr("x", 0.5 * svgRect.svgWidth)
        .attr("y", 0.5 * svgRect.svgHeight)
        .text("No Data");
}

function clearSVG(svgRect) {
    titleDiv.style("display", null).text(null);
    removeTooltip(svgRect, 0, 0);
    gRegion.selectAll("path").remove();
    gRegion.selectAll("text").remove();
    timeSlide.property("max", 0).property("min", 0);
    timeSlideColor();
    timeOutput.text("Please Select\nThe Location");
    selectedPath.pointer = [svgRect.svgWidth / 2, svgRect.svgHeight / 2];
}

function updateAttr(d) {
    if (d.attrSelected) {
        // upadte chart !!!
        console.log(d);
        console.log("Update Information Box Using Given Object");
    }
}

function findYearDiff(startDate, endDate) {
    const startDateYear = startDate.getUTCFullYear();
    const endDateYear = endDate.getUTCFullYear();
    return endDateYear - startDateYear;
}

function findYearBefore(endDate, years) {
    const startYear = endDate.getUTCFullYear() + parseInt(years);
    const startDate = new Date(startYear.toString());
    return startDate;
}

function outputStr() {
    return "From "
        + findYearBefore(timeSlideRange.max, timeSlide.property("value")).getUTCFullYear()
        + "\nTo " + timeSlideRange.max.getUTCFullYear();
}

function timeSlideColor() {
    let value = 0;
    if (timeSlide.property("max") === timeSlide.property("min")) {
        value = 0;
    } else {
        value = (timeSlide.property("value") - timeSlide.property("min"))
            / (timeSlide.property("max") - timeSlide.property("min")) * 100;
    }
    const style = "linear-gradient(to right, azure " + value
        + "%, cadetblue " + value + "% 100%)";
    timeSlide.style("background", style);
}

function mapPointerOver(event, d) {
    // let textStr = d.properties.city.toString();
    // if (d.properties.isSegment) {
    //     textStr = textStr + ", " + d.properties["CITY_NAME"]
    // }
    titleDiv.style("display", "block").text(d.properties["CITY_NAME"]);
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
    if (d.properties.selected) {
        changeRegionColor(d, false);
        removeTooltip(svgRect, (x0 + x1) / 2, (y0 + y1) / 2);
    } else {
        if (selectedPath.path !== null) {
            changeRegionColor(d, false);
        }
        selectedPath.path = d3.select(this);
        selectedPath.property = d.properties;
        selectedPath.pointer = [(x0 + x1) / 2, (y0 + y1) / 2];
        changeRegionColor(d, true);
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
            tipDiv.text(d.properties["CITY_NAME"]);
            // add charts here !!!
        });
}

function changeRegionColor(d, boo) {
    if (boo) {
        if (d.properties["CITY_NAME"] == "Unincorporated") {
            selectedPath.path.raise().transition()
                .style("stroke-width", "1px")
                .style("fill", "darkslategray");
        } else {
            selectedPath.path.raise().transition()
                .style("stroke-width", "1px")
                .style("fill", "goldenrod");
        }
        selectedPath.property.selected = boo;
    } else {
        selectedPath.path.raise().transition()
            .style("stroke-width", null)
            .style("fill", null);
        selectedPath.property.selected = boo;
        selectedPath.path = null;
        selectedPath.property = null;
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

function zoomInBtn(event, d) {
    let zoomLevel = zoomSlide.property("value");
    if (zoomLevel < zoomSlideRange.max) {
        zoomSlide.property("value", ++zoomLevel);
        zoomMap(zoomLevel);
    }
}

function zoomOutBtn(event, d) {
    let zoomLevel = zoomSlide.property("value");
    if (zoomLevel > zoomSlideRange.min) {
        zoomSlide.property("value", --zoomLevel);
        zoomMap(zoomLevel);
    }
}

function zoomRangeSlider(event, d) {
    zoomMap(zoomSlide.property("value"));
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

function cityUpperCase(str) {
    let strArr = str.split("-");
    for (let i = 0; i < strArr.length; i++) {
        strArr[i] = strArr[i].slice(0, 1).toUpperCase() + strArr[i].slice(1).toLowerCase();
    }
    return strArr.join(" ");
}