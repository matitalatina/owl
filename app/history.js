'use strict';

const moment = require('moment');
const MAX_HISTORY_ELEMS = 100;

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
  constructor() {
    this.history = [];
  }

  add(update) {
    this.history.push(update);
    this.history = this.history.slice(-MAX_HISTORY_ELEMS);
  }

  getHistory() {
    return [].concat(this.history);
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
      active: 1
    };
  }
}

var exports = module.exports = AppHistory;