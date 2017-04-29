'use strict';

const plugRepo = new (require('./plug-repo.js'))();
const _ = require('lodash');
let config = require('./config.js');
const historyRepo = new (require('./history.js'))();

let cooldownCount = 0;

class PlugHandler {
  constructor (isActive = true) {
    this.isActive = isActive;
    this.plugPower = config.PLUG_POWER_DEFAULT;
  }
  
  set isActive (isActive) { this._isActive = isActive; }
  get isActive () { return this._isActive; }
  
  set plugPower (plugPower) { this._plugPower = plugPower; }
  get plugPower () { return this._plugPower; }
  
  handlePlug(UDN) {
    let self = this;
    const latestUpdate = historyRepo.getLatestUpdate();
    //console.log('CHECK ' + UDN);
    //console.log(status[UDN] > 0, (generating + plugPower * MAX_ADDITIONAL_POWER_ALLOWED - consuming <= 0));
    plugRepo.getPlugs()[UDN].getBinaryState(function (err, response) {
      console.log(UDN + ' ' + response + ' ' + err);
      let plugStatus = plugRepo.getStatuses();
      if (err) {
        // remove 
        plugRepo.removePlug(UDN);
        plugStatus.splice(UDN, 1);
      } else {
        plugStatus[UDN] = _.min([parseInt(response), 1]);
        if (cooldownCount <= 0) {
          if (plugStatus[UDN] == 0 && latestUpdate.exporting >= self.plugPower) {
            console.log(UDN + ' accendo');
            plugRepo.getPlugs()[UDN].setBinaryState(1);
            plugStatus[UDN] = 1;
            cooldownCount = config.COOLDOWN_COUNTS_DEFAULT;
          } else if (plugStatus[UDN] > 0 &&
            (latestUpdate.generating + self.plugPower * config.MAX_ADDITIONAL_POWER_ALLOWED - latestUpdate.consuming <= 0)) {
            console.log(UDN + ' spengo');
            plugRepo.getPlugs()[UDN].setBinaryState(0);
            plugStatus[UDN] = 0;
            cooldownCount = config.COOLDOWN_COUNTS_DEFAULT;
          }
        }
      }
    });
  }
  
  checkPlugs() {
    //console.log('Potenza soglia: ' + plugPower);
    //console.log('Cooldown count: ' + cooldownCount)
    if (this.isActive && cooldownCount <= 0) {
      for (var UDN in plugRepo.getPlugs()) {
        this.handlePlug(UDN);
      }
    } else {
      cooldownCount--;
    }
  }
}

var exports = module.exports = PlugHandler;