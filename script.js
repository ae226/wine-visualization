const scatterSvg = d3.select("#scatter");
const barSvg = d3.select("#bar");
const lineSvg = d3.select("#line");
const margin = { top: 40, right: 40, bottom: 60, left: 60 };

// Updated scatter plot dimensions for a 1200 x 800 SVG
const scatterWidth = 1200 - margin.left - margin.right;
const scatterHeight = 800 - margin.top - margin.bottom;

// Global width/height for bar and line charts remain unchanged
const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const scatterPlot = scatterSvg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
const barChart = barSvg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);
const lineChart = lineSvg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select("body").append("div").attr("class", "tooltip");


// Declare a global color scale variable
let colorScale;

d3.csv("WineDataset.csv").then(data => {
    data.forEach(d => {
      // Remove any character except digits and dot for Price and ABV
      d.Price = parseFloat(d.Price.replace(/[^0-9.]/g, ''));
      d.ABV = parseFloat(d.ABV.replace(/[^0-9.]/g, ''));
      // Clean up Vintage, Country, and Type fields if available
      if(d.Vintage) d.Vintage = d.Vintage.trim();
      if(d.Country) d.Country = d.Country.trim();
      if(d.Type) d.Type = d.Type.trim();
    });
    
    // Filter out records with invalid ABV, blank Country, or blank Wine Type.
    data = data.filter(d => !isNaN(d.ABV) && d.Country !== "" && d.Type !== "");

    const countries = Array.from(new Set(data.map(d => d.Country)));
    // Also extract unique Vintage values (including non-numerics like "NV" if they exist)
    const years = Array.from(new Set(data.map(d => d.Vintage).filter(v => v && v !== "")));
    years.sort((a, b) => a.localeCompare(b));
    
    // Generate a custom palette using d3.hcl for distinct colors.
    const palette = countries.map((c, i) => d3.hcl(i * 360 / countries.length, 65, 70));
  
    // Create the color scale using the custom palette
    colorScale = d3.scaleOrdinal()
                   .domain(countries)
                   .range(palette);
  
    // Populate the country filter options
    countries.forEach(c => {
      d3.select("#countryFilter")
        .append("option")
        .text(c)
        .attr("value", c)
        .style("color", colorScale(c));
    });
    
    // Populate the vintage (year) filter options
    years.forEach(y => {
      d3.select("#vintageFilter")
        .append("option")
        .text(y)
        .attr("value", y);
    });
    
    // Update charts based on the current filters.
    function updateFilters() {
      const selectedCountry = d3.select("#countryFilter").property("value");
      const selectedYear = d3.select("#vintageFilter").property("value");
      let filtered = data;
      if(selectedCountry !== "All"){
        filtered = filtered.filter(d => d.Country === selectedCountry);
      }
      if(selectedYear !== "All"){
        filtered = filtered.filter(d => d.Vintage === selectedYear);
      }
      updateScatter(filtered);
      updateBar(filtered);
      updateLine(filtered);  // Update the line chart as well
    }
  
    // Set event listeners for all filters
    d3.select("#countryFilter").on("change", updateFilters);
    d3.select("#vintageFilter").on("change", updateFilters);
  
    // Initial update using all data
    updateScatter(data);
    updateBar(data);
    updateLine(data);
});
  
function updateScatter(data) {
  scatterPlot.selectAll("*").remove();

  // Use scatterWidth and scatterHeight for scales in the scatter plot.
  const x = d3.scaleLinear()
              .domain(d3.extent(data, d => d.ABV))
              .range([0, scatterWidth])
              .nice();
  const y = d3.scaleLinear()
              .domain(d3.extent(data, d => d.Price))
              .range([scatterHeight, 0])
              .nice();

  // Append axes
  scatterPlot.append("g")
    .attr("transform", `translate(0,${scatterHeight})`)
    .call(d3.axisBottom(x));
  scatterPlot.append("g")
    .call(d3.axisLeft(y));

  // Append axis labels
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

  // Draw dots (or grapes, if you applied that change)
  scatterPlot.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.ABV))
    .attr("cy", d => y(d.Price))
    .attr("r", 5)
    .attr("fill", d => colorScale(d.Country))
    .on("mouseover", (e, d) => {
      tooltip.style("display", "block")
             .html(`<strong>${d.Title}</strong><br>Country: ${d.Country}<br>ABV: ${d.ABV}%<br>Price: $${d.Price}`);
    })
    .on("mousemove", e => {
      tooltip.style("left", (e.pageX + 10) + "px")
             .style("top", (e.pageY - 20) + "px");
    })
    .on("mouseout", () => tooltip.style("display", "none"));
}
  
function updateBar(data) {
    barChart.selectAll("*").remove();
  
    const avgByType = d3.rollup(
      data,
      v => d3.mean(v, d => d.Price),
      d => d.Type
    );
  
    const x = d3.scaleBand()
                .domain(Array.from(avgByType.keys()))
                .range([0, width])
                .padding(0.2);
  
    const y = d3.scaleLinear()
                .domain([0, d3.max(avgByType.values())])
                .range([height, 0])
                .nice();
  
    // Append axes
    barChart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));
    barChart.append("g")
        .call(d3.axisLeft(y));
  
    // Append axis labels
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
        .text("Average Price ($)");

  barChart.selectAll("rect")
    .data(Array.from(avgByType.entries()))
    .enter()
    .append("rect")
    .attr("x", d => x(d[0]))
    .attr("y", d => y(d[1]))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d[1]))
    .attr("fill", "teal")
    .on("mouseover", (e, d) => {
      tooltip.style("display", "block")
             .html(`<strong>${d[0]}</strong><br>Avg Price: $${d[1].toFixed(2)}`);
    })
    .on("mousemove", e => {
      tooltip.style("left", (e.pageX + 10) + "px")
             .style("top", (e.pageY - 20) + "px");
    })
    .on("mouseout", () => tooltip.style("display", "none"));
}

function updateLine(data) {
    lineChart.selectAll("*").remove();
    
    // Filter to include only numeric Vintage values
    const numericData = data.filter(d => d.Vintage && !isNaN(+d.Vintage));
    
    // Group data by year (converted to a number) and count entries per year
    const productionByYear = d3.rollup(
      numericData,
      v => v.length,
      d => +d.Vintage
    );
    
    const years = Array.from(productionByYear.keys()).sort((a, b) => a - b);
    if(years.length === 0) return;
    const counts = years.map(year => productionByYear.get(year));
    
    const x = d3.scaleLinear().domain(d3.extent(years)).range([0, width]).nice();
    const y = d3.scaleLinear().domain([0, d3.max(counts)]).range([height, 0]).nice();
    
    // Append and style the x-axis with rotated labels
    lineChart.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(years.length))
      .selectAll("text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-45)")
        .style("font-size", "10px");
    
    lineChart.append("g")
      .call(d3.axisLeft(y));
    
    // Append axis labels
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
      .text("Production Count (# of new Bottles produced)");
    
    const lineFunction = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.count))
        .curve(d3.curveMonotoneX);
    
    const lineData = years.map(year => ({ year: year, count: productionByYear.get(year) }));
    
    lineChart.append("path")
      .datum(lineData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", lineFunction);
    
    lineChart.selectAll("circle")
      .data(lineData)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(d.count))
      .attr("r", 4)
      .attr("fill", "steelblue")
      .on("mouseover", (e, d) => {
        tooltip.style("display", "block")
               .html(`Year: ${d.year}<br>Count: ${d.count}`);
      })
      .on("mousemove", e => {
        tooltip.style("left", (e.pageX + 10) + "px")
               .style("top", (e.pageY - 20) + "px");
      })
      .on("mouseout", () => tooltip.style("display", "none"));
  }