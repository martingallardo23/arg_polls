/* -----------------*/
/* Define variables */

var svg = d3.select("svg"),
margin  = {top: 20, right: 20, bottom: 30, left: 50},
width   = +svg.attr("width") - margin.left - margin.right,
height  = +svg.attr("height") - margin.top - margin.bottom,
g       = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
gTrendLines = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
gDots   = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
gLines  = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var tooltip     = d3.select("#tooltip");
var parseTime   = d3.timeParse("%Y-%m-%d");
var x           = d3.scaleTime().rangeRound([0, width]);
var y           = d3.scaleLinear().rangeRound([height, 0]);
var color       = d3.scaleOrdinal(d3.schemeCategory10);
var slider      = document.getElementById("obs-slider");
var sliderValue = document.getElementById("slider-value");

var line = d3.line()
    .curve(d3.curveBasis) 
    .x(d => d[0])
    .y(d => d[1]);

var partyColors = {
    "Juntos por el Cambio": "#F5C000",
    "Frente de Todos": "#2EB2AC",
    "Consenso Federal": "#618B25",
    "Frente de Izquierda": "#E97149",
    "La Libertad Avanza": "#A53860",
    "Otros": "#3D5467",
};

var verticalLine = g.append("line")
    .attr("stroke", "gray")
    .attr("stroke-width", 1)
    .attr("y1", 0)
    .attr("y2", height)
    .style("opacity", 0);

var movingAverage = (data, numberOfPricePoints) => {
    return data.map((row, index, total) => {
        const start = Math.max(0, index - numberOfPricePoints);
        const end = index;
        const subset = total.slice(start, end + 1);
        const sum = subset.reduce((a, b) => {
            return a + b.percentage_points;
        }, 0);
        const mean = sum / subset.length;

        const sqDiff = subset.map(d => Math.pow(d.percentage_points - mean, 2));
        const avgSqDiff = sqDiff.reduce((a, b) => a + b, 0)  / sqDiff.length;
        const deviation = Math.sqrt(avgSqDiff);

        return {
            fecha: row.fecha,
            percentage_points: mean,
            deviation: deviation
        };
    });
};

g.append("g")
.attr("transform", "translate(0," + height + ")")
.call(d3.axisBottom(x))
.select(".domain")
.remove();

g.append("g")
.call(d3.axisLeft(y))
.append("text")
.attr("fill", "#000")
.attr("transform", "rotate(-90)")
.attr("y", 6)
.attr("dy", "0.71em")
.attr("text-anchor", "end")
.text("Percentage Points");

/* Define plot level events */

svg.on("mouseleave", displayLatestAverages);

/* Load data */

var data;
let smoothedDataArray; 

var regressionGenerator = (bandwith) => d3.regressionLoess()
  .x(d => x(d.fecha))
  .y(d => y(d.percentage_points))
  .bandwidth(bandwith);

d3.csv("./data/encuestas_long.csv").then(function(loadedData) {
    data = loadedData.map(function(d) {
        d.fecha = parseTime(d.fecha);
        d.percentage_points = +d.percentage_points;
        return d;  
    });

    x.domain(d3.extent(data, d => d.fecha));
    y.domain(d3.extent(data, d => d.percentage_points));
    color.domain(data.map(d => d.party));

    createPartyCheckboxes(data);  
    drawPlot(data, 15);
    drawDots(data);
    displayLatestAverages();

    slider.oninput = function() {
        sliderValue.textContent = this.value;
        var numObservations = this.value;
        var bandwith = this.value;
        drawPlot(data, 15, bandwith);
        displayLatestAverages();
    }
    
    slider.dispatchEvent(new Event('input'));

    svg.on("mousemove", handleMouseMove);

    svg.on("mouseleave", function() {
        verticalLine.style("opacity", 0);
        displayLatestAverages();});

});
