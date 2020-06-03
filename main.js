var dataReady = false

var plot_date = "2020-04-14";
var start_date = new Date("2020-01-01");
var end_date = new Date("2020-06-02");
var quant = "10";

var statById = d3.map();

var colorRangeDark = [	'rgb(247,251,255)',
					'rgb(222,235,247)',
					'rgb(198,219,239)',
					'rgb(158,202,225)',
					'rgb(107,174,214)',
					'rgb(66,146,198)',
					'rgb(33,113,181)',
					'rgb(8,81,156)',
					'rgb(8,48,107)'];

var colorRange = [	'rgb(255, 252, 222)',
					'rgb(249, 222, 190)',
					'rgb(244, 192, 158)',
					'rgb(244, 192, 158)',
					'rgb(234, 133, 95)',
					'rgb(229, 103, 63)',
					'rgb(224, 73, 31)',
					'rgb(219, 44, 0)'];


var quantile = d3.scale.quantile()
		.range(colorRange);
		//.range(colorRangeDark);

var path = d3.geo.path();

var svg = d3.select("#map")
		//.attr("width", width)
		//.attr("height", height)
	.append('svg:g')
    	.call(d3.behavior.zoom().on("zoom", redraw))
  	.append('svg:g');

svg.attr("transform", "scale( " + 1.5 + ")");

// Slider code based on bl.ocks by Mike Bostock, cmdoptesc, and Jane Pong
var moving = false;
var currentValue = 0;
var targetValue = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)*0.80 -50;
var date_slider = d3.select("#slider_date").insert("svg", ":first-child").attr("width", targetValue+105).attr("height", "100px")
var playButton = d3.select("#play-button");
var t_scale = d3.scaleTime()
    .domain([start_date, end_date])
    .range([0, targetValue])
    .clamp(true);

var slider = date_slider.append("g")
    .attr("class", "slider")
    .attr("transform", "translate(50, 50)");
slider.append("line")
		    .attr("class", "track")
		    .attr("x1", t_scale.range()[0])
		    .attr("x2", t_scale.range()[1])
		  .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
		    .attr("class", "track-inset")
		  .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
		    .attr("class", "track-overlay")
		    .call(d3.behavior.drag()
		        .on("dragend", function() { slider.interrupt(); })
		        .on("drag", function() {
		          currentValue = d3.event.x;
		          update(t_scale.invert(currentValue));
		        })
		    );
slider.insert("g", ".track-overlay")
				    .attr("class", "ticks")
				    .attr("transform", "translate(0," + 18 + ")")
				  .selectAll("text")
				    .data(t_scale.ticks(10))
				    .enter()
				    .append("text")
				    .attr("x", t_scale)
				    .attr("y", 10)
						.attr("class", "tick_text")
				    .attr("text-anchor", "middle")
				    .text(function(d) { return d3.timeFormat('%Y-%m-%d')(d);});

var handle = slider.insert("circle", ".track-overlay")
				    .attr("class", "handle")
				    .attr("r", 9);

var label = slider.append("text")
				    .attr("class", "label")
				    .attr("text-anchor", "middle")
				    .text(d3.timeFormat('%Y-%m-%d')(start_date))
				    .attr("transform", "translate(0," + (-25) + ")");

playButton.on("click", function() {
					    var button = d3.select(this);
					    if (button.text() === "Pause") {
					      moving = false;
					      clearInterval(timer);
					      // timer = 0;
					      button.text("Play");
					    } else {
					      moving = true;
					      timer = setInterval(step, 100);
					      button.text("Pause");
					    }
});

function step() {
  update(t_scale.invert(currentValue));
  currentValue = currentValue + (targetValue/300);
  if (currentValue > targetValue) {
    moving = false;
    currentValue = 0;
    clearInterval(timer);
    // timer = 0;
    playButton.text("Play");
  }
}

function redraw() {
  // console.log("here", d3.event.translate, d3.event.scale);
  svg.attr("transform",
      "translate(" + d3.event.translate + ")"
      + " scale(" + d3.event.scale + ")");
}

d3.select("#selectQuantile")
		.on("change", function(){menuChange();});

d3.select("#selectDate")
		.on("change", function(){menuChange();});

var tooltip = d3.select(".tooltip")
	  .style("opacity", 1e-6)
  	  .style("background", "rgba(250,250,250,.7)");

tooltip.append("span").attr("id", "countyName")

function upload_button(callback) {
  var uploader = document.getElementById("uploader");
  var reader = new FileReader();

  reader.onload = function(e) {
    var contents = d3.csv.parse(e.target.result);
    callback(null, contents);
  };

  uploader.addEventListener("change", handleFiles, false);

  function handleFiles() {
    d3.select("#waitingText").select("h3").text("Loading...");
    var file = this.files[0];
    reader.readAsText(file);
  };
};

function save_button(){
  var svg_node = d3.select("svg").node();
  var bbox = svg_node.getBoundingClientRect();
  width = Math.ceil(bbox.width);
  height = Math.ceil(bbox.height);
  var svgString = getSVGString(svg_node).replace(/scale\(.*\)/g, "scale(2)");
  svgString2Image( svgString, 2*width, 2*height, 'png', save ); // passes Blob and filesize String to the callback

	function save( dataBlob, filesize ){
		saveAs( dataBlob, 'chart.png' ); // FileSaver.js function
	}
}

d3.select("#downloadBtn").on("click", save_button)

queue()
	.defer(d3.json, "us.json")
	//.defer(d3.csv, "covid.csv")
	.defer(upload_button)
	.defer(d3.json, "countyPop.json")
	.defer(d3.json, "county_names.json")
	.await(ready);

const q_strings = ["10", "20", "30", "40", "50", "60", "70", "80", "90"];
var errorArray = [];
var counties;
var countyPop;
function ready(error, us, countiesJSON, countyPopJSON, countyNamesJSON) {
	counties = countiesJSON;
	countyPop = countyPopJSON;
	counties.forEach(function(d){
		try{
			d.date = d.id.replace(/-[^-]+$/, "")
			d.id = d.id.replace(/.*-/,"")
			d["str_rep"] = countyNamesJSON[d.id.padStart(5, '0')]
			d.pop = +countyPop[d.id.padStart(5, '0')]

			for (i = 0; i < q_strings.length; ++i){
				d[q_strings[i]] = parseFloat(d[q_strings[i]]).toFixed(6)
				d[q_strings[i]+"pct"] = parseFloat((d[q_strings[i]]/d.pop * 100))
			}

			d.none = '-';
			statById.set(d.date+d.id, d);
		}
		catch(e){
			//remove double lines of csv
			throw e;
		}
	});

	quantile.domain(counties.map(function(d){return d["90"];}));

	countyShapes = svg.append("g")
			.attr("class", "counties")
		.selectAll("path")
			.data(topojson.feature(us, us.objects.counties).features)
		.enter().append("path")

		countyShapes
			.attr("fill", "rgb(200,200,200)")
			.attr("d", path)
					.on("mouseover", function(d){
						d3.select(this)
							.attr("stroke", "rgb(49, 57, 71)")
							.attr("stroke-width", 1)

						tooltip
						    .style("left", (d3.event.pageX + 5) + "px")
						    .style("top", (d3.event.pageY - 5) + "px")
						    .transition().duration(300)
						    .style("opacity", 1)
						    .style("display", "block")
						updateDetails(statById.get(plot_date + d.id));
				})
					.on("mouseout", function(d){
						d3.select(this)
							.attr("stroke", "")
							.attr("stroke-width", .2)

						tooltip.transition().duration(700).style("opacity", 0);
			});


	svg.append("path")
			.datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
			.attr("class", "states")
			.attr("d", path);
	dataReady = true
	d3.select("#waitingText").remove();
  d3.select("#downloadBtnDiv").attr("style", "visibility: visible")
	menuChange();
}

var printDetails = [
					//{'var': 'date', 'print': 'Date'},
					{'var': 'str_rep', 'print': 'County Name'},
					{'var': 'id', 'print': 'FIPS Code'},
					{'var': 'pop', 'print': 'Population'},
					//{'var': 'none', 'print': ''},
					{'var': quant, 'print': 'Deaths'},
				  {'var': quant.concat("pct"), 'print': 'Deaths (%  of pop)'}];
function updateDetails(county){
	//console.log(county)
	tooltip.selectAll("div").remove();
	tooltip.selectAll("div").data(printDetails).enter()
		.append("div")
			.append('span')
				.text(function(d){return (d.print.length > 0) ? d.print + ": " : " - ";})
				.attr("class", "boldDetail")
			.insert('span')
				.text(function(d){
					if (d.var != 'none'){
						if (d.var === 'str_rep'){ return county[d.var];}
						if (d.var.includes('pct')){ return county[d.var].toFixed(8);}
						return d.var != 'id' ? county[d.var].toLocaleString() : county[d.var].padStart(5, '0');
					}})
				.attr("class", "normalDetail");

	d3.select("#countyName").text(county.County);
}

function menuChange(){
	var selectQuantile = document.getElementById('selectQuantile');
	selectQuantileValue = selectQuantile.options[selectQuantile.selectedIndex].value;
	printDetails[3].var=selectQuantileValue

	if (! dataReady){
		return;
	}

	var keyName = selectQuantileValue;
	updateMap(keyName);
}

function updateMap(key){
	quantile.domain(counties.map(function(d){return d[key];}));
	countyShapes
		.transition().duration(1000).ease(d3.ease('linear'))
		.attr("fill", function(d) {
			if (statById.get(plot_date + d.id)){
				if(statById.get(plot_date + d.id)[key] === 0){
					return '#FFFEF5';
				}
				else{
					return quantile(statById.get(plot_date + d.id)[key]);
				}
			}
			else{
				errorArray.push(d.id);
				return "#FFFEF5";
		}});
}

// SVG Saving functions from MIT bl.ocks page by Nikita Rokotyan
function getSVGString( svgNode ) {
	svgNode.setAttribute('xlink', 'http://www.w3.org/1999/xlink');
	var cssStyleText = getCSSStyles( svgNode )
	cssStyleText = cssStyleText.split("border: 2px solid rgb(0, 0, 0);").join("");
	console.log(cssStyleText)
	appendCSS( cssStyleText, svgNode );

	var serializer = new XMLSerializer();
	var svgString = serializer.serializeToString(svgNode);
	svgString = svgString.replace(/(\w+)?:?xlink=/g, 'xmlns:xlink='); // Fix root xlink without namespace
	svgString = svgString.replace(/NS\d+:href/g, 'xlink:href'); // Safari NS namespace fix

	return svgString;

	function getCSSStyles( parentElement ) {
		var selectorTextArr = [];

		// Add Parent element Id and Classes to the list
		selectorTextArr.push( '#'+parentElement.id );
		for (var c = 0; c < parentElement.classList.length; c++)
				if ( !contains('.'+parentElement.classList[c], selectorTextArr) )
					selectorTextArr.push( '.'+parentElement.classList[c] );

		// Add Children element Ids and Classes to the list
		var nodes = parentElement.getElementsByTagName("*");
		for (var i = 0; i < nodes.length; i++) {
			var id = nodes[i].id;
			if ( !contains('#'+id, selectorTextArr) )
				selectorTextArr.push( '#'+id );

			var classes = nodes[i].classList;
			for (var c = 0; c < classes.length; c++)
				if ( !contains('.'+classes[c], selectorTextArr) )
					selectorTextArr.push( '.'+classes[c] );
		}

		// Extract CSS Rules
		var extractedCSSText = "";
		for (var i = 0; i < document.styleSheets.length; i++) {
			var s = document.styleSheets[i];

			try {
			    if(!s.cssRules) continue;
			} catch( e ) {
		    		if(e.name !== 'SecurityError') throw e; // for Firefox
		    		continue;
		    	}

			var cssRules = s.cssRules;
			for (var r = 0; r < cssRules.length; r++) {
				if ( contains( cssRules[r].selectorText, selectorTextArr ) )
					 extractedCSSText += cssRules[r].cssText.replace("border: 2px solid rgb(0, 0, 0);", "");
			}
		}


		return extractedCSSText;

		function contains(str,arr) {
			return arr.indexOf( str ) === -1 ? false : true;
		}

	}

	function appendCSS( cssText, element ) {
		var styleElement = document.createElement("style");
		styleElement.setAttribute("type","text/css");
		styleElement.innerHTML = cssText;
		var refNode = element.hasChildNodes() ? element.children[0] : null;
		element.insertBefore( styleElement, refNode );
	}
}


function svgString2Image( svgString, width, height, format, callback ) {
	var format = format ? format : 'png';

	var imgsrc = 'data:image/svg+xml;base64,'+ btoa( unescape( encodeURIComponent( svgString ) ) ); // Convert SVG string to data URL

	var canvas = document.createElement("canvas");
	var context = canvas.getContext("2d");

	canvas.width = width;
	canvas.height = height;

	var image = new Image();
	image.onload = function() {
		context.clearRect ( 0, 0, width, height );
		context.drawImage(image, 0, 0, width, height);

		canvas.toBlob( function(blob) {
			var filesize = Math.round( blob.length/1024 ) + ' KB';
			if ( callback ) callback( blob, filesize );
		});


	};

	image.src = imgsrc;
}

function update(h) {
  // update position and text of label according to slider scale
  handle.attr("cx", t_scale(h));
	plot_date = d3.timeFormat('%Y-%m-%d')(h)
  label
    .attr("x", t_scale(h))
    .text(plot_date);
	menuChange();

  // filter data set and redraw plot
  //var newData = dataset.filter(function(d) {
  //  return d.date < h;
  //})
  //drawPlot(newData);
}
