const scatterSvg = d3.select("#scatter");  // scatter plot container
const barSvg     = d3.select("#bar");      // bar chart container
const lineSvg    = d3.select("#line");     // line chart container

const margin = { top: 40, right: 40, bottom: 60, left: 60 };  // chart margins

// Scatter plot dimensions (larger to reduce clutter)
const scatterWidth  = 900 - margin.left - margin.right;
const scatterHeight = 700 - margin.top  - margin.bottom;

// Shared dimensions for bar & line charts
const width  = 600 - margin.left - margin.right;
const height = 400 - margin.top  - margin.bottom;

// Chart groups (apply margins)
const scatterPlot = scatterSvg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
const barChart    = barSvg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
const lineChart   = lineSvg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Floating tooltip for hover details
const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip");

let colorScale;  // ordinal scale mapping countries to colors

d3.csv("WineDataset.csv").then(data => {
    // Clean numeric fields and trim text
    data.forEach(d => {
        d.Price   = parseFloat(d.Price.replace(/[^0-9.]/g, ""));
        d.ABV     = parseFloat(d.ABV.replace(/[^0-9.]/g, ""));
        if (d.Vintage) d.Vintage = d.Vintage.trim();
        if (d.Country) d.Country = d.Country.trim();
        if (d.Type)    d.Type    = d.Type.trim();
    });

    // Filter out invalid ABV entries or missing country/type
    data = data.filter(d => !isNaN(d.ABV) && d.Country && d.Type);

    // Gather unique countries and vintages, then sort vintages
    const countries = Array.from(new Set(data.map(d => d.Country)));
    const years     = Array.from(
        new Set(data.map(d => d.Vintage).filter(v => v))
    ).sort((a, b) => a.localeCompare(b));

    // Build a distinct HCL color palette for countries
    const palette = countries.map((c, i) =>
        d3.hcl(i * 360 / countries.length, 65, 70)
    );
    colorScale = d3.scaleOrdinal()
        .domain(countries)
        .range(palette);

    // Fill country dropdown with colored options
    countries.forEach(c => {
        d3.select("#countryFilter")
            .append("option")
            .text(c)
            .attr("value", c)
            .style("color", colorScale(c));
    });

    // Fill vintage dropdown
    years.forEach(y => {
        d3.select("#vintageFilter")
            .append("option")
            .text(y)
            .attr("value", y);
    });

    // Re-render charts when filters change
    function updateFilters() {
        const country = d3.select("#countryFilter").property("value");
        const vintage = d3.select("#vintageFilter").property("value");
        let filtered = data;
        if (country  !== "All") filtered = filtered.filter(d => d.Country  === country);
        if (vintage !== "All") filtered = filtered.filter(d => d.Vintage === vintage);
        updateScatter(filtered);
        updateBar(filtered);
        updateLine(filtered);
    }

    d3.select("#countryFilter").on("change", updateFilters);
    d3.select("#vintageFilter").on("change", updateFilters);

    // Initial chart draw
    updateScatter(data);
    updateBar(data);
    updateLine(data);
});

function updateScatter(data) {
    scatterPlot.selectAll("*").remove();  // clear previous points

    // Scales for ABV (x) and Price (y)
    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.ABV)).nice()
        .range([0, scatterWidth]);
    const y = d3.scaleLinear()
        .domain(d3.extent(data, d => d.Price)).nice()
        .range([scatterHeight, 0]);

    // Draw axes
    scatterPlot.append("g")
        .attr("transform", `translate(0,${scatterHeight})`)
        .call(d3.axisBottom(x));
    scatterPlot.append("g")
        .call(d3.axisLeft(y));

    // Label axes
    scatterPlot.append("text")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + margin.bottom - 10)
        .attr("text-anchor", "middle")
        .text("Alcohol by Volume (ABV)");
    scatterPlot.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -scatterHeight / 2)
        .attr("y", -margin.left + 15)
        .attr("text-anchor", "middle")
        .text("Price ($)");

    // Plot points with hover tooltip
    scatterPlot.selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("cx", d => x(d.ABV))
        .attr("cy", d => y(d.Price))
        .attr("r", 5)
        .attr("fill", d => colorScale(d.Country))
        .on("mouseover", (e, d) => {
            tooltip.style("display", "block")
                .html(
                    `<strong>${d.Title}</strong><br>` +
                    `Country: ${d.Country}<br>` +
                    `ABV: ${d.ABV}%<br>` +
                    `Price: $${d.Price}`
                );
        })
        .on("mousemove", e => {
            tooltip
                .style("left",  (e.pageX + 10) + "px")
                .style("top",   (e.pageY - 20) + "px");
        })
        .on("mouseout", () => tooltip.style("display", "none"));
}

function updateBar(data) {
    barChart.selectAll("*").remove();  // clear previous bars

    // Compute average price by wine type
    const avgByType = d3.rollup(
        data,
        v => d3.mean(v, d => d.Price),
        d => d.Type
    );

    // Scales
    const x = d3.scaleBand()
        .domain(Array.from(avgByType.keys()))
        .range([0, width])
        .padding(0.2);
    const y = d3.scaleLinear()
        .domain([0, d3.max(avgByType.values())]).nice()
        .range([height, 0]);

    // Draw axes
    barChart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));
    barChart.append("g")
        .call(d3.axisLeft(y));

    // Label axes
    barChart.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .attr("text-anchor", "middle")
        .text("Wine Type");
    barChart.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .attr("text-anchor", "middle")
        .text("Avg Price ($)");

    // Draw bars with hover tooltip
    barChart.selectAll("rect")
        .data(Array.from(avgByType.entries()))
        .enter().append("rect")
        .attr("x",      d => x(d[0]))
        .attr("y",      d => y(d[1]))
        .attr("width",  x.bandwidth())
        .attr("height", d => height - y(d[1]))
        .attr("fill",   "teal")
        .on("mouseover", (e, d) => {
            tooltip.style("display", "block")
                .html(`<strong>${d[0]}</strong><br>Avg Price: $${d[1].toFixed(2)}`);
        })
        .on("mousemove", e => {
            tooltip
                .style("left",  (e.pageX + 10) + "px")
                .style("top",   (e.pageY - 20) + "px");
        })
        .on("mouseout", () => tooltip.style("display", "none"));
}

function updateLine(data) {
    lineChart.selectAll("*").remove();  // clear previous chart

    // Count entries per numeric vintage year
    const numericData       = data.filter(d => d.Vintage && !isNaN(+d.Vintage));
    const productionByYear  = d3.rollup(
        numericData,
        v => v.length,
        d => +d.Vintage
    );
    const years     = Array.from(productionByYear.keys()).sort((a, b) => a - b);
    if (!years.length) return;
    const counts    = years.map(y => productionByYear.get(y));

    // Scales
    const x = d3.scaleLinear()
        .domain(d3.extent(years)).nice()
        .range([0, width]);
    const y = d3.scaleLinear()
        .domain([0, d3.max(counts)]).nice()
        .range([height, 0]);

    // Draw axes with rotated year labels
    lineChart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(years.length))
        .selectAll("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-45)")
        .style("font-size", "10px");
    lineChart.append("g")
        .call(d3.axisLeft(y));

    // Label axes
    lineChart.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .attr("text-anchor", "middle")
        .text("Year");
    lineChart.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -margin.left + 15)
        .attr("text-anchor", "middle")
        .text("Count (# new bottles)");

    // Draw line and points with tooltip
    const lineFun = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.count))
        .curve(d3.curveMonotoneX);
    const lineData = years.map(year => ({ year, count: productionByYear.get(year) }));

    lineChart.append("path")
        .datum(lineData)
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", 2)
        .attr("d", lineFun);

    lineChart.selectAll("circle")
        .data(lineData)
        .enter().append("circle")
        .attr("cx", d => x(d.year))
        .attr("cy", d => y(d.count))
        .attr("r", 4)
        .attr("fill", "steelblue")
        .on("mouseover", (e, d) => {
            tooltip.style("display", "block")
                .html(`Year: ${d.year}<br>Count: ${d.count}`);
        })
        .on("mousemove", e => {
            tooltip
                .style("left",  (e.pageX + 10) + "px")
                .style("top",   (e.pageY - 20) + "px");
        })
        .on("mouseout", () => tooltip.style("display", "none"));
}
