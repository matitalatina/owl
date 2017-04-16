let Wemo = require('wemo-client');
let moment = require('moment');
let OWL = require('./owlintuition.js');
let express = require('express');
let AppHistory = require('./app/history.js');
let _ = require('lodash');
let cron = require('cron');
let app = express();
let plugRepo = new (require('./app/plug-repo.js'))();
let plugHandler = new (require('./app/plug-handler.js'))();

moment.locale('it');

let plugPower = 700;
const port = 8080;
const CHECK_PLUGS_INTERVAL = '*/5 * * * * *';
const DISCOVER_WEMO_INTERVAL = '*/10 * * * * *';
const MAX_ADDITIONAL_POWER_ALLOWED = 1;
const AUTO_RESTART_INTERVAL = 5000;

let wemo = new Wemo();

let appHistory = new AppHistory();

let exporting = 0;
let generating = 0;
let consuming = 0;

let signal = {
  timestamp: moment(),
  signal: {
    rssi: 0,
    lqi: 0
  }
};

function discoverNewWemoPlugs() {
  wemo.discover(function (deviceInfo) {
    // Get the client for the found device 
    let client = wemo.client(deviceInfo);
    let UDN = client["UDN"];
    console.log("Found " + UDN);
    plugRepo.addPlug(client);

    client.on('binaryState', function (value) {
      plugRepo.getStatuses()[UDN] = _.min([parseInt(value), 1]);
      console.log(UDN + ': %s', value);
    });
  });
}

function startOwlMonitor() {
  let owl = new OWL();

  owl.on('solar', function (event) {
    let json = JSON.parse(event);
    exporting = parseInt(json.current[1].exporting);
    generating = parseInt(json.current[0].generating);

    console.log("Esportando " + exporting);
    console.log("Generando " + generating);
  });

  owl.on('electricity', function (event) {
    let json = JSON.parse(event);
    appHistory.add({
      exporting: exporting,
      generating: generating,
      consuming: consuming,
      timestamp: moment(),
      active: _.sum(_.values(plugRepo.getStatuses()))
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
}

function startCronJobs() {
  new cron.CronJob(CHECK_PLUGS_INTERVAL, () => plugHandler.checkPlugs(generating, exporting, consuming, plugPower, MAX_ADDITIONAL_POWER_ALLOWED), null, true);
  new cron.CronJob(DISCOVER_WEMO_INTERVAL, discoverNewWemoPlugs, null, true);
}

function startServer() {
  app.set('view engine', 'pug');
  app.use('/bower_components', express.static(__dirname + '/bower_components'));
  app.get('/', function (req, res) {
    if ('plugPower' in req.query) {
      plugPower = parseInt(req.query['plugPower']);
    }
    console.log(appHistory.getHistory());
    let plugs = plugRepo.getPlugs();
    let context = {
      plugPower: plugPower,
      plugs: Object.keys(plugs).map((UDN) => {
        return {
          name: plugs[UDN].device.friendlyName,
          status: plugRepo.getStatuses()[UDN] == 0 ? 'spenta' : 'accesa'
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
}

function onStart() {
  startOwlMonitor();
  startCronJobs();
  startServer();
}

try {
  onStart();
} catch (err) {
  setTimeout(onStart, AUTO_RESTART_INTERVAL);
}