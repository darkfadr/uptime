import fs from 'fs';
import config from 'config';
import Monitor from './lib/monitor';

// start the monitor
const monitor = new Monitor(config.monitor);


// load plugins
config.plugins.forEach(function(pluginName) {
  var plugin = require(pluginName);
  if (typeof plugin.initMonitor !== 'function') return;
  console.log('loading plugin %s on monitor', pluginName);
  plugin.initMonitor({
    monitor: monitor,
    config:  config
  });
});

monitor.start();

export default monitor;