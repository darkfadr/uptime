/**
 * Monitor constructor
 *
 * The monitor pings the checks regularly and saves the response status and time.
 * The monitor doesn't interact with the model classes directly, but instead uses
 * the REST HTTP API. This way, the monitor can run on a separate process, so that the
 * ping measurements don't get distorted by a heavy usage of the GUI.
 *
 * The constructor expects a configuration object as parameter, with these properties:
 *   pollingInterval:   Interval between each poll in milliseconds, defaults to 10 seconds
 *   timeout:           Request timeout in milliseconds, defaults to 5 seconds
 *
 */

import url from 'url';
import http from 'http';
import EventEmitter from 'events';
import {Ping, Check} from '../models';
import PollerCollection from './pollers/pollerCollection';


class Monitor extends EventEmitter{
  constructor(config) {
    super()
    config.pollingInterval = config.pollingInterval || 10 * 1000;
    config.timeout = config.timeout || 5 * 1000;
    this.config = config;
    this.pollerCollection = new PollerCollection();
  }
  start(){
    // start polling right away
    this._pollChecks();
    // schedule future polls
    this.intervalForPoll   = setInterval(this._pollChecks.bind(this), this.config.pollingInterval);
    console.log('Monitor ' + this.config.name + ' started');
  }
  stop(){
    clearInterval(this.intervalForPoll);
    console.log('Monitor ' + this.config.name + ' stopped');
  }
  _pollChecks(callback){
    var self = this;
    Check
    .needingPoll()
    .select({qos: 0})
    .exec(function(err, checks) {
      if (err) {
        console.error(err);
        callback && callback(err);
        return;
      }
      checks.forEach((check) =>  {
        self._poll(check, (err) => err && console.log(err));
      });
    });
  }
  _poll(check, callback){
    if (!check) return;
    let Poller, p;
    const now = Date.now();
    const self = this;
    const details = {};

    // change lastTested date right away to avoid polling twice if the target doesn't answer in timely fashion
    Check.update({ _id: check._id }, { lastTested: new Date() });
    
    try {
      Poller = this.pollerCollection.getForType(check.type || 'http');
    } catch (unknownPollerError) {
      return self.createPing(unknownPollerError, check, now, 0, details, callback);
    }
    var pollerCallback = function(err, time, res, pollerDetails) {
      if (err) {
        return self.createPing(err, check, now, time, pollerDetails || details, callback);
      }
      try {
        self.emit('pollerPolled', check, res, pollerDetails || details);
        self.createPing(null, check, now, time, pollerDetails || details, callback);
      } catch (error) {
        return self.createPing(error, check, now, time, pollerDetails || details, callback);
      }
    };
    try {
      p = new Poller(check.url, this.config.timeout, pollerCallback);
      if ('setUserAgent' in p) {
        p.setUserAgent(this.config.userAgent);
      }
      self.emit('pollerCreated', p, check, details);
    } catch (incorrectPollerUrl) {
      return self.createPing(incorrectPollerUrl, check, now, 0, details, callback);
    }
    //p.setDebug(true);
    p.poll();
  }
  createPing(error, check, timestamp, time, details, callback){
    const status = error && false || true;
    const {name} = this.config;

    Check.findById(check._id, (err1, check) => {
      if (err1) return  callback(err1);
      if (!check) return  callback(`Error: No existing check with id ${req.body.checkId}`);
      if (!check.needsPoll) return  callback('Error: This check was already polled. No ping was created');
      
      Ping.createForCheck({status, timestamp, time, check, monitorName: name, error, details},  (err2, ping) => {
        if (err2) return callback(err2);
        console.log('created ping', ping);
        callback && callback(null, ping)
      });
    });
  }
}


export default Monitor;
