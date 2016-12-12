/**
 * Console plugin
 *
 * Logs all pings and events (up, down, paused, restarted) on the console
 *
 * Installation
 * ------------
 * This plugin is enabled by default. To disable it, remove its entry 
 * from the `plugins` key of the configuration:
 *
 *   // in config/production.yaml
 *   plugins:
 *     # - ./plugins/console
 */
import chalk from 'chalk';
import {Ping, CheckEvent} from '../../models';

exports.initWebApp = function(enableNewEvents, enableNewPings) {
  if (typeof enableNewEvents == 'undefined') enableNewEvents = true;
  if (typeof enableNewPings == 'undefined') enableNewPings = true;
  if (enableNewEvents) registerNewEventsLogger();
  if (enableNewPings)  registerNewPingsLogger();
};

var registerNewEventsLogger = function() {
  CheckEvent.on('afterInsert', function(checkEvent) {
    checkEvent.findCheck(function(err, check) {
      var messageColor;
      var message = check.name + ' ';
      switch (checkEvent.message) {
        case 'paused':
        case 'restarted':
          message += 'was ' + checkEvent.message;
          messageColor = 'blue';
          break;
        case 'down':
          message += 'went down ' + checkEvent.details;
          messageColor = 'red';
          break;
        case 'up':
          if (checkEvent.downtime) {
            message += 'went back up after ' +  Math.floor(checkEvent.downtime / 1000) + 's of downtime';
          } else {
            message += 'is now up';
          }
          messageColor = 'green';
          break;
        default:
         message += '(unknown event)';
         messageColor = 'bold';
      }

      console.log(timestamp() + chalk[messageColor].bold(message));
    });
  });
};

var registerNewPingsLogger = function() {
  Ping.on('afterInsert', function(ping) {
    ping.findCheck(function(err, check) {
      var message = check.name + ' ';
      message += (ping.isUp) ? chalk.green.bold('OK') : chalk.red.bold(`responded with error "${ping.error}"`);
      console.log(timestamp() + message);
    });
  });
};

function timestamp() {
  return chalk.blue(new Date().toLocaleTimeString()) + ' ';
}