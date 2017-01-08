var plugPower = 700;

var Wemo = require('./wemo-client');
var wemo = new Wemo();

var plugs = []
var status = []

wemo.discover(function(deviceInfo) { 
	// Get the client for the found device 
	var client = wemo.client(deviceInfo);
	var UDN = client["UDN"];
	console.log("Found " + UDN);
	plugs[UDN] = client;

	client.setBinaryState(0);
	status[UDN] = 0;

	client.on('binaryState', function(value) {
    		console.log(UDN + ': %s', value);
    	});
});

var OWL = require('./owlintuition.js');
var owl = new OWL();

owl.monitor();

var exporting = 0;
var generating = 0;
var consuming = 0;

owl.on('solar', function(event) {
	var json = JSON.parse(event);
	exporting = json.current[1].exporting;
	generating = json.current[0].generating;

	console.log("Esportando " + exporting);
	console.log("Generando " + generating);
});

owl.on('electricity', function( event ) {
	var json = JSON.parse(event);
	consuming = json.channels[0][0].current;
	console.log("Consumando " + consuming);
});

function control() {
	console.log('Potenza soglia: ' + plugPower);
	for (var UDN in plugs) {
		plugs[UDN].getBinaryState(function (err, response) {
                        //console.log(UDN + ' ' + response + ' ' + err);
			if (err) { 
                        	// remove 
                                plugs.splice(UDN, 1);
				status.splice(UDN, 1);
                        } else {
				var status = parseInt(response);
				if ((status == 0) && (exporting > plugPower)) {
					plugs[UDN].setBinaryState(1);
					status[UDN] = 1;
				} else if ((status > 0) && (consuming > generating)) {
					plugs[UDN].setBinaryState(0);
					status[UDN] = 0;
				}
                	}
		});
	}
}

setInterval(control, 5*1000);

var express = require('express');
var app = express();
const util = require('util')

app.get('/', function (req, res) {
	if ('plugPower' in req.query) {
		plugPower = parseInt(req.query['plugPower']);
	}
	var html = '<html><body>';
	html += '<h1>Prese</h1>';
	html += '<ul>';
	for (var UDN in plugs) {
		html += '<li>'
		html += plugs[UDN].device.friendlyName
		if (status[UDN] == 0) {
			html += ' spenta';	
		} else {
			html += ' accesa';
		}
		html += '</li>';
	}
	html += '</ul>';
	html += '<h1>Produzione</h1>';
	html += '<ul>';
	html += '<li>Generando: ' + generating + '</li>';
	html += '<li>Consumando: ' + consuming + '</li>';
	html += '<li>Esportando: ' + exporting + '</li>';	
	html += '</ul><br/>';
	html += '<form>Potenza soglia<br/><input type="text" name="plugPower" value="' + plugPower + '"><br/><input type="submit" value="Submit"></form>'
	html += '</body></html>';
	res.send(html);
})

var port = 8080;
app.listen(port, function () {
	console.log('Listening on port ' + port);
})
