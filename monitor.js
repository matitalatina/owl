var Wemo = require('wemo-client');
var moment = require('moment');
var OWL = require('./owlintuition.js');
var express = require('express');
var OwlHistory = require('./owl/history.js');
var app = express();

moment.locale('it');

const plugPower = 700;
const port = 8080;
const CHECK_PLUGS_INTERVAL = 5000;
const DISCOVER_WEMO_INTERVAL = 10000;

var wemo = new Wemo();
var owl = new OWL();
var owlHistory = new OwlHistory();

var plugs = [];
var status = [];
var exporting = 0;
var generating = 0;
var consuming = 0;
var signal = {
  timestamp: moment(),
  signal: {rssi: 0, lqi: 0}
};

function discoverNewWemoPlugs() {
  wemo.discover(function (deviceInfo) {
    // Get the client for the found device 
    var client = wemo.client(deviceInfo);
    var UDN = client["UDN"];
    console.log("Found " + UDN);
    plugs[UDN] = client;

    var state = 0;
    
    if (exporting > plugPower) {
      state = 1;
    }
    
    client.setBinaryState(state);
    status[UDN] = state;

    client.on('binaryState', function (value) {
      status[UDN] = parseInt(value);
      console.log(UDN + ': %s', value);
    });
  });
}

owl.on('solar', function (event) {
  var json = JSON.parse(event);
  exporting = parseInt(json.current[1].exporting);
  generating = parseInt(json.current[0].generating);

  console.log("Esportando " + exporting);
  console.log("Generando " + generating);
});

owl.on('electricity', function (event) {
  var json = JSON.parse(event);
  owlHistory.add(json);
  signal = {
    timestamp: moment(),
    signal: {
      quality: Math.min(130 + parseInt(json.signal.rssi), 100),
      lqi: parseInt(json.signal.lqi)
    }
  };
  consuming = parseInt(json.channels[0][0].current);
  console.log("Consumando " + consuming);
});

owl.on('error', function (error) {
  console.log(error);
});

owl.monitor();

function checkPlugs() {
  console.log('Potenza soglia: ' + plugPower);
  for (var UDN in plugs) {
    plugs[UDN].getBinaryState(function (err, response) {
      //console.log(UDN + ' ' + response + ' ' + err);
      if (err) {
        // remove 
        plugs.splice(UDN, 1);
        status.splice(UDN, 1);
      } else {
        var currentStatus = parseInt(response);
        if ((currentStatus == 0 && status[UDN] == 0) && (exporting >= plugPower)) {
          console.log(UDN + ' accendo');
          plugs[UDN].setBinaryState(1);
          status[UDN] = 1;
        } else if ((currentStatus > 0 && status[UDN] > 0) && (exporting <= 0)) {
          console.log(UDN + ' spengo');
          plugs[UDN].setBinaryState(0);
          status[UDN] = 0;
        }
      }
    });
  }
}

setInterval(checkPlugs, CHECK_PLUGS_INTERVAL);
setInterval(discoverNewWemoPlugs, DISCOVER_WEMO_INTERVAL);

app.set('view engine', 'pug');
app.use('/bower_components', express.static(__dirname + '/bower_components'));
app.get('/', function (req, res) {
  if ('plugPower' in req.query) {
    plugPower = parseInt(req.query['plugPower']);
  }
  var context = {
    plugPower: plugPower,
    plugs: Object.keys(plugs).map((UDN) => {
      return {
        name: plugs[UDN].device.friendlyName,
        status: status[UDN] == 0 ? 'spenta' : 'accesa'
      }
    }),
    generating: generating,
    consuming: consuming,
    exporting: exporting,
    signal: Object.assign({}, signal, {timestamp: signal.timestamp.fromNow()})
  };
  res.render('index.pug', context);
})

app.listen(port, function () {
  console.log('Listening on port ' + port);
})