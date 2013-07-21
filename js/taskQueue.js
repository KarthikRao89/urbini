define('taskQueue', ['globals', 'underscore'], function(G, _, $idb) {
  function PriorityQueue() {
    var queue = [];
    return {
      push: function(item) {
        queue.push(item);
        queue.sort(function(a, b) {
          return a.isBlocking ? -1 : a.priority - b.priority;
        });
      },
      
      pop: function() {
        return queue.splice(0, 1)[0];
      },
      
      length: function() {
        return queue.length;
      },
      
      getRawQueue: function() {
        return queue;
      }
    }
  };
  
  function log() {
    var args = [].slice.call(arguments);
    args.unshift("taskQueue");
    G.log.apply(G, args);
  };
  
  function TaskQueue(name) {
    if (!(this instanceof TaskQueue))
      return new TaskQueue(name);
    
    window.taskQueue = this;
    
    var tq = this,
        queue = this.queue = new PriorityQueue('priority'),
        running = this.running = [];
    
    tq.name = name;
    tq.blocked = false;
    
    function runTask(task) {
      if (!(task instanceof Task))
        task = Task.apply(null, arguments);
      
      log('Running task:', task.name);
//      task.notify();
      var promise = task.run();
      running.push(task);
      promise.always(function() {
        log('Task completed:', task.name);
        running.splice(running.indexOf(task), 1);
        tq.blocked = false;
        if (!running.length)
          next();
      });
      
      if (!task.isBlocking)
        next();
      
      return promise;
    }
    
    function queueTask(task) {
      if (!(task instanceof Task))
        task = Task.apply(null, arguments);
      
      var qLength = queue.length();
      log('Checking task:', task.name);
      var isBlocking = task.isBlocking;
      if (isBlocking) {
        tq.blocked = true;
        if (qLength || running.length) {
          log('queueing blocking task:', task.name);
          queue.push(task);
        }        
        else
          runTask(task);
      }
      else {
        if (tq.blocked) {
          log('Queue blocked. Queueing non-blocking task:', task.name);
          queue.push(task);
        }
        else
          runTask(task);
      }
      
      return task.promise();
    };
    
    function next() {
      if (queue.length())
        runTask(queue.pop());
    };
    
    function log() {
      if (!tq.debug)
        return;
      
      console.log.apply(console, arguments);
    };
    
    return {
      log: log,
      debug: function(debug) {
        tq.debug = debug;
      },
      queueTask: queueTask,
      hasTask: function(name) {
        return _.any(this.queue.concat(this.running), function(t) { return t.name == name });
      },
      newTask: function() {
        return Task.apply(null, arguments);
      }
    }
  };
  
  function Task(name, taskFn, isBlocking, priority) {
    if (!(this instanceof Task))
      return new Task(name, taskFn, isBlocking, priority);
    
    var self = this,
        defer = $.Deferred(),
        promise = defer.promise(), 
        started = false;
//        ,
//        onDone = [],
//        onFail = [];
        
    function finish() {
      _.each(onDone, promise.done); 
      _.each(onFail, promise.fail);
    };
    
    this.name = name;
    this.priority = priority || 0;
    this.isBlocking = isBlocking || false;
    this.run = function() {
      started = true;
      taskFn.call(defer, defer); //lazy.start().promise();
      setTimeout(function() {
        if (defer.state() === 'pending') {
          debugger;
          log('Task timed out: ' + self.name);
          defer.reject();
        }
      }, 10000);
      
      return promise;
    };
    
    // allow task consumers to treat the task as a promise
    for (var fn in promise) {
      if (typeof promise[fn] == 'function') {
        this[fn] = promise[fn].bind(promise);
      }
    }
    
    this.isFinished = function() {
      return started && promise.state() == 'resolved';
    };
  };
  
  return TaskQueue;
});