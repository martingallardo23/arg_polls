/* -----------------*/
/* Define variables */

var svg = d3.select("svg"),
margin  = {top: 20, right: 20, bottom: 30, left: 50},
width   = +svg.attr("width") - margin.left - margin.right,
height  = +svg.attr("height") - margin.top - margin.bottom,
g       = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var tooltip   = d3.select("#tooltip");
var parseTime = d3.timeParse("%Y-%m-%d");
var x         = d3.scaleTime().rangeRound([0, width]);
var y         = d3.scaleLinear().rangeRound([height, 0]);
var color     = d3.scaleOrdinal(d3.schemeCategory10);

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
        const avgSqDiff = sqDiff.reduce((a, b) => a + b, 0);
        const deviation = Math.sqrt(avgSqDiff);

        return {
            fecha: row.fecha,
            percentage_points: mean,
            deviation: deviation
        };
    });
};

/* Define plot level events */

svg.on("mouseleave", displayLatestAverages);

d3.select("#toggle-trend-line").on("click", function() {
    var trendLines = d3.selectAll(".trend-line");
    if (trendLines.style("display") === "none") {
        trendLines.style("display", null);
    } else {
        trendLines.style("display", "none");
    }
    var lines = d3.selectAll(".line");
    if (lines.style("display") === "none") {
        lines.style("display", null);
    } else {
        lines.style("display", "none");
    }
});

/* Load data */

var data;
let smoothedDataArray; 

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

    var line = d3.line()
        .curve(d3.curveBasis) 
        .x(d => x(d.fecha))
        .y(d => y(d.percentage_points));

    var parties = d3.groups(data, d => d.party);
    smoothedDataArray = [];  

    parties.forEach(([party, partyData]) => {
        partyData.sort((a, b) => a.fecha - b.fecha);
        var minDate = d3.min(partyData, d => d.fecha);
        var maxDate = d3.max(partyData, d => d.fecha);

        var smoothedPartyData = movingAverage(partyData, 15);

        smoothedDataArray.push({
            party: party,
            data: smoothedPartyData,
            minDate: minDate,
            maxDate: maxDate
        });

        var confidenceArea = d3.area()
            .curve(d3.curveBasis)
            .x(d => x(d.fecha))
            .y0(d => y(d.percentage_points - 1.96 * d.deviation / Math.sqrt(partyData.length)))
            .y1(d => y(d.percentage_points + 1.96 * d.deviation / Math.sqrt(partyData.length)));

        g.append("path")
            .datum(smoothedPartyData)
            .attr("fill", partyColors[party])
            .attr("opacity", 0.2) 
            .attr("d", confidenceArea)
            .attr("class", "trend-line trend-line-" + cleanPartyName(party));

        g.append("path")
            .datum(smoothedPartyData)
            .attr("fill", "none")
            .attr("stroke", partyColors[party])
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 2)
            .attr("d", line)
            .attr("class", "line line-" + cleanPartyName(party));
    });

    displayLatestAverages();

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

    g.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("r", 3.5)
        .attr("cx", d => x(d.fecha))
        .attr("cy", d => y(d.percentage_points))
        .style("fill", d => partyColors[d.party])
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut)
        .attr("class", d => "dot dot-" + cleanPartyName(d.party));

    svg.on("mousemove", handleMouseMove);

    svg.on("mouseleave", function() {
        verticalLine.style("opacity", 0);
        displayLatestAverages();});

});