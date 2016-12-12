import HttpPoller from './http/httpPoller.js';
import HttpsPoller from './https/httpsPoller.js';
import UdpPoller from './udp/udpPoller.js';
import WebPageTestPoller from './webpagetest/webPageTestPoller.js';

export default class PollerCollection {
  constructor() {
    this.pollers = {};

    [HttpPoller, HttpsPoller, UdpPoller, WebPageTestPoller]
      .forEach(poller => this.add(poller));
  }
  add(poller){
    this.pollers[poller.type] = poller;
  }
  getForType(type){
    if (typeof this.pollers[type] === 'undefined') {
      throw new Error(`Undefined poller type: ${type}`);
    }
    return this.pollers[type];
  }
  guessTypeForUrl(url){
    var match = url.match(/^(\w+):\/\//);
    if (!match || !this.pollers[match[1]]) {
      throw new Error(`Unable to determine poller type from URL ${url}`);
    }
    return match[1];
  }
  getTypes(){
    return Object.keys(this.pollers);
  }
}