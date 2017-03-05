var Wemo = require('wemo-client');
var moment = require('moment');
var OWL = require('./owlintuition.js');
var express = require('express');
var AppHistory = require('./app/history.js');
var _ = require('lodash');
var app = express();

moment.locale('it');

const plugPower = 900;
const port = 8080;
const CHECK_PLUGS_INTERVAL = 5000;
const DISCOVER_WEMO_INTERVAL = 10000;
const MAX_ADDITIONAL_POWER_ALLOWED = 0.5;

var wemo = new Wemo();
var owl = new OWL();
var appHistory = new AppHistory();

var plugs = [];
var status = [];
var exporting = 0;
var generating = 0;
var consuming = 0;
var signal = {
  timestamp: moment(),
  signal: {
    rssi: 0,
    lqi: 0
  }
};

function discoverNewWemoPlugs() {
  wemo.discover(function (deviceInfo) {
    // Get the client for the found device 
    var client = wemo.client(deviceInfo);
    var UDN = client["UDN"];
    console.log("Found " + UDN);
    plugs[UDN] = client;

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
  appHistory.add({
    exporting: exporting,
    generating: generating,
    consuming: consuming,
    timestamp: moment(),
    active: _.sum(_.values(status))
  });
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
        var activePlugs = _.sum(_.values(status));

        var currentStatus = parseInt(response);
        if ((currentStatus == 0 && status[UDN] == 0) && (exporting >= plugPower)) {
          console.log(UDN + ' accendo');
          plugs[UDN].setBinaryState(1);
          status[UDN] = 1;
        } else if ((currentStatus > 0 && status[UDN] > 0) &&
          (generating + activePlugs * plugPower * MAX_ADDITIONAL_POWER_ALLOWED - consuming <= 0)) {
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
  console.log(appHistory.getHistory());
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
    signal: Object.assign({}, signal, {
      timestamp: signal.timestamp.fromNow()
    }),
    overviewGraph: appHistory.getHistory()
  };
  res.render('index.pug', context);
})

app.listen(port, function () {
  console.log('Listening on port ' + port);
})