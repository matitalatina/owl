'use strict';

let Wemo = require('wemo-client');
let moment = require('moment');
let OWL = require('./owlintuition.js');
let express = require('express');
let AppHistory = require('./app/history.js');
let _ = require('lodash');
let cron = require('cron');
let bodyParser = require('body-parser');
let app = express();
let plugRepo = new (require('./app/plug-repo.js'))();
let plugHandler = new (require('./app/plug-handler.js'))();
let config = require('./app/config.js');

moment.locale('it');

const port = config.WEB_PORT;

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
  new cron.CronJob(config.CHECK_PLUGS_INTERVAL, () => plugHandler.checkPlugs(), null, true);
  new cron.CronJob(config.DISCOVER_WEMO_INTERVAL, discoverNewWemoPlugs, null, true);
}

function startServer() {
  app.set('view engine', 'pug');
  app.use('/bower_components', express.static(__dirname + '/bower_components'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  
  app.get('/', renderHome);
  
  app.post('/', function (req, res) {
    
    if ('plugPower' in req.body) {
      plugHandler.plugPower = parseInt(req.body['plugPower']);
    }
    
    plugHandler.isActive = !!req.body.isActive;
    
    renderHome(req, res);
  });

  app.listen(port, function () {
    console.log('Listening on port ' + port);
  });
}

function renderHome(req, res) {
  console.log(plugHandler.isActive)
  let plugs = plugRepo.getPlugs();
  let context = {
    isActive: plugHandler.isActive,
    plugPower: plugHandler.plugPower,
    plugs: Object.keys(plugs).map((UDN) => {
      return {
        name: plugs[UDN].device.friendlyName,
        status: plugRepo.getStatuses()[UDN] == 0 ? 'spenta' : 'accesa'
      }
    }),
    latestUpdate: appHistory.getLatestUpdate(),
    signal: Object.assign({}, signal, {
      timestamp: signal.timestamp.fromNow()
    }),
    appHistory: appHistory.getHistory()
  };
  res.render('index.pug', context);
}

function onStart() {
  startOwlMonitor();
  startCronJobs();
  startServer();
}

try {
  onStart();
} catch (err) {
  setTimeout(onStart, config.AUTO_RESTART_INTERVAL);
}