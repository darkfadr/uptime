/**
 * HTTP Poller, to check web pages
 *
 * @param {Mixed} Poller Target (e.g. URL)
 * @param {Number} Poller timeout in milliseconds. Without response before this duration, the poller stops and executes the error callback.
 * @param {Function} Error/success callback
 * @api   public
 */
import fs from 'fs';
import url from 'url';
import util from 'util';
import http from 'http';
import BaseHttpPoller from './baseHttpPoller';
import HttpsPoller from '../https/httpsPoller';

// The http module lacks proxy support. Let's monkey-patch it.
require('../../proxy');

class HttpPoller extends BaseHttpPoller{
  constructor(target, timeout, callback) {
    super(target, timeout, callback);
  }
  validateTarget(target){
    return url.parse(target).protocol == 'http:';
  }
  poll(){
    super.poll();
    this.request = http.get(this.target, this.onResponseCallback.bind(this));
    this.request.on('error', this.onErrorCallback.bind(this));
  }
  // see inherited function BaseHttpPoller.prototype.onResponseCallback
  // see inherited function BaseHttpPoller.prototype.onErrorCallback
  handleRedirectResponse(){
    this.debug(this.getTime() + "ms - Got redirect response to " + res.headers.location);
    var target = url.parse(res.headers.location);
    if (!target.protocol) {
      // relative location header. This is incorrect but tolerated
      this.target = url.parse('http://' + this.target.hostname + res.headers.location);
      this.poll();
      return;
    }
    switch (target.protocol) {
      case 'http:':
        this.target = target;
        this.poll();
        break;
      case 'https:':
        this.request.abort();
        this.timer.stop();
        var elapsedTime = this.timer.getTime();
        // timeout for new poller must be deduced of already elapsed time
        var httpsPoller = new HttpsPoller(target, this.timeout - elapsedTime, this.callback);
        httpsPoller.poll();
        // already elapsed time must be added to the new poller elapsed time 
        httpsPoller.timer.time = httpsPoller.timer.time - elapsedTime;
        break;
      default:
        this.request.abort();
        this.onErrorCallback({ name: "WrongRedirectUrl", message: "Received redirection from http: to unsupported protocol " + target.protocol});
    }
    return;
  }
}
HttpPoller.type = 'http';
export default HttpPoller;