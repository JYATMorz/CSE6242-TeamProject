// Map created by:
// Data collected from: 


// Define constant variables.
const regionNameObj = {
    China: ["Shenzhen", "Shanghai"],
    USA: ["Atlanta", "Los Angeles"]
};
const attrBtn = [
    { attrName: "Violent Crime", label: "violent" },
    { attrName: "Property Crime", label: "property" },
    { attrName: "House Price", label: "house" },
    { attrName: "Unemployment", label: "unemploy" },
    { attrName: "Education", label: "education" },
    { attrName: "Income Levels", label: "income" },
    { attrName: "Current Trend", label: "predict" }];
for (let i = 0; i < attrBtn.length; i++) {
    attrBtn[i].attrSelected = false;
};

let chartCreated = false;
const parseTime = d3.timeParse("%Y");
const zoomSlideRange = { min: 1, max: 6 };
const timeSlideRange = { min: parseTime("2010"), max: parseTime("2020") };
const chartTranslate = { y: 500 };
const selectedPath = { property: null, path: null, pointer: null };
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


// define any other global variables 
const pathToJSON = "data/LA_County_Boundaries_rewind.geojson";
const pathToCrimeCSV = "data/crime_clean.csv";
const pathToHouseCSV = "data/house_price_clean.csv";
const pathToEmployCSV = "data/unemployment_clean.csv";
const pathToEduCSV = "data/education.csv";
const pathToIncomeCSV = "data/income_and_poverty.csv";


// enter code to control region title & tip
const titleDiv = d3.select("#region-title");
const tipDiv = d3.select("#region-tip");
d3.select(window).on("resize", function () {
    const svgRect = svgPos();
    tipDiv
        .style("left", svgRect.svgLeft + svgRect.svgWidth * 0.3 + "px")
        .style("top", svgRect.svgTop + "px")
        .style("width", svgRect.svgWidth * 0.7 + "px")
        .style("height", svgRect.svgHeight + "px");

    xAxisScale.range([0, svgRect.svgWidth * 0.5]);
    gChart.attr("transform", "translate(" + svgRect.svgWidth * 0.1 + ", 500)");
    gXAxis.call(xAxis.scale(xMainAxisScale));

});


// Link svg elements to variables
const svgMap = d3.select("#svg-div").append("svg").attr("id", "svgGeoMap");
const gRegion = svgMap.append("g").attr("id", "gRegion");

const svgChart = tipDiv.append("svg").attr("id", "svgChart");
const gChart = svgChart.append("g").attr("class", "gChart");
const gLines = gChart.append("g").attr("class", "gLines");
const gXAxis = gChart.append("g").attr("class", "xAxis");
const gYAxisLeft = gChart.append("g").attr("class", "yAxis");
const gYAxisRight = gChart.append("g").attr("class", "yAxis");
const textChart = svgChart.append("text").attr("id", "textChartTitle").attr("x", "50%");


// enter code to control Attribute Buttons
const attrBtnGrid = d3.select("#attr-selection");
attrBtnGrid.selectAll("button")
    .data(attrBtn).enter()
    .append("button").attr("class", "navigator-bar")
    .attr("type", "button")
    .text(d => d.attrName)
    .classed("selectedBtn", d => d.attrSelected)
    .on("click", function (event, d) {
        d.attrSelected = !d.attrSelected;
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
        if (chartCreated) {
            xAxisScale.domain([
                findYearBefore(timeSlideRange.max, timeSlide.property("value")),
                timeSlideRange.max]);
            gXAxis.transition().call(xAxis.scale(xAxisScale));
            //!!! update lines value with new x-axis
        }
    }
});

// enter code to control region selection dropdown
const regionDropdown = d3.select("#location-select");

// enter code to define projection and path required for Choropleth
const projection = d3.geoMercator();
const path = d3.geoPath().projection(projection);

// enter code to init x-axis and y-axis
const xAxisScale = d3.scaleTime();
const xAxis = d3.axisBottom().ticks(d3.timeYear.every(1)).tickSizeOuter(0);
const yAxisScaleLeft = d3.scaleLinear().range([chartTranslate.y, 100]);
const yAxisScaleRight = d3.scaleLinear().range([chartTranslate.y, 100]);
const yAxisLeft = d3.axisLeft().tickSizeOuter(0);
const yAxisRight = d3.axisRight().tickSizeOuter(0);

// import csv/json data
const crimeCSVPromise = new Promise((resolve, reject) => {
    d3.dsv(",", pathToCrimeCSV, d => {
        return {
            year: parseInt(d["Year"]),
            violent: parseInt(d["Violent_sum"]),
            property: parseInt(d["Property_sum"]),
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
const eduCSVPromise = new Promise((resolve, reject) => {
    d3.dsv(",", pathToEduCSV, d => {
        return {
            year: parseInt(d["Year"]),
            high: parseFloat(d["high school graduate percentage"]),
            bachelor: parseFloat(d["bachelor percentage"])
        }
    })
        .then(temp => resolve(temp))
        .catch(err => reject("CSV for Education Data\n" + err));
});
const incomeCSVPromise = new Promise((resolve, reject) => {
    d3.dsv(",", pathToIncomeCSV, d => {
        return {
            year: parseInt(d["Year"]),
            income: parseInt(d["annual income"]),
            poverty: parseFloat(d["poverty rate"])
        }
    })
        .then(temp => resolve(temp))
        .catch(err => reject("CSV for Income Data\n" + err));
});
const jsonPromise = new Promise((resolve, reject) => {
    d3.json(pathToJSON)
        .then(temp => resolve(temp))
        .catch(err => reject("JSON\n" + err));
});
// handle csv/json data
let error = "", region, crimeTemp, houseTemp, employTemp, eduTemp, incomeTemp, yearRange;
const chartCityData = {};
const chartAllData = [];
Promise.all(
    [jsonPromise, crimeCSVPromise, houseCSVPromise, employCSVPromise, eduCSVPromise, incomeCSVPromise])
    .then(value => {
        region = value[0];
        crimeTemp = value[1];
        houseTemp = value[2];
        employTemp = value[3];
        eduTemp = value[4];
        incomeTemp = value[5];
    }).catch(err => {
        error = "Error in " + err;
    }).then(() =>
        ready(error, region, crimeTemp, houseTemp, employTemp, eduTemp, incomeTemp, regionNameObj)
    );


function ready(error, region, crimeTemp, houseTemp, employTemp, eduTemp, incomeTemp, regionNameObj) {
    if (error.length != 0) {
        console.log(error);
        alert(error);
    } else if (Object.keys(region).length == 0 || Object.keys(regionNameObj).length == 0) {
        console.log("Error:\nNo error in Promise.\nBut some data is empty!");
        alert("Error:\nNo error in Promise.\nBut some data is empty!");
    } else {
        // data set with city info
        getCrimeData("violent");
        getCrimeData("property");
        getHouseData();
        getUnemployData();

        // data set without city info
        getNoTimeData("high", eduTemp);
        getNoTimeData("bachelor", eduTemp);
        getNoTimeData("income", incomeTemp);
        getNoTimeData("poverty", incomeTemp);

        // Set up slider for Date Selection
        yearRange = [...houseTemp.columns];
        yearRange.splice(yearRange.indexOf("City"), 1).sort();
        timeSlideRange.min = parseTime(yearRange[0]);
        timeSlideRange.max = parseTime(yearRange[yearRange.length - 1]);

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

    function getCrimeData(keyType) {
        crimeTemp.forEach(data => {
            if (!chartCityData.hasOwnProperty(data.city)) {
                chartCityData[data.city] = [];
            }
            if (chartCityData[data.city].length == 0 || chartCityData[data.city][0].id !== keyType) {
                chartCityData[data.city].unshift({ id: keyType, elements: [] });
            }
            chartCityData[data.city][0].elements.unshift({ date: parseTime(data.year), value: data[keyType] });
            chartCityData[data.city][0].elements.sort((a, b) => a.date - b.date);
        });
    }

    function getHouseData() {
        houseTemp.forEach(data => {
            if (chartCityData[data["City"]][0].id !== "house") {
                chartCityData[data["City"]].unshift({ id: "house", elements: [] });
            }
            houseTemp.columns.forEach(year => {
                if (year !== "City") {
                    chartCityData[data["City"]][0].elements.unshift(
                        { date: parseTime(parseInt(year)), value: parseInt(data[year]) });
                    chartCityData[data["City"]][0].elements.sort((a, b) => a.date - b.date);
                }
            });
        });
    }

    function getUnemployData() {
        employTemp.forEach(data => {
            if (chartCityData[data.city][0].id !== "unemploy") {
                chartCityData[data.city].unshift({ id: "unemploy", elements: [] });
            }
            chartCityData[data.city][0].elements.unshift({ date: parseTime(data.year), value: data.employ });
            chartCityData[data.city][0].elements.sort((a, b) => a.date - b.date);
        });
    }

    function getNoTimeData(keyType, temp) {
        temp.forEach(data => {
            if (chartAllData.length == 0 || chartAllData[0].id !== keyType) {
                chartAllData.unshift({ id: keyType, elements: [] });
            }
            chartAllData[0].elements.unshift({ date: parseTime(data.year), value: data[keyType] });
            chartAllData[0].elements.sort((a, b) => a.date - b.date);
        });
    }
}

function dropdownChange(event, d) {
    const svgRect = svgPos();
    clearMapSVG(svgRect);
    const selectedRegion = this.options[this.selectedIndex].value;

    switch (selectedRegion) {
        case "Los Angeles":
            // set data for map regions
            const regionFeatures = [...region.features];
            regionFeatures.forEach(feature => {
                feature.properties.selected = false;
                if (Object.keys(chartCityData).includes(feature.properties["CITY_NAME"])) {
                    feature.properties.data =
                        chartCityData[feature.properties["CITY_NAME"]].concat(chartAllData);
                }
            });
            createMap(regionFeatures);
            timeSlide.property("max", -1)
                .property("min", -findYearDiff(timeSlideRange.min, timeSlideRange.max))
                .property("value", -findYearDiff(timeSlideRange.min, timeSlideRange.max));
            timeOutput.text(outputStr());
            break;
        default:
            noData(svgRect);
            break;
    }
    svgMap.call(zoom.scaleTo, zoomSlide.property("value"));

    function clearMapSVG(svgRect) {
        titleDiv.style("display", null).text(null);
        removeTooltip(svgRect, 0, 0);
        gRegion.selectAll("path").remove();
        gRegion.selectAll("text").remove();
        timeSlide.property("max", 0).property("min", 0);
        timeSlideColor();
        timeOutput.text("Please Select\nThe Location");
        selectedPath.pointer = [svgRect.svgWidth / 2, svgRect.svgHeight / 2];
    }
}

function createMap(regionFeatures) {
    // get SVG size and set Map size
    const svgRect = svgPos();
    projection.fitSize([svgRect.svgWidth, svgRect.svgHeight], region);

    // create map region
    gRegion.selectAll("path")
        .data(regionFeatures).enter()
        .append("path")
        .attr("d", path)
        .attr("id", d => {
            if (d.properties["CITY_NAME"] == "Unincorporated") {
                return "pathUnincorporated";
            } else { return "pathRegion"; }
        })
        .on("pointerover", mapPointerOver)
        .on("pointerout", mapPointerOut)
        .on("pointermove", mapPointerMove)
        .on("click", regionClicked);

    svgMap.call(zoom)
        .on("wheel.zoom", null)
        .on("dblclick.zoom", null);
}

function noData(svgRect) {
    svgMap.call(zoom.translateTo, svgRect.svgWidth / 2, svgRect.svgHeight / 2);
    gRegion.append("text")
        .attr("class", "notification-text")
        .attr("x", 0.5 * svgRect.svgWidth)
        .attr("y", 0.5 * svgRect.svgHeight)
        .text("No Data");
}

/**
 * update the charts based on the new btn selection AFTER the charts are created
 * @param {Object} d data in attrBtn that stored and passed to the attrBtnGrid
 */
function updateAttr(d) {
    console.log(d.label);
    if (d.attrSelected) {
        switch (d.label) {
            case "violent":
            case "property":
            case "unemploy":
                unClickBtn(["violent", "property", "unemploy"]);
                break;
            case "house": unClickBtn("house");
                break;
            case "education": unClickBtn("education");
                break;
            case "income": unClickBtn("income");
                break;
            default:
                break;
        }
    }
    attrBtnGrid.selectAll("button").classed("selectedBtn", d => d.attrSelected);
    // upadte chart !!! redraw chart

    /**
     * set unnnecessay button to unselected
     * @param {string | Array} type the string or array of the selected attr (group)
     */
    function unClickBtn(type) {
        if (Array.isArray(type)) {
            attrBtn.forEach(btn => {
                if (!type.includes(btn.label)) {
                    btn.attrSelected = false;
                }
            });
        } else {
            attrBtn.forEach(btn => {
                if (btn.label != type) {
                    btn.attrSelected = false;
                }
            });
        }
    }
}


function findYearDiff(startDate, endDate) {
    const startDateYear = startDate.getFullYear();
    const endDateYear = endDate.getFullYear();
    return endDateYear - startDateYear;
}

function findYearBefore(endDate, years) {
    const startYear = endDate.getFullYear() + parseInt(years);
    const startDate = parseTime(startYear.toString());
    return startDate;
}

function outputStr() {
    return "From "
        + findYearBefore(timeSlideRange.max, timeSlide.property("value")).getFullYear()
        + "\nTo " + timeSlideRange.max.getFullYear();
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
    svgMap.transition().duration(800)
        .call(zoom.transform, d3.zoomIdentity
            .translate(svgRect.svgWidth / 2, svgRect.svgHeight / 2)
            .scale(zoomSlide.property("value"))
            .translate(-centerX, -centerY));
    d3.select("body").style("overflow-x", "hidden");
    tipDiv.transition().duration(800)
        .style("transform", "translateX(800px)")
        .style("left", null).style("top", null)
        .style("width", null).style("height", null)
        .on("end", function () {
            tipDiv.style("display", null)
                .style("transform", null);
            d3.select("body").style("overflow-x", null);
        });
    removeAllChart();
}

function createTooltip(svgRect, centerX, centerY, regionData) {
    // move map center to left side of svgMap
    svgMap.transition().duration(800)
        .call(zoom.transform, d3.zoomIdentity
            .translate(svgRect.svgWidth * 0.15, svgRect.svgHeight / 2)
            .scale(zoomSlide.property("value"))
            .translate(-centerX, -centerY));

    // ease in tooltip (right to left)
    tipDiv.style("display", "block")
        .transition().duration(800)
        .style("left", svgRect.svgLeft + svgRect.svgWidth * 0.3 + "px")
        .style("top", svgRect.svgTop + "px")
        .style("width", svgRect.svgWidth * 0.7 + "px")
        .style("height", svgRect.svgHeight + "px")
        .on("end", function () {
            // create new charts when ease-in finish
            removeAllChart();
            if (regionData.properties["CITY_NAME"] == "Unincorporated") {
                textChart.attr("y", "50%")
                    .text(regionData.properties["CITY_NAME"] + ": No data for Unincorporated City");
            } else {
                let selectedBtn = attrBtn.filter(btn => btn.attrSelected);
                if (selectedBtn.length == 0) {
                    // show which city region is clicked
                    textChart.attr("y", "50%").text(regionData.properties["CITY_NAME"]);
                } else {
                    // show which city region is clicked
                    textChart.attr("y", "50px").text(regionData.properties["CITY_NAME"]);
                    // set the location of all charts
                    gChart.attr("transform",
                        "translate(" + svgRect.svgWidth * 0.1 + ", " + chartTranslate.y + ")");
                    //  and select data for creating chart
                    createChart(getChartData(selectedBtn, regionData), svgRect);
                }
            }
        });
}

function getChartData(selectedBtn, regionData) {
    let dataType = [];
    selectedBtn.forEach(btn => {
        if (btn.label == "education") { dataType.push(...["high", "bachelor"]); }
        else if (btn.label == "income") { dataType.push(...["income", "poverty"]); }
        else { dataType.push(btn.label); }
    });
    let data = [];
    regionData.properties.data.forEach(dataset => {
        let index = dataType.indexOf(dataset.id);
        if (index > -1) { data.push(dataset); }
    });
    return data;
}

function createChart(dataset, svgRect) {
    // prepare the lines
    const lines = gLines.selectAll("lines")
        .data(dataset).enter()
        .append("g");
    const lineLeft = d3.line();
    const lineRight = d3.line();

    // clean data
    let leftData = [], rightData = [];
    const leftTypeArr = ["violent", "property", "house", "high", "income"];
    const rightTypeArr = ["unemploy", "bachelor", "poverty"];
    dataset.forEach(data => {
        if (leftTypeArr.includes(data.id)) {
            leftData.push(data);
        } else if (rightTypeArr.includes(data.id)) {
            rightData.push(data);
        }
    });

    // set up axis scale
    if (leftData.length > 1) {
        yAxisScaleLeft.domain([
            Math.floor(0.95 * d3.min(leftData[0].elements.map(element => element.value)
                .concat(leftData[1].elements.map(element => element.value)))),
            Math.ceil(1.05 * d3.max(leftData[0].elements.map(element => element.value)
                .concat(leftData[1].elements.map(element => element.value))))
        ]);
    } else if (leftData.length == 1) {
        yAxisScaleLeft.domain([
            Math.floor(0.95 * d3.min(leftData[0].elements.map(element => element.value))),
            Math.ceil(1.05 * d3.max(leftData[0].elements.map(element => element.value)))
        ]);
    }

    // get path coordinates if relative data exists and draw axes
    xAxisScale.range([0, svgRect.svgWidth * 0.5]).domain([
        findYearBefore(timeSlideRange.max, timeSlide.property("value")),
        timeSlideRange.max
    ]);
    gXAxis.call(xAxis.scale(xAxisScale));

    if (leftData.length > 0) {
        lineLeft
            .x(function (d) { return xAxisScale(d.date); })
            .y(function (d) { return yAxisScaleLeft(d.value); });
        gYAxisLeft.call(yAxisLeft.scale(yAxisScaleLeft))
            .attr("transform", "translate(0, -" + chartTranslate.y + ")");
    }

    if (rightData.length > 0) {
        yAxisScaleRight.domain([
            Math.floor(0.95 * d3.min(rightData[0].elements.map(element => element.value))),
            Math.ceil(1.05 * d3.max(rightData[0].elements.map(element => element.value)))
        ]);
        lineRight
            .x(function (d) { return xAxisScale(d.date); })
            .y(function (d) { return yAxisScaleRight(d.value); });
        gYAxisRight.call(yAxisRight.scale(yAxisScaleRight))
            .attr("transform", "translate(" + svgRect.svgWidth * 0.5 + ", -" + chartTranslate.y + ")");
    }

    lines.append("path").attr("class", "line")
        .attr("transform", "translate(0, -" + chartTranslate.y + ")")
        .attr("d", function (d) {
            if (leftTypeArr.includes(d.id)) { return lineLeft(d.elements); }
            else if (rightTypeArr.includes(d.id)) { return lineRight(d.elements); }
        }).attr("class", d => {
            if (leftTypeArr.includes(d.id)) { return "lineLeft"; }
            else if (rightTypeArr.includes(d.id)) { return "lineRight"; }
        });

    chartCreated = true;
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
    const svgRect = svgMap.node().getBoundingClientRect();
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
        svgMap.transition().duration(500)
            .call(zoom.transform,
                d3.zoomIdentity
                    .translate(svgRect.svgWidth * 0.15, svgRect.svgHeight / 2)
                    .scale(zoomLevel)
                    .translate(-selectedPath.pointer[0], -selectedPath.pointer[1]));
    } else {
        svgMap.transition().call(zoom.scaleTo, zoomLevel);
    }
}

/**
 * Remove all elements in all "g" under all "svg" from "div #region-tip"
 */
function removeAllChart() {
    textChart.text(null);
    gXAxis.selectAll("*").remove();
    gYAxisLeft.selectAll("*").remove();
    gYAxisRight.selectAll("*").remove();
    gLines.selectAll("*").remove();
}
