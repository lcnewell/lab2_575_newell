//global function
(function(){
    var attrArray = ["Economic Impact Per Capita", "Barrels Produced Per Year", "Breweries Per Capita", "Number of Breweries", "Gallons Brewed per 21yr Old", "Population"];
    var expressed = attrArray[0];
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 100,
        rightPadding = 10,
        topBottomPadding = 4,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        chartTranslate = "translate(" + leftPadding + "," + topBottomPadding + ")";
    //title frame dimensions
    var headerWidth = window.innerWidth * 0.425,
        headerHeight = 60;
        headertopBottomPadding = 10,
        headerInnerWidth = headerWidth - leftPadding - rightPadding,
        headerInnerHeight = headerHeight - headertopBottomPadding * 2
    //set y-axis to scale proportionally
    var yScale = d3.scaleLinear()
        .domain([0, 800])
        .range([463, 0]);
    function yScaler(domainMax, input) {
        yScale = d3.scaleLinear()
            .domain([0, domainMax + domainMax*.1])
            .range([463, 0]);
        return yScale(input);
    }
window.onload = setMap();

//create map 
function setMap(){
    var width = window.innerWidth * .5,
        height = 525;
    //style container
    var cssContainer = d3.select("body")
        .append("div")
        .attr("class", "cssCont")
        .attr("width", window.innerWidth)
        .attr("height", window.innerHeight);
    var map = d3.select(".cssCont")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height)
    var projection = d3.geoAlbers();
    var path = d3.geoPath()
        .projection(projection);
    d3.queue()
        .defer(d3.json, "data/usaPolygon.topojson")
        .defer(d3.json, "data/land.topojson")
        .defer(d3.csv, "data/beer_stats_2017.csv")
        .await(callback)

    function callback(error, usa, na, beerStats){
        setGraticule(map, path);
        var land = topojson.feature(na, na.objects.ne_110m_land);
        var usa = topojson.feature(usa, usa.objects.ne_110m_admin_1_states_provinces).features;
        var countries = map.append("path")
            .datum(land)
            .attr("class", "countries")
            .attr("d", path);
        usa = joinData(usa, beerStats);
        var colorScale = makeColorScale(beerStats);
        setEnumerationUnits(usa, map, path, colorScale, choropleth);
        setChart(beerStats, colorScale, choropleth);
        createDropDown(beerStats, usa);
        setTitle();
    };

//create graticule lines
function setGraticule(map, path){
    var graticule = d3.geoGraticule()
    .step([5,5]);
    var gratBackground = map.append("path")
        .datum(graticule.outline())
        .attr("class", "gratBackground")
        .attr("d", path)
    var gratLines = map.selectAll(".gratLines")
        .data(graticule.lines())
        .enter()
        .append("path")
        .attr("class", "gratLines")
        .attr("d", path);
};

//join csv and topojson data
function joinData(usa, beerStats){
    var attrArray = ["Economic Impact Per Capita", "Barrels Produced Per Year", "Breweries Per Capita", "Number of Breweries", "Gallons Brewed per 21yr Old", "Population"];
    for (var i=0; i<beerStats.length; i ++){
        var csvRegion = beerStats[i];
        var csvKey = csvRegion.adm1_code;
        
        for (var a=0; a<usa.length; a++){
            var geojsonProps = usa[a].properties;
            var geojsonKey = geojsonProps.adm1_code;
            if (geojsonKey == csvKey){
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvRegion[attr]);
                    usa[a].properties[attr] = val;
                });
            };
        };
    };
    return usa;
};

//create enumeration units 
function setEnumerationUnits(usa, map, path, colorScale, choropleth){
    var states = map.selectAll(".states")
        .data(usa)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "states " + d.properties.adm1_code;
        })
        .attr("d", path)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale);
        })
        .on("mouseover", function(d){
            highlight(d.properties);
        })
        .on("mouseout", function(d){
            dehighlight(d.properties);
        })
       .on("mousemove", moveLabel);

    var desc = states.append("desc")
        .text('{"stroke": "#000", "stroke-width": "0.5px"}');
};

//make color scale 
function makeColorScale(data){
    var colorClass = [
        "#FFFFD9",
        "#EDF8B1",
        "#C7E9B4",
        "#7FCDBB",
        "#41B6C4",
        "#1D91C0",
        "#225EA8",
        "#253494",
        "#081D58"
    ];
  
    var colorScale = d3.scaleQuantile()
        .range(colorClass);
    var minmax = [
        d3.min(data, function(d) { return parseFloat(d[expressed]); }),
        d3.max(data, function(d) { return parseFloat(d[expressed]); })
    ];
    colorScale.domain(minmax);
    return colorScale;
};

function choropleth(props, colorScale){
    var val = parseFloat(props[expressed]);
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#CCC";
    };
};

//create title
function setTitle(){
    var header = d3.select("body")
        .append("svg")
        .attr("width", headerWidth)
        .attr("height", headerHeight)
        .attr("class", "header");
    var headerTitle = header.append("text")
        .attr("x", 40)
        .attr("y", 30)
        .attr("class", "headerTitle")
        .text("Beer Stats by State");
    var source = header.append("text")
        .attr("x", 300)
        .attr("y", 25)
        .attr("class", "source")
        .append("a")
        .attr("href", "https://www.google.com")
        .text("Source: Brewers Assocation State Statistics");
    var headerBackground = header.append("rect")
        .attr("class", "headerBackground")
        .attr("width", headerInnerWidth)
        .attr("height", headerInnerHeight);
    var headerFrame = header.append("rect")
        .attr("class", "headerFrame")
        .attr("width", headerInnerWidth)
        .attr("height", headerInnerHeight)
};

//create chart
function setChart(beerStats, colorScale, choropleth){
    //svg element to hold bar chart
    var chart = d3.select(".cssCont")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");
    //rectangle for chart background styling
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", chartTranslate);

    //create text element for chart title
    var chartTitle = chart.append("text")
        .attr("x", 140)
        .attr("y", 40)
        .attr("class", "chartTitle")
      //  .text
        .text("Number of Variable " + expressed[3] + " in each region");
    //create vertical axis generator
    var yAxis = d3.axisLeft(yScale)
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", chartTranslate)
        .call(yAxis);
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", chartTranslate);
    var bars = chart.selectAll(".bar")  
        .data(beerStats)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.adm1_code;
        })
        .attr("width", chartInnerWidth / beerStats.length - 1)
        .on("mouseover", function(d){
            highlight(d)
        })
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel)
    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');  
    updateChart(bars, beerStats.length, colorScale);
};

//create dropdown menu
function createDropDown(beerStats){
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, beerStats)
        });
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d})
        .text(function(d){ return d});
};

//dropdown change listener handler
function changeAttribute(attribute, beerStats){
    expressed = attribute;
    var colorScale = makeColorScale(beerStats);
    var states = d3.selectAll(".states")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });
    var bars = d3.selectAll(".bar")
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition()
        .delay(function(d, i){
            return i * 20
        })
        .duration(500);
    updateChart(bars, beerStats.length, colorScale);
};

//create function to update chart with changing attribute entry
function updateChart(bars, n, colorScale){
    var maxBar = 0;
    bars.each(function(bar) {
        var barHeight = parseFloat(bar[expressed]);
        if (barHeight > maxBar) {
            maxBar = barHeight;
        }
    });
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })   
        .attr("height", function(d, i){
            return 463 - yScaler(maxBar, parseFloat(d[expressed]));  
        })
        .attr("y", function(d, i){
            return yScaler(maxBar, parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
    var chartTitle = d3.select(".chartTitle")
        .text("Beer Statistics by Individual State");
    var updatedScaler = yScaler(maxBar, 0)
    var yAxis = d3.axisLeft(yScale)
    var axis = d3.selectAll(".axis")
        .call(yAxis);
};

//highlight attributes with mouseover
function highlight(props){
    var selected = d3.selectAll("." + props.adm1_code)
        .style("stroke", "red")
        .style("stroke-width", "2");
    setLabel(props);
};

//dehighlight attributes with mouseout
function dehighlight(props){
    var selected = d3.selectAll("." + props.adm1_code)
        .style("stroke", function(){
            return getStyle(this, "stroke", "first")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width","second")
        });
    function getStyle(element, styleName, order){
        var styleText = d3.select(element)
            .select("desc") // error location
            .text();
        var styleObject = JSON.parse(styleText);
        return styleObject[styleName];
    };
    d3.select(".infolabel").remove();
};

//create attribute label
function setLabel(props){
    var labelAttribute = "<h1>" + props[expressed] + "</h1><b>" + expressed + "</b>";
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.adm1_code + "_label")
        .html(labelAttribute)
    var stateName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.name ? props.name : props.state);
};

//create interactive attribute label with mouse movements
function moveLabel(){
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth -10,
        y2 = d3.event.clientY + 25;
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    var y = d3.event.clientY < 75 ? y2 : y1;
    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};

};
})();


