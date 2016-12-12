/**
 * HTTPS Poller, to check web pages served via SSL
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
import https from 'https';
import BaseHttpPoller from '../http/baseHttpPoller';

// The http module lacks proxy support. Let's monkey-patch it.
require('../../proxy');

class HttpsPoller extends BaseHttpPoller{
  constructor(target, timeout, callback) {
    super(target, timeout, callback);
    secure = typeof secure !== 'undefined' ? secure : true;
    try {
      if (secure) {
        this.request = https.get(this.target, this.onResponseCallback.bind(this));
      } else {
        this.request = http.get(this.target, this.onResponseCallback.bind(this));
      }
    } catch(err) {
      return this.onErrorCallback(err);
    }
    this.request.on('error', this.onErrorCallback.bind(this));
  }
  validateTarget(target){
    return url.parse(target).protocol == 'https:';
  }
  poll(){
    secure = typeof secure !== 'undefined' ? secure : true;
    try {
      if (secure) {
        this.request = https.get(this.target, this.onResponseCallback.bind(this));
      } else {
        this.request = http.get(this.target, this.onResponseCallback.bind(this));
      }
    } catch(err) {
      return this.onErrorCallback(err);
    }
    this.request.on('error', this.onErrorCallback.bind(this));
  }
  // see inherited function BaseHttpPoller.prototype.onResponseCallback
  // see inherited function BaseHttpPoller.prototype.onErrorCallback
  handleRedirectResponse(){
    secure = typeof secure !== 'undefined' ? secure : true;
    try {
      if (secure) {
        this.request = https.get(this.target, this.onResponseCallback.bind(this));
      } else {
        this.request = http.get(this.target, this.onResponseCallback.bind(this));
      }
    } catch(err) {
      return this.onErrorCallback(err);
    }
    this.request.on('error', this.onErrorCallback.bind(this));
  }
}

HttpsPoller.type = 'https';
export default HttpsPoller;