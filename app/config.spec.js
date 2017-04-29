'use strict';

const expect = require('chai').expect;

beforeEach(() => {
  let Config = require('./config.js');
  Config.reset();
});

describe('Config', () => {
  let Config = require('./config.js');

  it('should return core configs', () => {
    expect(Config.plugPower).to.be.equal(Config.PLUG_POWER_DEFAULT);
  });

  it('should change plugPower', () => {
    Config.plugPower = 1000;
    expect(Config.plugPower).to.be.equal(1000);
  });

  it('should reset properties', () => {
    Config.plugPower = 1000;
    expect(Config.plugPower).to.be.equal(1000);
    Config.reset();
    expect(Config.plugPower).to.be.equal(Config.PLUG_POWER_DEFAULT);
  });

  it('should persist changes', () => {
    expect(Config.plugPower).to.be.equal(Config.PLUG_POWER_DEFAULT);
    Config.plugPower = 1000;
    expect(Config.rawConfig.plugPower).to.be.equal(1000);
  });
});
