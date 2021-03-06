'use strict';

let plugs = {};
let plugStatus = {};

class PlugRepo {
  getPlugs() {
    return plugs;
  }

  addPlug(plug) {
    let udn = plug['UDN'];
    this.getPlugs()[udn] = plug;
  }

  removePlug(udn) {
    this.getPlugs().splice(udn, 1);
  }

  getStatuses() {
    return plugStatus;
  }
}

module.exports = PlugRepo;
