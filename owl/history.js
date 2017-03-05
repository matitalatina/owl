const MAX_HISTORY_ELEMS = 100;

class OwlHistory {
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
}

var exports = module.exports = OwlHistory;