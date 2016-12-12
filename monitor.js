import fs from 'fs';
import config from 'config';
import Monitor from './core/monitor';
import Analyzer from './core/analyzer';
import mongoose from './bootstrap';

const monitor = new Monitor(config.monitor);
const analyzer = new Analyzer(config.analyzer);

// load plugins
config.plugins.forEach(function(pluginName) {
  const plugin = require(pluginName);
  if (typeof plugin.initMonitor !== 'function') return;
  console.log('loading plugin %s on monitor', pluginName);
  plugin.initMonitor({
    monitor: monitor,
    config:  config
  });
});

// start the monitor
monitor.start();
analyzer.start();

export default monitor;
