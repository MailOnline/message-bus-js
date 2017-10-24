import {Broker} from './Broker'
import {NoEndpointRegisteredError, TimeoutError} from './Errors'

export class MessageBus {
  constructor() {
    this.subscriptions = []
    this.interceptors = []
    this.started = false
    this.dispatcher = fn => fn()
  }

  broker(id) {
    return new Broker(this, id)
  }

  emit(sender, ...msg) {
    if (!this.started) {
      (console.warn || console.log).call(console, '[MessageBus]', sender.id, 'is emitting', msg[0], 'before setup is completed. This message might get lost.')
    }
    return this.emitWithInterceptors(sender, ...msg)
  }

  doesMessageMatch(candidate, emittedMessage) {
    let i = 0
    for (; i < candidate.length; i++) {
      if (candidate[i] !== emittedMessage[i]) {
        return false
      }
    }
    return i
  }

  emitWithInterceptors(sender, ...msg) {
    if (this.interceptors.length) {
      let interceptors = this.interceptors.filter(i => this.doesMessageMatch(i.msg, msg) !== false)

      let nextIntercept = (..._msg) => {
        let next = interceptors.shift()
        msg = _msg.length > 0 ? _msg : msg
        if (next) {
          return this.callInterceptor(next.callback, msg, nextIntercept)
        } else {
          return this.emitImmediately(msg)
        }
      }
      return nextIntercept()
    } else {
      return this.emitImmediately(msg)
    }
  }

  callInterceptor(interceptor, msg, done) {
    return interceptor(msg, done)
  }

  emitImmediately(msg) {
    return Promise.all(this.subscriptions.map(subscription => {
      let matchCount
      if ((matchCount = this.doesMessageMatch(subscription.msg, msg)) !== false) {
        return this.callSubscriber(subscription, msg.slice(matchCount))
      }
    }).filter(a => a))
  }

  callSubscriber(subscription, args) {
    const fn = () => subscription.callback.apply(subscription.broker, args)
    return subscription.sync ? fn() : this.dispatcher(fn)
  }

  on(broker, ...msg) {
    let callback = msg[msg.length - 1]
    msg = msg.splice(0, msg.length - 1)
    return this.subscribe(broker, msg, callback)
  }

  register(broker, ...msg) {
    return this.on(broker, ...msg)
  }

  getOptions(broker, ...msg) {
    let options = broker && broker.options || {}
    const firstItem = msg[0]
    if (typeof firstItem === 'object') {
      Object.assign(options, firstItem)
    } else {
      options.message = msg
    }
    if (!Array.isArray(options.message)) {
      options.message = [options.message]
    }
    return options
  }

  request0 (options) {
    let waitingOn = this.subscriptions.map(subscription => ({
      subscription,
      matchCount: this.doesMessageMatch(subscription.msg, options.message)
    })).filter(a => a.matchCount !== false)

    return waitingOn.map(a => {
      let args = options.message.slice(a.matchCount, a.subscription.callback.length + 1)
      let p = this.dispatcher(() => a.subscription.callback.apply(a.subscription.broker, args))
      return options.map ? options.map(p, a.subscription.broker) : p
    })
  }

  request(broker, ...msg) {
    const options = this.getOptions(broker, ...msg)
    if (options.timeout) {
      throw new Error('Timeout not supported for request. Please use either invoke or invokeAll.')
    }
    return this.request0(options)
  }

  invoke(broker, ...msg) {
    const options = this.getOptions(broker, ...msg)
    const ps = this.request0(options)
    if (!ps.length) {
      return Promise.reject(new NoEndpointRegisteredError(msg))
    }
    if (ps.length > 1) {
      console.warn('Total of', ps.length, 'endpoints registered for message', msg)
    }
    return options.timeout ? Promise.race([ps[0], this.createTimeout(options.timeout)]) : ps[0]
  }

  invokeAll(broker, ...msg) {
    const options = this.getOptions(broker, ...msg)
    const allBrokers = []
    const resolvedBrokers = []
    if (options.timeout) {
      let oldMap = options.map
      options.map = (p, endpoint) => {
        allBrokers.push(endpoint)
        let p2 = p.then(() => {
          resolvedBrokers.push(endpoint)
          return p
        })
        return oldMap && oldMap(p2, endpoint) || p2
      }
    }
    const ps = this.request0(options)
    const p = Promise.all(ps)
    if (!options.timeout) {
      return p
    }
    const timeoutPromise = this.createTimeout(options.timeout).catch(() => {
      const failedBrokers = allBrokers.filter(broker => !resolvedBrokers.includes(broker))
      return Promise.reject(new TimeoutError(failedBrokers))
    })
    return Promise.race([p, timeoutPromise])
  }

  createTimeout (timeout) {
    return new Promise((resolve, reject) => setTimeout(() => reject(new Error())), timeout)
  }

  subscribe(broker, msg, callback) {
    let sync = false
    const firstItem = msg[0]
    if (typeof firstItem === 'object') {
      msg = firstItem.message
      if (!Array.isArray(msg)) {
        msg = [msg]
      }
      sync = firstItem.sync || sync
    }

    const subscription = {
      broker,
      msg,
      callback,
      sync,
      cancel: () => {
        // TODO probably a combination of .indexOf and 2 .slice calls would be perform better here
        this.subscriptions = this.subscriptions.filter(s => s !== subscription)
      }
    }
    this.subscriptions.push(subscription)
    return subscription
  }

  intercept(...msg) {
    let callback = msg[msg.length - 1]
    msg = msg.splice(0, msg.length - 1)
    this.interceptors.push({msg, callback})
  }

  start() {
    this.started = true
    const broker = this.broker('MessageBus')
    broker.emit('system ready')
  }

  setDispatcher(dispatcher) {
    this.dispatcher = dispatcher
  }
}
