/**
 * @file Data Visualization Webpage for CSE-6242 Team Project
 * @author Huang Zili
 * @link Github Repository: https://github.com/JYATMorz/CSE6242-TeamProject
 * @link Original LA County Map geojson: https://hub.arcgis.com/datasets/lacounty::la-county-city-boundaries/about
 * @link Geojson Rewind: https://observablehq.com/@bumbeishvili/rewind-geojson
 */

// define global constant variables.
const chartInfo = { chartCreated: false, chartData: null };
const regionNameObj = {
    China: ["Shenzhen", "Shanghai"],
    USA: ["Fulton County", "Los Angeles County"]
};
// Attribute should be displayed on the buttons
const attrBtn = [
    { attrName: "Violent Crime", label: "violent" },
    { attrName: "Property Crime", label: "property" },
    { attrName: "House Price", label: "house" },
    { attrName: "Unemployment", label: "unemploy" },
    { attrName: "Education", label: "education" },
    { attrName: "Income Levels", label: "income" }];
for (let i = 0; i < attrBtn.length; i++) {
    attrBtn[i].attrSelected = false;
};
// Attribute should be displayed on the left axis
const leftTypeArr = {
    "violent": ["Numbers of Crimes", "Violent Crime"],
    "property": ["Numbers of Crimes", "Property Crime"],
    "house": ["House Price", "Average House Price"],
    "income": ["Average Income", "Average Income"]
};
// Attribute should be displayed on the right axis
const rightTypeArr = {
    "unemploy": ["Unemployment Rate", "Unemployment Rate"],
    "high": ["Graduation Rate", "High School Graduation Rate"],
    "bachelor": ["Graduation Rate", "Undergraduate Graduation Rate"],
    "poverty": ["Poverty Rate", "Poverty Rate"]
};
const parseTime = d3.timeParse("%Y");
const zoomSlideRange = { min: 1, max: 6 };
const timeSlideRange = { min: parseTime("2010"), max: parseTime("2020") };
const chartTranslate = { y: 500, top: 100 };
const selectedPath = { property: null, path: null, pointer: null };
const zoom = d3.zoom()
    .scaleExtent([zoomSlideRange.min, zoomSlideRange.max])
    .on("zoom", zoomed);


// define csv/json files path 
const pathToJSON = "data/LA_County_Boundaries_rewind.geojson";
const pathToCrimeCSV = "data/crime_clean.csv";
const pathToHouseCSV = "data/house_price_clean.csv";
const pathToEmployCSV = "data/unemployment_clean.csv";
const pathToEduCSV = "data/education.csv";
const pathToIncomeCSV = "data/income_and_poverty.csv";


// enter code to control region title & tip
const regionTipDiv = d3.select("#region-tip");
const regionChartDiv = d3.select("#region-chart");
const chartTipDiv = d3.select("#chart-tip");


// Link svg elements to variables: Map Elements
const svgMap = d3.select("#svg-div").append("svg").attr("id", "svgGeoMap");
const gRegion = svgMap.append("g").attr("id", "gRegion");
// Link svg elements to variables: Chart Elements
const svgChart = regionChartDiv.append("svg").attr("id", "svgChart");
const gChart = svgChart.append("g").attr("class", "gChart");
const gLines = gChart.append("g").attr("class", "gLines");
const gXAxis = gChart.append("g").attr("class", "axis");
const gYAxisLeft = gChart.append("g").attr("class", "axis");
const gYAxisRight = gChart.append("g").attr("class", "axis");
const textChart = svgChart.append("text").attr("id", "textChartTitle").attr("x", "50%");


// enter code to control Attribute Buttons
const attrBtnGrid = d3.select("#attr-selection");
attrBtnGrid.selectAll("button")
    .data(attrBtn).enter()
    .append("button").attr("class", "navigator-bar")
    .attr("type", "button")
    .text(d => d.attrName)
    .classed("selectedBtn", d => d.attrSelected)
    .on("click", (event, d) => {
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
        if (chartInfo.chartCreated) {
            xAxisScale.domain([
                findYearBefore(timeSlideRange.max, timeSlide.property("value")),
                timeSlideRange.max]);
            gXAxis.transition().duration(500).call(xAxis.scale(xAxisScale));
            refreshChart(chartInfo.chartData, svgPos());
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
const yAxisScaleLeft = d3.scaleLinear().range([chartTranslate.y, chartTranslate.top]);
const yAxisScaleRight = d3.scaleLinear().range([chartTranslate.y, chartTranslate.top]);
const yAxisLeft = d3.axisLeft().tickSizeOuter(0);
const yAxisRight = d3.axisRight().tickSizeOuter(0);

// change eery size or position when the browser size change to fit the new window
d3.select(window).on("resize", function () {
    const svgRect = svgPos();
    regionChartDiv
        .style("left", svgRect.svgLeft + svgRect.svgWidth * 0.3 + "px")
        .style("top", svgRect.svgTop + "px")
        .style("width", svgRect.svgWidth * 0.7 + "px")
        .style("height", svgRect.svgHeight + "px");

    if (chartInfo.chartCreated) {
        refreshChart(chartInfo.chartData, svgRect);
    }
});


// use Promise to import csv/json data
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
// handle csv/json data for visualization
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

/**
 * turn data from csv/json files to usable data for d3 and be ready for data binding
 * @param {string} error error(s) occured in Promise
 * @param {Object} region region data from geojson file
 * @param {Array} crimeTemp crime data from csv file
 * @param {Array} houseTemp house price data from csv file
 * @param {Array} employTemp unemployment rate data from csv file
 * @param {Array} eduTemp education rate data from csv file
 * @param {Array} incomeTemp average income and poverty rate data from csv file
 * @param {Object} regionNameObj regions displayed in drop-down input
 */
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

    /**
     * clean the crime(violent/property) data and store in chartCityData
     * @param {string} keyType "violent" or "property"
     */
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

    /**
     * clean the house price data and store in chartCityData
     */
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

    /**
     * clean the unemployment rate data and store in chartCityData
     */
    function getUnemployData() {
        employTemp.forEach(data => {
            if (chartCityData[data.city][0].id !== "unemploy") {
                chartCityData[data.city].unshift({ id: "unemploy", elements: [] });
            }
            chartCityData[data.city][0].elements.unshift({ date: parseTime(data.year), value: data.employ });
            chartCityData[data.city][0].elements.sort((a, b) => a.date - b.date);
        });
    }

    /**
     * clean the data without region information and store in chartAllData
     * @param {string} keyType "income"/"poverty"/"hight"/"bachelor"
     * @param {Array} temp 'keyType' data
     */
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

/**
 * draw the map area with map or text according to the drop-down value when drop-down change
 * @param {object} event HTML DOM event: change
 * @param {object} d data bined with the drop-down input
 */
function dropdownChange(event, d) {
    const svgRect = svgPos();
    clearMapSVG(svgRect);
    const selectedRegion = this.options[this.selectedIndex].value;

    switch (selectedRegion) {
        case "Los Angeles County":
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

    /**
     * turn the page to the initial state, including svgMap, regionTip and sliderOutput
     * @param {object} svgRect the size and location of the svgMap
     */
    function clearMapSVG(svgRect) {
        regionTipDiv.style("display", null).text(null);
        removeTooltip(svgRect, 0, 0);
        gRegion.selectAll("path").remove();
        gRegion.selectAll("text").remove();
        timeSlide.property("max", 0).property("min", 0);
        timeSlideColor();
        timeOutput.text("Please Select\nThe Location");
        selectedPath.pointer = [svgRect.svgWidth / 2, svgRect.svgHeight / 2];
    }
}

/**
 * create map with given region data
 * @param {array} regionFeatures an array contained every region geo info and project data
 */
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

    // disable double click and wheel roll to zoom
    svgMap.call(zoom)
        .on("wheel.zoom", null)
        .on("dblclick.zoom", null);

    /**
     * show the region tip with corresponding region name
     * @param {object} event HTML DOM event pointerover
     * @param {object} d binded region data
     */
    function mapPointerOver(event, d) {
        regionTipDiv.style("display", "block").text(d.properties["CITY_NAME"]);
    }

    /**
     * hide the region tip
     * @param {object} event HTML DOM event pointerout
     * @param {object} d binded region data
     */
    function mapPointerOut(event, d) {
        regionTipDiv.style("display", null).text(null);
    }

    /**
     * move the region tip with the mouse
     * @param {object} event HTML DOM event pointermove
     * @param {object} d binded region data
     */
    function mapPointerMove(event, d) {
        regionTipDiv
            .style("left", event.pageX - 30 + "px")
            .style("top", event.pageY - 50 + "px");
    }
}

/**
 * center the map in the middle of the div and show "no data" to user
 * @param {object} svgRect the size and location of the svgMap
 */
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
    if (d.attrSelected) {
        switch (d.label) {
            case "violent":
            case "property":
                unClickBtn(["violent", "property", "unemploy", "education"]);
                break;
            case "unemploy":
                unClickBtn(["violent", "property", "unemploy"]);
                break;
            case "house": unClickBtn(["house", "unemploy", "education"]);
                break;
            case "education": unClickBtn(["violent", "property", "house", "education"]);
                break;
            case "income": unClickBtn("income");
                break;
            default:
                break;
        }
    }
    attrBtnGrid.selectAll("button").classed("selectedBtn", d => d.attrSelected);
    if (chartInfo.chartCreated) {
        refreshChart(chartInfo.chartData, svgPos());
    }

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

/**
 * calculate the number of years between 2 years (used to be month)
 * @param {Date} startDate the earlier date
 * @param {Date} endDate the later date
 * @returns {int} number of years between 2 years
 */
function findYearDiff(startDate, endDate) {
    const startDateYear = startDate.getFullYear();
    const endDateYear = endDate.getFullYear();
    return endDateYear - startDateYear;
}

/**
 * calculate the date with the start date and gap number
 * @param {Date} endDate the start year
 * @param {int} years desired gap between 2 years (is negative in current use)
 * @returns {Date} the date with desired gap from given date
 */
function findYearBefore(endDate, years) {
    const startYear = endDate.getFullYear() + parseInt(years);
    const startDate = parseTime(startYear.toString());
    return startDate;
}

/**
 * the string for output element beside the input range (slider)
 * @returns {string} the date range in string
 */
function outputStr() {
    return "From "
        + findYearBefore(timeSlideRange.max, timeSlide.property("value")).getFullYear()
        + "\nTo " + timeSlideRange.max.getFullYear();
}

/**
 * change slider background color according to slider value
 */
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

/**
 * draw or clear data in different situation
 * @param {object} event HTML DOM event click
 * @param {object} d region binded data
 */
function regionClicked(event, d) {
    const [[x0, y0], [x1, y1]] = path.bounds(d);
    const svgRect = svgPos();
    chartInfo.chartData = d;

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
        createTooltip(svgRect, (x0 + x1) / 2, (y0 + y1) / 2);
    }
}

/**
 * ease out the chart div and clear the chart
 * @param {object} svgRect the size and position of svgMap
 * @param {float} centerX the center X of selected region
 * @param {float} centerY the center Y of selected region
 */
function removeTooltip(svgRect, centerX, centerY) {
    svgMap.transition().duration(800)
        .call(zoom.transform, d3.zoomIdentity
            .translate(svgRect.svgWidth / 2, svgRect.svgHeight / 2)
            .scale(zoomSlide.property("value"))
            .translate(-centerX, -centerY));
    d3.select("body").style("overflow-x", "hidden");
    regionChartDiv.transition().duration(800)
        .style("transform", null)
        .style("left", null).style("top", null)
        .style("width", null).style("height", null)
        .on("end", function () {
            regionChartDiv.style("display", null);
            d3.select("body").style("overflow-x", null);
        });
    removeAllChart();
    chartInfo.chartCreated = false;
}

/**
 * ease in the chart div and draw empty/detailed chart
 * @param {object} svgRect the size and position of svgMap
 * @param {float} centerX the center X of selected region
 * @param {float} centerY the center Y of selected region
 */
function createTooltip(svgRect, centerX, centerY) {
    // move map center to left side of svgMap
    svgMap.transition().duration(800)
        .call(zoom.transform, d3.zoomIdentity
            .translate(svgRect.svgWidth * 0.15, svgRect.svgHeight / 2)
            .scale(zoomSlide.property("value"))
            .translate(-centerX, -centerY));

    if (chartInfo.chartCreated) {
        refreshChart(chartInfo.chartData, svgRect);
    } else {
        // ease in tooltip (right to left)
        d3.select("body").style("overflow-x", "hidden");
        regionChartDiv.style("display", "block")
            .transition().duration(800)
            .style("left", svgRect.svgLeft + svgRect.svgWidth * 0.3 + "px")
            .style("top", svgRect.svgTop + "px")
            .style("width", svgRect.svgWidth * 0.7 + "px")
            .style("height", svgRect.svgHeight + "px")
            .style("transform", "none")
            .on("end", function () {
                d3.select("body").style("overflow-x", null);
                // create new charts when ease-in finish
                refreshChart(chartInfo.chartData, svgRect);
            });
    }

}

/**
 * redraw everything in chart div (clear and draw)
 * @param {object} regionData region binded data
 * @param {object} svgRect the size and position of svgMap
 */
function refreshChart(regionData, svgRect) {
    gLines.selectAll("*").remove();

    if (regionData.properties["CITY_NAME"] == "Unincorporated") {
        removeAllChart();
        textChart.attr("y", "50%")
            .text(regionData.properties["CITY_NAME"] + ": No data for Unincorporated City");
    } else {
        let selectedBtn = attrBtn.filter(btn => btn.attrSelected);
        if (selectedBtn.length == 0) {
            removeAllChart();
            // show which city region is clicked
            textChart.text(regionData.properties["CITY_NAME"])
                .attr("y", "50%");
        } else {
            // show which city region is clicked
            textChart.text(regionData.properties["CITY_NAME"])
                .attr("y", "50px");
            // set the location of all charts
            gChart.attr("transform",
                "translate(" + svgRect.svgWidth * 0.1 + ", " + chartTranslate.y + ")");
            //  and select data for creating chart
            createChart(getChartData(selectedBtn, regionData), svgRect);
        }
    }
    chartInfo.chartCreated = true;
}

/**
 * get the data that needed to be drawed
 * @param {Array} selectedBtn array stored all selected button data
 * @param {object} regionData region binded data
 * @returns {Array} the data needed to be draw based on selected button(s)
 */
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
        if (index > -1) { data.push(Object.assign({}, dataset)); }
    });
    return data;
}

/**
 * create chart with given data
 * @param {Array} data the data needed to be draw
 * @param {object} svgRect the size and position of svgMap
 */
function createChart(data, svgRect) {
    // clean the data
    const minYearDate = findYearBefore(timeSlideRange.max, timeSlide.property("value"));
    let dataset = [...data];
    dataset.forEach(set => {
        set.elements = set.elements.filter(element => (element.date - minYearDate) >= 0);
    })

    // prepare the lines
    const lines = gLines.attr("transform", "translate(0, -" + chartTranslate.y + ")")
        .selectAll("lines")
        .data(dataset).enter()
        .append("g");
    const lineLeft = d3.line();
    const lineRight = d3.line();

    // clean data
    let leftData = [], rightData = [];
    dataset.forEach(data => {
        if (Object.keys(leftTypeArr).includes(data.id)) {
            leftData.push(data);
        } else if (Object.keys(rightTypeArr).includes(data.id)) {
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
    if (rightData.length > 1) {
        yAxisScaleRight.domain([
            Math.floor(0.95 * d3.min(rightData[0].elements.map(element => element.value)
                .concat(rightData[1].elements.map(element => element.value)))),
            Math.ceil(1.05 * d3.max(rightData[0].elements.map(element => element.value)
                .concat(rightData[1].elements.map(element => element.value))))
        ]);
    } else if (rightData.length == 1) {
        yAxisScaleRight.domain([
            Math.floor(0.95 * d3.min(rightData[0].elements.map(element => element.value))),
            Math.ceil(1.05 * d3.max(rightData[0].elements.map(element => element.value)))
        ]);
    }

    // get path coordinates if relative data exists and draw axes
    xAxisScale.range([0, svgRect.svgWidth * 0.5])
        .domain([minYearDate, timeSlideRange.max]);
    gXAxis.transition().duration(500).call(xAxis.scale(xAxisScale));

    if (leftData.length > 0) {
        gYAxisLeft.selectAll(".chartLabel").remove();
        lineLeft
            .x(d => { return xAxisScale(d.date); })
            .y(d => { return yAxisScaleLeft(d.value); });
        gYAxisLeft.transition().duration(500).call(yAxisLeft.scale(yAxisScaleLeft));
        gYAxisLeft.attr("transform", "translate(0, -" + chartTranslate.y + ")")
            .append("text").attr("class", "chartLabel")
            .attr("y", chartTranslate.top * 0.85)
            .text(leftTypeArr[leftData[0].id][0]);
    } else { gYAxisLeft.selectAll("*").remove(); }
    if (rightData.length > 0) {
        gYAxisRight.selectAll(".chartLabel").remove();
        lineRight
            .x(d => { return xAxisScale(d.date); })
            .y(d => { return yAxisScaleRight(d.value); });
        gYAxisRight.transition().duration(500).call(yAxisRight.scale(yAxisScaleRight));
        gYAxisRight.attr("transform", "translate(" + svgRect.svgWidth * 0.5 + ", -" + chartTranslate.y + ")")
            .append("text").attr("class", "chartLabel")
            .attr("y", chartTranslate.top * 0.85)
            .text(rightTypeArr[rightData[0].id][0]);
    } else { gYAxisRight.selectAll("*").remove(); }

    lines.append("path").attr("class", "line")
        .attr("d", d => {
            if (Object.keys(leftTypeArr).includes(d.id)) { return lineLeft(d.elements); }
            else if (Object.keys(rightTypeArr).includes(d.id)) { return lineRight(d.elements); }
        }).attr("class", d => {
            if (Object.keys(leftTypeArr).includes(d.id)) { return "lineLeft"; }
            else if (Object.keys(rightTypeArr).includes(d.id)) { return "lineRight"; }
        });

    // create data tooltips on lines
    lines.selectAll("points")
        .data(d => {
            d.elements.forEach(element => { element.id = d.id; })
            return d.elements;
        }).enter()
        .append("circle").attr("class", "dataPoint")
        .attr("cx", d => xAxisScale(d.date))
        .attr("cy", d => {
            if (Object.keys(leftTypeArr).includes(d.id)) { return yAxisScaleLeft(d.value); }
            else if (Object.keys(rightTypeArr).includes(d.id)) { return yAxisScaleRight(d.value); }
        }).attr("r", 10)
        .on("pointerover", chartPointerOver)
        .on("pointerout", chartPointerOut)
        .on("pointermove", chartPointerMove);

    /**
     * show the line chart tip and set its value with corresponding data
     * @param {object} event HTML DOM event pointerover
     * @param {object} d region binded data
     */
    function chartPointerOver(event, d) {
        chartTipDiv.style("display", "block")
            .text(Object.assign({}, leftTypeArr, rightTypeArr)[d.id][1] + ": " + d.value);
    }

    /**
     * hide the line chart tip
     * @param {object} event HTML DOM event pointerout
     * @param {object} d region binded data
     */
    function chartPointerOut(event, d) {
        chartTipDiv.style("display", null).text(null);
    }

    /**
     * move the line chart tip with the mouse
     * @param {object} event HTML DOM event pointermove
     * @param {object} d region binded data
     */
    function chartPointerMove(event, d) {
        chartTipDiv
            .style("left", event.pageX - 100 + "px")
            .style("top", event.pageY - 60 + "px")
    }
}

/**
 * highlight the selected region or not
 * @param {object} d region binded data
 * @param {boolean} boo whether the region is selected to be highlighted
 */
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

/**
 * calculate the size and location of the svgMap using DOM function
 * @returns the size and location of the svgMap
 */
function svgPos() {
    const svgRect = svgMap.node().getBoundingClientRect();
    return {
        svgLeft: svgRect.x + window.scrollX,
        svgTop: svgRect.y + window.scrollY,
        svgWidth: svgRect.width,
        svgHeight: svgRect.height
    };
}

/**
 * d3 default zoom function
 * @param {*} transformObj d3 default zoom variable
 */
function zoomed({ transform }) {
    gRegion.attr("transform", transform);
}

/**
 * click the zoom in button to zoom in the map
 * @param {object} event HTML DOM event click
 * @param {object} d zoom button binded data (null)
 */
function zoomInBtn(event, d) {
    let zoomLevel = zoomSlide.property("value");
    if (zoomLevel < zoomSlideRange.max) {
        zoomSlide.property("value", ++zoomLevel);
        zoomMap(zoomLevel);
    }
}

/**
 * click the zoom out button to zoom out the map
 * @param {object} event HTML DOM event click
 * @param {object} d zoom button binded data (null)
 */
function zoomOutBtn(event, d) {
    let zoomLevel = zoomSlide.property("value");
    if (zoomLevel > zoomSlideRange.min) {
        zoomSlide.property("value", --zoomLevel);
        zoomMap(zoomLevel);
    }
}

/**
 * slide the input range slider to zoom in/out the map
 * @param {object} event HTML DOM event input
 * @param {object} d zoom slider binded data (null)
 */
function zoomRangeSlider(event, d) {
    zoomMap(zoomSlide.property("value"));
}

/**
 * zoom the map with given scale value
 * @param {int} zoomLevel zoom scale value
 */
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
    d3.selectAll(".axis").attr("transform", null);
    gLines.selectAll("*").remove();
}
