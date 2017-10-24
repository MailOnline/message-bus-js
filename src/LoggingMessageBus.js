import {MessageBus} from './MessageBus'

export class LoggingMessageBus extends MessageBus {
  emit(sender, ...msg) {
    console.group(sender.id, 'emit', msg)
    try {
      return super.emit(sender, ...msg)
    } finally {
      console.groupEnd()
    }
  }

  callSubscriber(subscription, args) {
    console.group('calling', subscription.broker.id)
    try {
      return super.callSubscriber(subscription, args)
    } finally {
      console.groupEnd()
    }
  }

  intercept(...msg) {
    console.group('intercept', msg)
    try {
      return super.intercept(...msg)
    } finally {
      console.groupEnd()
    }
  }

  invoke(sender, ...msg) {
    console.group(sender.id, 'invoke', msg)
    return super.invoke(sender, ...msg).then(() => console.groupEnd())
  }

  request(sender, ...msg) {
    console.group(sender.id, 'request', msg)
    try {
      return super.request(sender, ...msg)
    } finally {
      console.groupEnd()
    }
  }

  callInterceptor(interceptor, msg, done) {
    console.group('callInterceptor', msg)
    try {
      return super.callInterceptor(interceptor, msg, done)
    } finally {
      console.groupEnd()
    }
  }

  subscribe(broker, msgs, callback) {
    console.log(broker.id, 'subscribed to', msgs)
    return super.subscribe(broker, msgs, callback)
  }

  start() {
    return super.start()
  }
}
