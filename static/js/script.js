var svg = d3.select("svg"),
margin = {top: 20, right: 20, bottom: 30, left: 50},
width = +svg.attr("width") - margin.left - margin.right,
height = +svg.attr("height") - margin.top - margin.bottom,
g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var tooltip = d3.select("#tooltip");
var parseTime = d3.timeParse("%Y-%m-%d");
var x = d3.scaleTime().rangeRound([0, width]);
var y = d3.scaleLinear().rangeRound([height, 0]);
var color = d3.scaleOrdinal(d3.schemeCategory10);

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

var data;

d3.csv("./data/encuestas_long.csv").then(function(loadedData) {
data = loadedData.map(function(d) {
    d.fecha = parseTime(d.fecha);
    d.percentage_points = +d.percentage_points;
    return d;  
});

x.domain(d3.extent(data, function(d) { return d.fecha; }));
y.domain(d3.extent(data, function(d) { return d.percentage_points; }));
color.domain(data.map(function(d) { return d.party; }));

createPartyCheckboxes(data);  
displayLatestAverages();

var line = d3.line()
    .curve(d3.curveBasis) 
    .x(function(d) { return x(d.fecha); })
    .y(function(d) { return y(d.percentage_points); });

var parties = d3.rollup(data, 
                        v => ({mean: d3.mean(v, d => d.percentage_points), 
                            deviation: d3.deviation(v, d => d.percentage_points)}), 
                        d => d.party, 
                        d => d3.timeMonth(d.fecha).toISOString());

parties.forEach((values, key) => {
    var partyData = Array.from(values, ([date, v]) => ({fecha: new Date(date), 
        percentage_points: v.mean, deviation: v.deviation}));
    partyData.sort((a, b) => a.fecha - b.fecha);

    var confidenceArea = d3.area()
        .curve(d3.curveBasis)
        .x(function(d) { return x(d.fecha); })
        .y0(function(d) { return y(d.percentage_points - 1.96 * d.deviation / Math.sqrt(partyData.length)); })
        .y1(function(d) { return y(d.percentage_points + 1.96 * d.deviation / Math.sqrt(partyData.length)); });

        g.append("path")
            .datum(partyData)
            .attr("fill", partyColors[key])
            .attr("opacity", 0.2) 
            .attr("d", confidenceArea)
            .attr("class", "trend-line trend-line-" + cleanPartyName(key));

        g.append("path")
            .datum(partyData)
            .attr("fill", "none")
            .attr("stroke", partyColors[key])
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 2)
            .attr("d", line)
            .attr("class", "line line-" + cleanPartyName(key));
});

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
    .attr("cx", function(d) { return x(d.fecha); })
    .attr("cy", function(d) { return y(d.percentage_points); })
    .style("fill", function(d) { return partyColors[d.party]; })

    .on("mouseover", handleMouseOver)
    .on("mouseout", handleMouseOut)
    .attr("class", function(d) { return "dot dot-" + cleanPartyName(d.party); });

    svg.on("mousemove", handleMouseMove);

    svg.on("mouseleave", function() {
        verticalLine.style("opacity", 0);
        displayLatestAverages();});

});