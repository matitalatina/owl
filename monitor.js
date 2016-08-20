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
	status[UDN] = 0
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
	for (var UDN in status) {
		if (status[UDN] == 0 && exporting > plugPower) {
			plugs[UDN].setBinaryState(1);
			status[UDN] = 1;
			console.log(UDN + ": Accesa");
			return
		} else if (status[UDN] == 1 && consuming > (generating + 100)) {
			plugs[UDN].setBinaryState(0);
			status[UDN] = 0;
			console.log(UDN + ": Spenta");
			return
		}
	}
}

setInterval(control, 5*1000);
