'use strict';

const moment = require('moment');
const MAX_HISTORY_ELEMS = 100;

let history = [];

/*
  {
    exporting: 0,
    generating: 0,
    consuming: 0,
    timestamp: moment(),
    active: 1
  }
*/
class AppHistory {

  add(update) {
    history.push(update);
    history = history.slice(-MAX_HISTORY_ELEMS);
  }

  getHistory() {
    return [].concat(history);
  }

  getLatestUpdate() {
    let history = this.getHistory();
    return history[history.length - 1] || this.getDefaultValue();
  }

  getDefaultValue() {
    return {
      exporting: 0,
      generating: 0,
      consuming: 0,
      timestamp: moment(),
      active: 0
    };
  }
}

module.exports = AppHistory;
