/**
 * DOM-Batch
 *
 * Eliminates layout thrashing
 * by batching DOM read/write
 * interactions.
 *
 * @author Wilson Page <wilsonpage@me.com>
 */

define('lib/fastdom', ['globals', 'underscore', 'FrameWatch'], function(G, _, FrameWatch) {
  'use strict';
  window._setTimeout = window.setTimeout;
  window._setInterval = window.setInterval;
  window._clearTimeout = window.clearTimeout;
  window._clearInterval = window.clearInterval;

  var FPS = 45,
      FRAME_SIZE = 16,
      MIN_FRAME_SIZE = 5,
      MAX_FRAME_SIZE = 14,
      modeOrder = ['nonDom', 'read', 'write'],
      numModes = modeOrder.length,
      BYPASS = false,
      TIMER_RESOLUTION = 20,
      timerId = 0,
      
      // JOBS
      TYPE_IDX = 0,
      FN_IDX = 1,
      CTX_IDX = 2,
      ARGS_IDX = 3,
      OPTIONS_IDX = 4,
      // END JOBS

      TIMEOUTS = {},
      hasRAF = G.hasRequestAnimationFrame;
  
  /**
   * Creates a fresh
   * FastDom instance.
   *
   * @constructor
   */
  function FastDom() {
    _.bindAll(this, '_frameTask');
    this.frameNum = 0;
    this.timestamps = [];
    this.lastId = 0;
    this.jobs = {};
    this.mode = null;
    this.pending = false;
    this.queue = {};
    for (var i = 0; i < modeOrder.length; i++) {
      this.queue[modeOrder[i]] = [];
    }
    
//    this.frame = this.frame.bind(this);
    for (var prop in this) {
      var val = this[prop];
      if (typeof val == 'function')
        this[prop] = val.bind(this);
    }
  }

  for (var i = 0; i < modeOrder.length; i++) {
    (function(i) {
      var mode = modeOrder[i];
      
      /**
       * @param options - {
       *   throttle: {Boolean} whether this function should be limited to running once per frame,
       *   first: {Boolean} used in combination with 'throttle,' if true will run the first function call, otherwise the last
       * }
       */
      FastDom.prototype[mode] = function(fn, ctx, args, options) {
        var jobs = this.jobs,
            job;
        
        if (options && options.throttle) {
          var first = options.first,
              id,
              jFn;
          
          for (id in jobs) {
            jFn = jobs[id][FN_IDX];
            if (fn === jFn) {
              if (first)
                return;
              else
                this.clear(id);
            }
          }
        }

        job = this.add(mode, fn, ctx, args, options);
        this.queue[mode].push(job._jobId);
        this.request(mode);
        return job._jobId;
      }
    })(i);
  }  
  
  FastDom.prototype.debug = function() {
    if (!G.DEBUG)
      return;
    
    var args = Array.prototype.slice.call(arguments);
    args.unshift('FASTDOM', 'FRAME', this.frameNum);
    console.debug.apply(console, args);
  };

  FastDom.prototype.log = function() {
//    if (!G.DEBUG)
//      return;
    
    var args = Array.prototype.slice.call(arguments);
//    args.unshift('FASTDOM');
    args.unshift('FASTDOM', 'FRAME', this.frameNum);
    G.log.apply(G, args);
//    console.log.apply(console, args);
  };

  /**
   * Removes a job from the queue
   *
   * @param  {Number} id
   * @api public
   */
  FastDom.prototype.clear = function(id) {
    var job = this.jobs[id];
    if (!job) return;

    // Clear reference
    delete this.jobs[id];

    // Defer jobs are cleared differently
    if (job.type === 'defer') {
//      if (job.timer)
//        caf(job.timer);
//      else if (job.timeout)
//        clearTimeout(job.timeout);
//      
      return;
    }

    var list = this.queue[job.type];
    var index = list.indexOf(id);
    if (~index) 
      list.splice(index, 1);
  };

  /**
   * Makes the decision as to
   * whether a the frame needs
   * to be scheduled.
   *
   * @param  {String} type
   * @api private
   */
  FastDom.prototype.request = function(type) {
    if (BYPASS)
      return;
    
    var mode = this.mode;

    // If there is already a frame
    // scheduled, don't schedule another one
    if (this.pending) return;
    
    // If we are currently in mode X, we don't
    // need to scedule a new frame as this
    // job will be emptied from the queue
    if (mode === type) return;

    // If we are doing nonDom work, we don't need to schedule
    // a new frame and this read job will be run
    // after the nonDom queue has been emptied in the
    // currently active frame.
    if (mode === 'nonDom' && type === 'read') return;

    // If we are reading we don't need to schedule
    // a new frame and this write job will be run
    // after the read queue has been emptied in the
    // currently active frame.
    if (mode === 'read' && type === 'write') return;

    // Schedule frame (preserving context)
    this.scheduleFrame();

//    // Set flag to indicate
//    // a frame has been scheduled
//    this.pending = true;
  };

  FastDom.prototype.postponeFrame = function() {
    this.pending = false;
    this.scheduleFrame();
  };

//  FastDom.prototype._frameTaskId = -1;
  FastDom.prototype._frameTask = function() {
//    FrameWatch.unsubscribe(this._frameTaskId);
    FrameWatch.stopListeningToTick(this._frameTask);
    this.frame();
  };
  
  FastDom.prototype.scheduleFrame = function() {
    this.pending = true;
//    FrameWatch.subscribe(this._frameTask, this, null, this._frameTaskId);
    FrameWatch.listenToTick(this._frameTask);
  };

  FastDom.prototype.startFrame = function() {
    this.pending = false;
    this.frameStart = this.time();
  }
  
  /**
   * Generates a unique
   * id for a job.
   *
   * @return {Number}
   * @api private
   */
  FastDom.prototype.uniqueId = function() {
    return ++this.lastId + ''; // so we can use for-in loops, which will convert it to string anyway (and cause trouble if we expect an int elsewhere)
  };

  FastDom.prototype.isOutOfTime = function() {
//    return false;
    this.frameEnd = this.timestamps[this.timestamps.length - 1];
    this._frameTime = this.frameEnd - this.frameStart;
    return this._frameTime >= MAX_FRAME_SIZE; //Math.max(MIN_FRAME_SIZE, MAX_FRAME_SIZE - this.lastBlackoutDuration);
  };
  
  /**
   * Calls each job in
   * the list passed.
   *
   * If a context has been
   * stored on the function
   * then it is used, else the
   * current `this` is used.
   *
   * @param  {Array} list
   * @api private
   */
  FastDom.prototype.flush = function(list) {
    var id,
        postpone,
        lastJob;
    
    while (!(postpone = this.isOutOfTime()) && (id = list.shift())) {
      lastJob = this.jobs[id];
      if (!lastJob)
        continue;
      
      this.run(lastJob);
//      var numTimestamps = this.timestamps.length;
//      this.debug('JOB: ', lastJob, 'TOOK: ', this.timestamps[numTimestamps - 1] - this.timestamps[numTimestamps - 2]);
    }
    
    if (postpone && !this.pending) {
      this.log('POSTPONING: ', this.mode, 'FRAME TOOK: ', this._frameTime);
      // postpone to next frame, keep the current mode
      this.postponeFrame();
      return false;
    }
  };

  FastDom.prototype.time = function() {
    var now = _.now();
    this.timestamps.push(now);
    if (this.timestamps.length > 50)
      Array.removeFromTo(this.timestamps, 0, this.timestamps.length - 10);
    
    return now;
  };
  
  /**
   * Runs any read jobs followed
   * by any write jobs.
   *
   * @api private
   */
  FastDom.prototype.frame = function() {
//    var postponed = false;
    
    // Set the pending flag to
    // false so that any new requests
    // that come in will schedule a new frame
    this.startFrame();
    
    var i = this.mode ? modeOrder.indexOf(this.mode) : 0;
    for (; i < numModes; i++) {
      this.mode = modeOrder[i];
      if (this.flush(this.queue[this.mode]) == false) // postponed to next frame
        return;
    }
    
//    this.log('------------------END OF FRAME----------------------');
    this.mode = null;
  };

//  FastDom.prototype.defer = function(frames, type, fn, ctx, args, options) {
//    if (frames < 0) return;
//    var job = this.add('defer', this[type].bind(this, fn, ctx, args, options)); // use regular queueing mechanism
//    job.timeout = setTimeout(this.run.bind(this, job), 1000 / 60 * frames);
//    return job.id;
//  }

//  var waiting = window.WAITING = [];
  
  /**
   * @return promise object that gets resolved after "frames" frames
   */
  FastDom.prototype.wait = function(frames) {
    var dfd = $.Deferred(),
        promise = dfd.promise(),
        task;
    
//    waiting.push(promise);
//    promise.done(function() {
//      Array.remove(waiting, promise);
//    });
    
    task = FrameWatch.listenToTick(function wrapped() {
      if (!(frames--)) {
        FrameWatch.stopListeningToTick(wrapped);
        dfd.resolve();
        return;
      }
    });
    
    return promise;
  };

  FastDom.prototype.throttle = !hasRAF ? _.debounce : function(fn, time) {
    var self = this,
        timeoutId;
    
    function reset() {
      timeoutId = null;
    }
    
    return function throttled() {
      if (!timeoutId || !resetTimeout(timeoutId)) { // if we couldn't reset the timeout, it means it expired already
        timeoutId = setTimeout(reset, time);
        fn.apply(this, arguments);
      }
    };
  };
  
  FastDom.prototype.waitOne = function() {
    return this.wait(1);
  };

  /**
   * Defers the given job
   * by the number of frames
   * specified.
   *
   * @param  {Number}   frames
   * @param  {Function} fn
   * @api public
   */
  FastDom.prototype.defer = function(frames, type, fn, ctx, args, options) {
    if (BYPASS)
      return this[type](fn, ctx, args, options);
    
    if (frames < 0) 
      throw "Can't defer job by a non-positive number of frames";
    
    var self = this;
    var job = this.add('defer', this[type].bind(this, fn, ctx, args, options)); // use regular queueing mechanism
    
    var task = FrameWatch.listenToTick(function wrapped() {
      if (!(frames--)) {
        FrameWatch.stopListeningToTick(wrapped);
        self.run(job);
        job = null; // prevent circular ref in case job has a property that points to this (like ctx) 
        return;
      }
    });

    return job._jobId;
  };

  /**
   * Adds a new job to
   * the given queue.
   *
   * @param {Array}   list
   * @param {Function} fn
   * @param {Object}   ctx
   * @returns {Number} id
   * @api private
   */
  FastDom.prototype.add = function(type, fn, ctx, args, options) {
    var id = this.uniqueId(),
        job = arguments;
    
    job._jobId = id;
    this.jobs[id] = job;
    
//    var job = this.jobs[id] = {
//      id: id,
//      type: type,
//      fn: fn,
//      ctx: ctx,
//      args: args,
//      options: options
//    };
    
    if (BYPASS)
      this.run(job);
    
    return job;
  };

  FastDom.prototype.queueLength = function() {
    var total = 0;
    for (var type in this.queue) {
      if (type !== 'defer')
        total += this.queue[type].length;
    }
    
    return total;
  };
  
//  FastDom.prototype.whenIdle = function(type, fn, ctx, args, options) {
//    if (BYPASS || this.queueLength() == 0)
//      this[type](fn, ctx, args, options);
//    else
//      this.defer(5, 'nonDom', this.whenIdle.bind(this, type, fn, ctx, args, options));
//  };
  
  /**
   * Called when a callback errors.
   * Overwrite this if you don't
   * want errors inside your jobs
   * to fail silently.
   *
   * @param {Error}
   */
  FastDom.prototype.onError = function() {};

  /**
   * Runs a given job.
   * @param  {Object} job
   * @api private
   */
  FastDom.prototype.run = function(job) {
//    var ctx = job.ctx || this;

    // Clear reference to the job
    delete this.jobs[job._jobId];

//    if (G.DEBUG)
      return this._run(job);
    
//    try { 
//      return this._run(job);
//    } catch(e) {
//      debugger;
//      this.onError(e);
//    }
  };

  FastDom.prototype._run = function(job) {
    // Call the job in
//    var args = job.args,
//        ctx = job.ctx;
    var args = job[ARGS_IDX],
        ctx = job[CTX_IDX],
        fn = job[FN_IDX];
  
//    console.debug('running job', job.fn);
    if (args) {
      if (_.isArray(args) || _.isArguments(args))
        fn.apply(ctx, args);
      else
        fn.call(ctx, args);
    }
    else if (ctx)
      fn.call(ctx);
    else
      fn();
    
    this.time();
    return job;
  }
  
  var fastdom = new FastDom();
  if (hasRAF) {
    FastDom.prototype.debounce = function(fn, time, immediate) {
      var self = this,
          timeoutId,
          originalImmediate = immediate;
      
      return function debounced() {
        var context = this,
            args = arguments;
        
        if (immediate) {
          immediate = false;
          fn.apply(context, args);
          return;
        }
        
        if (!timeoutId) {
          timeoutId = self.setTimeout(function() {
            fn.apply(context, args);
          }, time);
          
          return;
        }
        
        if (self.resetTimeout(timeoutId)) // if we managed to reset the timeout, it means it hasn't expired yet
          return;
  
        // reset to initial conditions and call fn
        timeoutId = null;
        immediate = originalImmediate; 
        fn.apply(context, args);
      };
    };
  
    /**
     * Starts the timeout over, less expensive than setting a new timeout (when debouncing for instance)
     * @return true if the timer was successfully reset, false otherwise
     */
    FastDom.prototype.resetTimeout = function(id) {
//      console.log("TIMEOUT RESET - " + id);
      if (typeof id == 'undefined')
        return false;
      
      var task = TIMEOUTS[id];
      if (task) {
        task._timeLeft = task._timeout;
        return true;
      }
      else
        return false;
    };
  
    /**
     * @return promise object that gets resolved after "frames" frames
     */
    FastDom.prototype.setTimeout = function(fn, ms /*, args... */) {
      ms = ms || 0;
      var args = arguments[2],
          task = arguments,
          id = timerId++,
          frameNum = FrameWatch.getFrameNumber();
      
//      console.log("TIMEOUT SET - " + id);
      task._taskId = id;
      task._timeout = task._timeLeft = ms;
      task._fn = function wrapped() {
        if (frameNum == FrameWatch.getFrameNumber())
          return;
        
        task._timeLeft -= FrameWatch.lastFrameDuration();
        if (task._timeLeft < TIMER_RESOLUTION) {
          delete TIMEOUTS[id];
          if (!FrameWatch.stopListeningToTick(wrapped)) // important to unsubscribe first, otherwise if resetTimeout is called inside fn, it will give the illusion of resetting the timer without actually resetting it
            debugger;
          
          if (args)
            fn.apply(null, args);
          else
            fn();
        }
      };
      
      TIMEOUTS[id] = task;
      FrameWatch.listenToTick(task._fn);
      return id;
    };
    
    FastDom.prototype.clearTimeout = function(id) {
      if (id != null) {
        var timeout = TIMEOUTS[id];
        if (timeout) {
          FrameWatch.stopListeningToTick(timeout._fn);
          delete TIMEOUTS[id];
        }
      }
    };
    
    window.setTimeout = fastdom.setTimeout;
    window.clearTimeout = fastdom.clearTimeout;
    window.resetTimeout = fastdom.resetTimeout;
  }
  else {
    FastDom.prototype.debounce = _.debounce;
    FastDom.prototype.throttle = _.throttle;
    window.resetTimeout = function() { return false };
  }
  
  window.fastdom = fastdom;
  return fastdom;
})