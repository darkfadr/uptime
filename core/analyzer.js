/**
 * Analyzer
 *
 * The analyzer aggregates the ping data into QoS scores for checks and tags.
 *
 * The constructor expects a configuration object as parameter, with these properties:
 *   updateInterval:          Interval between each update of the QoS score in milliseconds, defaults to 1 minute
 *   qosAggregationInterval:  Interval between each daily and hourly aggregation the QoS score in milliseconds, defaults to 1 hour
 *   pingHistory:             Oldest ping and checkEvent age to keep in milliseconds, defaults to 3 months
 *
 * @param {Object} Monitor configuration
 * @api   public
 */

import async from 'async';
import QosAggregator from './qosAggregator';
import {Ping, Check, CheckEvent, Tag} from '../models';

class Analyzer {
  constructor({updateInterval, qosAggregationInterval, pingHistory}) {
    updateInterval = updateInterval || 60 * 1000;
    qosAggregationInterval = qosAggregationInterval || 60 * 60 * 1000;
    pingHistory = pingHistory || 3 * 31 * 24 * 60 * 60 * 1000;
    this.config = {
      updateInterval,
      qosAggregationInterval,
      pingHistory
    };
  }
  start(){
    const {updateInterval, qosAggregationInterval} = this.config;
    this.intervalForUpdate = setInterval(this._updateAllChecks.bind(this), updateInterval);
    this.intervalForAggregation = setInterval(this._aggregateQos.bind(this), qosAggregationInterval);
  }
  stop(){
    clearInterval(this.intervalForUpdate);
    clearInterval(this.intervalForAggregation);
  }
  _updateAllChecks(callback){
    async.auto({
      update_24h: async.apply(QosAggregator.updateLast24HoursQos.bind(QosAggregator)),
      update_hour: async.apply(QosAggregator.updateLastHourQos.bind(QosAggregator)),
      ensure_tags: ['update_24h', async.apply(Tag.ensureTagsHaveFirstTestedDate.bind(Tag))]
    }, function(err) {
      if (err) console.error(err);
      if (callback) callback(err);
    });
  }
  _aggregateQos(){
    QosAggregator.updateLastDayQos.apply(QosAggregator);
    QosAggregator.updateLastMonthQos.apply(QosAggregator);
    QosAggregator.updateLastYearQos.apply(QosAggregator);
    Ping.cleanup(this.config.pingHistory);
    CheckEvent.cleanup(this.config.pingHistory);
  }
}

export default Analyzer;
