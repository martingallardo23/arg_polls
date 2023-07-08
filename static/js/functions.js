function handleMouseOver(event, d) {
    d3.select(this)
        .transition()
        .duration(100)
        .attr("r", 7);  

    tooltip.transition()
        .duration(300)
        .style("opacity", 1);

    tooltip.html("<b>Partido:</b> " + d.party 
        + "<br/><b>Porcentaje:</b> " + d.percentage_points + "%"
        + "</br><b>Encuesta:</b> " + d.encuestadora + "</b>")
        .style("left", (event.pageX + 20) + "px")     
        .style("top", (event.pageY - 10) + "px");   
}

function handleMouseOut(event, d) {
    d3.select(this)
        .transition()
        .duration(100)
        .attr("r", 3.5);  
    tooltip.transition()
        .duration(300)
        .style("opacity", 0);
}

function cleanPartyName(party) {
    return party.replace(/ /g, "_");
}

function togglePartyVisibility(party, checked) {
    var cleanParty = cleanPartyName(party);
    d3.selectAll(".dot-" + cleanParty)
        .transition()
        .duration(200)
        .style("opacity", checked ? 0.5 : 0);
    d3.selectAll(".line-" + cleanParty)
        .transition()
        .duration(200)
        .style("opacity", checked ? 1 : 0);
    d3.selectAll(".trend-line-" + cleanParty)
        .transition()
        .duration(200)
        .style("opacity", checked ? 0.2 : 0);
}


function createPartyCheckboxes(data) {
    var controls = d3.select("#controls");
    var color = d3.scaleOrdinal(d3.schemeCategory10);
    color.domain(data.map(function(d) { return d.party; }));

    color.domain().forEach(function(party) {
        var div = controls.append("div")
            .attr("class", "custom-checkbox")
            .on("click", function() {
                var input = d3.select(this).select("input").node();

                input.checked = !input.checked;

                togglePartyVisibility(party, input.checked); 

                d3.select(this).selectAll(".color-indicator, label-indicator")
                    .transition()
                    .duration(200)
                    .style("opacity", input.checked ? 1 : 0.4);
            });

        div.append("span")
            .attr("class", "color-indicator")
            .style("background-color", partyColors[party]);

        div.append("input")
            .attr("type", "checkbox")
            .attr("id", "chk-" + party)
            .property("checked", true)
            .style("display", "none");

        div.append("label-indicator")
            .attr("for", "chk-" + party)
            .text(party);
    });
}

function hexToRGBA(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);

    if (alpha) {
        return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
    } else {
        return "rgb(" + r + ", " + g + ", " + b + ")";
    }
}

function displayAverages(date) {
    var averageDisplay = d3.select("#average-display");
    averageDisplay.html("");

    var partyDataArray = [];

    smoothedDataArray.forEach(({party, data}) => {
        var bisectDate = d3.bisector(function(d) { return d.fecha; }).left;
        var i = bisectDate(data, date, 1);
        var d0 = data[i - 1];
        var d1 = data[i];
        var d;

        if (d0 && d1) {
            d = date - d0.fecha > d1.fecha - date ? d1 : d0;
        } else if (d0) {
            d = d0;
        } else if (d1) {
            d = d1;
        }

        if (d) {
            partyDataArray.push({party: party, value: d.percentage_points});
        }
    });

    partyDataArray.sort((a, b) => b.value - a.value);
    var totalSum = partyDataArray.reduce((acc, curr) => acc + curr.value, 0);

    partyDataArray.forEach(partyData => {
        var normalizedValue = (partyData.value / totalSum) * 100;

    var item = averageDisplay.append("div")
        .attr("class", "average-display-item")
        .style("color", hexToRGBA(partyColors[partyData.party], 1))
        //.style("border-left", "5px solid" + partyColors[partyData.party]);

    item.append("p")
        .style("font-weight", "bold")
        .style("margin-bottom", "0")
        .text(partyData.party + ":");

    item.append("p")
        .style("margin-top", "0")
        .text(normalizedValue.toFixed(2) + "%");
    });
}

function displayLatestAverages() {
    var latestDate = d3.max(data, function(d) { return d.fecha; });
    var yearMonth = d3.timeMonth(latestDate);

    displayAverages(latestDate);
}

function handleMouseMove(event, d) {
    var svgBounds = svg.node().getBoundingClientRect();
    var mouseX = event.clientX - svgBounds.left - margin.left;
    var date = x.invert(mouseX);
    var yearMonth = d3.timeMonth(date);

    verticalLine.attr("x1", mouseX)
        .attr("x2", mouseX)
        .style("opacity", 1);

    displayAverages(date);
}
