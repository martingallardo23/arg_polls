/* Helper functions */

function cleanPartyName(party) {
    return party.replace(/ /g, "_");
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

function getVisibleParties() {
    var visibleParties = [];
    d3.selectAll('#controls input[type=checkbox]').each(function() {
        if (d3.select(this).property('checked')) {
            visibleParties.push(d3.select(this).attr('id').substring(4));
        }
    });

    return visibleParties;
}

/* Input control functions */

function togglePartyVisibility(party, checked) {
    var cleanParty = cleanPartyName(party);
    d3.selectAll(".dot-" + cleanParty)
        .each(function() {
            if (checked) {
                d3.select(this)
                    .style("display", 'block');
            }
        })
        .transition()
        .duration(200)
        .style("opacity", checked ? 0.5 : 0)
        .on("end", function() {
            if (!checked) {
                d3.select(this)
                    .style("display", 'none');
            }
        });
    d3.selectAll(".line-" + cleanParty)
        .transition()
        .duration(200)
        .style("opacity", checked ? 1 : 0);
    d3.selectAll(".trend-line-" + cleanParty)
        .transition()
        .duration(200)
        .style("opacity", checked ? 0.2 : 0);

    displayAverages();
}

function createPartyCheckboxes(data) {

    color.domain(data.map(d => d.party ));

    color.domain().forEach(party => {
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

/* Plotting and displaying averages functions*/

function displayAverages(date) {

    averageDisplay.html("");

    var partyDataArray = [];

    var visibleParties = getVisibleParties();

    smoothedDataArray.forEach(({party, data}) => {
        var bisectDate = d3.bisector(d => d.fecha).left;
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
        .attr("class", "average-display-item-" + cleanPartyName(partyData.party))
        .style("display", visibleParties.includes(partyData.party) ? 'block' : 'none')
        .style("color", hexToRGBA(partyColors[partyData.party], 1))

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
    var latestDate = d3.max(data, d => d.fecha );
    displayAverages(latestDate);
    displayDate(latestDate)
}


function displayDate(date) {
    dateDisplayElem.text(date.toLocaleDateString("es-ES", dateOptions));
}	

function drawPlot(data, numObservations) {
    svg.selectAll(".trend-line").remove();
    svg.selectAll(".line").remove();

    var visibleParties = getVisibleParties();

    var parties = d3.groups(data, d => d.party);
    smoothedDataArray = [];  

    parties.forEach(([party, partyData]) => {
        partyData.sort((a, b) => a.fecha - b.fecha);
        var minDate = d3.min(partyData, d => d.fecha);
        var maxDate = d3.max(partyData, d => d.fecha);

        var smoothedPartyData = movingAverage(partyData, numObservations);

        smoothedDataArray.push({
            party: party,
            data: smoothedPartyData,
            minDate: minDate,
            maxDate: maxDate
        });

        gTrendLines.append("path")
            .datum(smoothedPartyData)
            .attr("fill", partyColors[party])
            .attr("opacity", visibleParties.includes(party) ? 0.2 : 0)
            .attr("d", confidenceArea)
            .attr("class", "trend-line trend-line-" + cleanPartyName(party));

        gLines.append("path")
            .datum(smoothedPartyData)
            .attr("fill", "none")
            .attr("stroke", partyColors[party])
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 2)
            .attr("opacity", visibleParties.includes(party) ? 1 : 0)
            .attr("d", line)
            .attr("class", "line line-" + cleanPartyName(party));
    });
}

function drawDots(data) {
    svg.selectAll(".dot").remove();

    gDots.selectAll(".dot")
        .data(data)
        .enter().append("circle")
        .attr("r", 3.5)
        .attr("cx", d => x(d.fecha))
        .attr("cy", d => y(d.percentage_points))
        .style("fill", d => partyColors[d.party])
        .on("mouseover", handleMouseOver)
        .on("mouseout", handleMouseOut)
        .attr("class", d => "dot dot-" + cleanPartyName(d.party));
}

/* Mouse event functions */

function handleMouseOver(event, d) {
    d3.select(this)
        .transition()
        .duration(100)
        .attr("r", 7);  

    tooltip.transition()
        .duration(300)
        .style("opacity", 1);

    tooltip.html("<span style='color:" + partyColors[d.party] + 
            "; font-weight:bold;'> " + d.party +"</span>"
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

function handleMouseMove(event, d) {
    var mouseX = event.clientX - svgBounds.left - margin.left +5;
    var date = x.invert(mouseX);

    verticalLine.attr("x1", mouseX)
        .attr("x2", mouseX)
        .style("opacity", 1);

    displayAverages(date);
    displayDate(date);
}
