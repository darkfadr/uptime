/**
 * UDP Poller, to check UDP services
 *
 * @param {Mixed} Poller Target (e.g. URL)
 * @param {Number} Poller timeout in milliseconds. Without response before this duration, the poller stops and executes the error callback.
 * @param {Function} Error/success callback
 * @api   public
 */
import util from 'util';
import dgram from 'dgram';
import BasePoller from '../basePoller';

class UdpPoller extends BasePoller {
  constructor(target, timeout, callback) {
    super(target, timeout, callback);
  }
  initialize(){
    // UdpServer Singleton, using self-redefining function
    function getUdpServer() {
      var udpServer = dgram.createSocket('udp4');
      // binding required for getting responses
      udpServer.bind();
      udpServer.on('error', function () {});
      getUdpServer = function() {
        return udpServer;
      };
      return getUdpServer();
    }

    this.udpServer = getUdpServer();
    var reg = new RegExp('udp:\/\/(.*):(\\d{1,5})');
    if(!reg.test(this.target)) {
     console.log(this.target + ' does not seems to be valid udp url');
    }
    var host = reg.exec(this.target);
    this.target = {
      'address': host[1],
      'port': host[2]
    };
  }
  validateTarget(target){
    var reg = new RegExp('udp:\/\/(.*):(\\d{1,5})');
    return reg.test(target);
  }
  poll(){
    super.poll();
    UdpPoller.super_.prototype.poll.call(this);
    const ping = new Buffer(JSON.stringify({'command': 'ping'}));
    this.udpServer.send(ping, 0, ping.length, this.target.port, this.target.address);
    this.udpServer.on("message", this.onResponseCallback.bind(this));
  }
  onResponseCallback(){
    this.debug(this.getTime() + 'ms - got answer from ' + sender.address + ':' + sender.port);
    var cmd;
    try {
      cmd = JSON.parse(message);
    } catch (e) {
      return this.onErrorCallback({ name: "Unparsable answer", message: "server return answer " + message.toString()});
    }
    if (cmd.command === 'pong') {
      this.timer.stop();
      this.debug(this.getTime() + 'ms - Got response');
      this.callback(null, this.getTime(), cmd);
    }
  }
  timeoutReached(){
    super.timeoutReached();
    this.udpServer.removeAllListeners();
  }
}

UdpPoller.type = 'udp';
export default UdpPoller;
