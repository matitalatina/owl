'use strict';
const Loki = require('lokijs');

const PLUG_POWER_DEFAULT = 700;
const WEB_PORT = 8080;
const CHECK_PLUGS_INTERVAL = '*/5 * * * * *';
const DISCOVER_WEMO_INTERVAL = '*/10 * * * * *';
const MAX_ADDITIONAL_POWER_ALLOWED = 1;
const AUTO_RESTART_INTERVAL = 5000;
const COOLDOWN_COUNTS_DEFAULT = 2;
const CONFIG_COLLECTION_NAME = 'config';

let _plugPower = null;
const environment = process.env.ENVIRONMENT;

let configCollection = getCollection();

class Config {
  static get PLUG_POWER_DEFAULT() {
    return PLUG_POWER_DEFAULT;
  }
  static get WEB_PORT() {
    return WEB_PORT;
  }
  static get CHECK_PLUGS_INTERVAL() {
    return CHECK_PLUGS_INTERVAL;
  }
  static get DISCOVER_WEMO_INTERVAL() {
    return DISCOVER_WEMO_INTERVAL;
  }
  static get MAX_ADDITIONAL_POWER_ALLOWED() {
    return MAX_ADDITIONAL_POWER_ALLOWED;
  }
  static get AUTO_RESTART_INTERVAL() {
    return AUTO_RESTART_INTERVAL;
  }
  static get COOLDOWN_COUNTS_DEFAULT() {
    return COOLDOWN_COUNTS_DEFAULT;
  }

  static get plugPower() {
    return this.rawConfig.plugPower || PLUG_POWER_DEFAULT;
  }
  static set plugPower(plugPower) {
    _plugPower = plugPower;
    this.persist();
  }

  static reset() {
    this.plugPower = PLUG_POWER_DEFAULT;
  }

  static get rawConfig() {
    if (!configCollection) {
      return {};
    }

    let rawConfig = configCollection.findOne({
      id: CONFIG_COLLECTION_NAME
    });

    if (!rawConfig) {
      rawConfig = configCollection.insert({
        id: CONFIG_COLLECTION_NAME,
        plugPower: PLUG_POWER_DEFAULT
      });
    }

    return rawConfig;
  }

  static persist() {
    if (!configCollection) {
      return;
    }
    let updatedRawConfig = Object.assign(this.rawConfig, {
      plugPower: _plugPower
    });
    configCollection.update(updatedRawConfig);
  }

}

function getCollection() {
  const db = new Loki(`${environment}.db`, {
    autosave: true,
    autoload: true,
    autoloadCallback: () => {
      let coll = db.getCollection(CONFIG_COLLECTION_NAME);

      if (!coll) {
        coll = db.addCollection(CONFIG_COLLECTION_NAME);
      }

      configCollection = coll;
    }
  });
}

module.exports = Config;
