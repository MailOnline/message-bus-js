export class Broker {
  constructor(bus, id) {
    this.bus = bus
    this.id = id
    this.options = {}
  }

  emit(...args) {
    return this.bus.emit(this, ...args)
  }

  on(...args) {
    return this.bus.on(this, ...args)
  }

  register(...args) {
    return this.bus.register(this, ...args)
  }

  request(...args) {
    return this.bus.request(this, ...args)
  }

  intercept(...args) {
    return this.bus.intercept(...args)
  }

  invoke(...args) {
    return this.bus.invoke(this, ...args)
  }

  invokeAll(...args) {
    return this.bus.invokeAll(this, ...args)
  }
}
