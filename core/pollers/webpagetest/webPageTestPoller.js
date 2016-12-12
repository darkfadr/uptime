/**
 * WebPageTest Poller, to perform WebPageTest analysis on web pages
 *
 * @param {Mixed} Poller Target (e.g. URL)
 * @param {Number} Poller timeout in milliseconds. Without response before this duration, the poller stops and executes the error callback.
 * @param {Function} Error/success callback
 * @api   public
 */
import url from 'url';
import util from 'util';
import config from 'config';
import WebPageTest from 'webPageTest';
import BasePoller from '../basePoller';




class WebPageTestPoller extends BasePoller {
  constructor(target, timeout, callback) {
    super(target, timeout, callback);
  }
  validateTarget(target){
    return url.parse(target).protocol == 'http:';
  }
  initialize(){
    this.timeout = 999999; // We can't know a test duration
    this.wpt = new WebPageTest(config.webPageTest.server || 'www.webpagetest.org', config.webPageTest.key);
  }
  poll(){
    super.poll();
    this.debug('WebPageTest start test [target='+this.target+']');
    this.wpt.runTest(this.target, config.webPageTest.testOptions | {}, this.onTestStartedCallback.bind(this));
  }
  onTestStartedCallback(){
    if (err) {
      console.log(err);
      this.timer.stop();
    } else {
      if (data.statusCode && data.statusCode == 200) {
        this.testId = data.data.testId;
        if (data.data.userUrl) {
          this.userUrl = data.data.userUrl;
        }
        this.debug('WebPageTest test started [testId='+this.testId+']');
        this.checkTestStatus();
      } else {
        return this.onErrorCallback({ name: "Test not started", message: data.statusText});
      }
    }
  }
  checkTestStatus(){
    var self = this;
    this.wpt.getTestStatus(this.testId, function(err, data) {
      if (err) {
        self.debug('WebPageTest checkTestStatus error');
        self.timer.stop();
        return;
      }
      if (data && data.statusCode == 200) {
        self.wpt.getTestResults(self.testId, function(err, data) {
          var docTime = parseInt(data.response.data.average.firstView.docTime, 10);
          self.debug('WebPageTestResults received [docTime=' + docTime + ']');
          self.timer.stop();
          if (self.userUrl) {
            self.callback(null, docTime, {}, { url: self.userUrl });
          } else {
            self.callback(null, docTime, {});
          }
        });
      } else {
        self.testStatusTimeout = setTimeout(self.checkTestStatus.bind(self), 5000);
      }
    }); 
  }
  timeoutReached(){
    super.timeoutReached();
    this.debug('WebPageTestPoller timeoutReached call');

    const self = this;
    if (typeof this.timeout !== undefined) {
      this.wpt.cancelTest(this.testId, function(err,data) {
        self.debug('WebPageTest test started [testId=' + self.testId + ']');
      });
    }
  }
}

WebPageTestPoller.type = 'webpagetest';
export default WebPageTestPoller;
