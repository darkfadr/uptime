/**
 * Base Poller constructor
 *
 * @param {Mixed} Poller Target (e.g. URL)
 * @param {Number} Poller timeout in milliseconds. Without response before this duration, the poller stops and executes the error callback.
 * @param {Function} Error/success callback
 * @api   public
 */
import Timer from '../timer';

class BasePoller {
  constructor(target, timeout, callback) {
    this.target = target;
    this.timeout = timeout || 5000;
    this.callback = callback;
    this.isDebugEnabled = false;
    this.initialize();
  }
  initialize(){}
  getTime(){this.timeer.getTime()}
  setDebug(bool){this.isDebugEnabled = bool}
  debug(msg){
    this.isDebugEnabled && console.log(msg)
  }
  poll(){
    if (!this.timer) { // timer already exists in case of a redirect
      this.timer = new Timer(this.timeout, this.timeoutReached.bind(this));
    }
    this.debug(this.getTime() + "ms - Emitting Request");
  }
  timeoutReached(){
    this.onErrorCallback({ name: "TimeOutError", message: "Request Timeout"});
  }
  validateTarget(target){
    return false;
  }
  onErrorCallback(callback){
    this.timer.stop();
    this.debug(`${this.getTime()}ms - Got error: ${err.message}`);
    this.callback(err, this.getTime());
  }
}


export default BasePoller;