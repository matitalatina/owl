var Wemo = require('wemo-client');
var wemo = new Wemo();

var status = 0
 
wemo.discover(function(deviceInfo) {
  console.log('Wemo Device Found: %j', deviceInfo);
 
  // Get the client for the found device 
  var client = wemo.client(deviceInfo);
 
  // Handle BinaryState events 
  client.on('binaryState', function(value) {
    console.log('Binary State changed to: %s', value);
  });
 
  // Turn the switch on 
  setInterval(function () {
  	status = (status+1)%2
  	console.log(status)
  	client.setBinaryState(status);
  }, 3000);
});