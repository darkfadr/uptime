import url from 'url';
import util from 'util';
import BasePoller from '../basePoller';

// The http module lacks proxy support. Let's monkey-patch it.
require('../../proxy');

class BaseHttpPoller extends BasePoller {
  constructor(target, timeout, callback) {
    super(target, timeout, callback);
  }
  initialize(){
    if (typeof(this.target) == 'string') {
      this.target = url.parse(this.target);
    }
  }
  setUserAgent(){
    if (typeof this.target.headers == 'undefined') {
      this.target.headers = {};
    }
    this.target.headers['User-Agent'] = userAgent;
  }
  onResponseCallback(){
    var statusCode = res.statusCode.toString();
    if (statusCode.match(/3\d{2}/)) {
      return this.handleRedirectResponse(res); // abstract, see implementations in http and https
    }
    if (statusCode.match(/2\d{2}/) === null) {
      return this.handleErrorResponse(res);
    }
    this.handleOkResponse(res);
  }
  handleErrorResponse(){
    this.request.abort();
    this.onErrorCallback({ name: "NonOkStatusCode", message: "HTTP status " + res.statusCode});
  }
  handleOkResponse(){
    var poller = this;
    var body = '';
    this.debug(this.getTime() + "ms - Status code 200 OK");
    res.on('data', function(chunk) {
      body += chunk.toString();
      poller.debug(poller.getTime() + 'ms - BODY: ' + chunk.toString().substring(0, 100) + '...');
    });
    res.on('end', function() {
      res.body = body;
      poller.timer.stop();
      poller.debug(poller.getTime() + "ms - Request Finished");
      poller.callback(undefined, poller.getTime(), res);
    });
  }
  timeoutReached(){
    super.timeoutReached();
    this.request.removeAllListeners('error');
    this.request.on('error', () => { /* swallow error */ });
    this.request.abort();
  }
}

export default BaseHttpPoller;
