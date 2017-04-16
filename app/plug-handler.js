let plugRepo = new (require('./plug-repo.js'))();
let _ = require('lodash');

const COOLDOWN_COUNTS_DEFAULT = 2;

let cooldownCount = 0;

class PlugHandler {
  constructor (isActive = true) {
    this.isActive = isActive;
  }
  
  set isActive (isActive) { this._isActive = isActive; }
  get isActive () { return this._isActive; }
  
  handlePlug(UDN, generating, exporting, consuming, plugPower, MAX_ADDITIONAL_POWER_ALLOWED) {
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
          if (plugStatus[UDN] == 0 && exporting >= plugPower) {
            console.log(UDN + ' accendo');
            plugRepo.getPlugs()[UDN].setBinaryState(1);
            plugStatus[UDN] = 1;
            cooldownCount = COOLDOWN_COUNTS_DEFAULT;
          } else if (plugStatus[UDN] > 0 &&
            (generating + plugPower * MAX_ADDITIONAL_POWER_ALLOWED - consuming <= 0)) {
            console.log(UDN + ' spengo');
            plugRepo.getPlugs()[UDN].setBinaryState(0);
            plugStatus[UDN] = 0;
            cooldownCount = COOLDOWN_COUNTS_DEFAULT;
          }
        }
      }
    });
  }
  
  checkPlugs(generating, exporting, consuming, plugPower, MAX_ADDITIONAL_POWER_ALLOWED) {
    //console.log('Potenza soglia: ' + plugPower);
    //console.log('Cooldown count: ' + cooldownCount)
    if (cooldownCount <= 0) {
      for (var UDN in plugRepo.getPlugs()) {
        this.handlePlug(UDN, generating, exporting, consuming, plugPower, MAX_ADDITIONAL_POWER_ALLOWED);
      }
    } else {
      cooldownCount--;
    }
  }
}

var exports = module.exports = PlugHandler;