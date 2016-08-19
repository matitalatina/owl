//var say = require('say');

var Wemo = require('wemo-client');
var wemo = new Wemo();

wemo.discover(function(deviceInfo) { 
  // Get the client for the found device 
  var client = wemo.client(deviceInfo);
  
  var OWL = require('./owlintuition.js');
  var owl = new OWL();

  var status = 0

  owl.monitor();

  owl.on('solar', function(event) {
	var json = JSON.parse(event)
	//console.log("Generating " + json.current[0].generating)
	//say.speak('Ci sono ' + Math.floor(json.current[1].exporting) + 'watt da consumare', 'Alice')
  	var exporting = json.current[1].exporting;
  	console.log("Esportando " + exporting);
  	if (exporting > 700 && status == 0) {
  	  client.setBinaryState(1);
  	  status = 1;
  	  console.log("Accesa")
  	} else {
  	  client.setBinaryState(0);
  	  status = 0;
  	  console.log("Spenta")
  	}
  });

 //  owl.on('electricity', function( event ) {
	// var json = JSON.parse(event)
	// console.log("Consuming " + json.channels[0][0].current)
 //  });
});
