export default class Timer {
	/**
	 * Timer constructor
	 *
	 * @param {Number} timeout in milliseconds
	 * @param {Function} timeout callback
	 * @api   public
	 */
	constructor(timeout, cb) {
	  this.finalTime = false;
	  this.time = Date.now();
	  this.TimerFunction = setTimeout(cb, timeout);
	}
	/**
	 * Get time elapsed since timer construction
	 *
	 * @return {Number} time in milliseconds
	 * @api   public
	 */
	getTime(){
		return this.finalTime || Date.now() - this.time;
	}
	/**
	 * Stop the timer and prevent the call to the timeout callback
	 *
	 * @api   public
	 */
	stop(){
		this.finalTime = this.getTime();
		clearTimeout(this.TimerFunction);
	}
}
