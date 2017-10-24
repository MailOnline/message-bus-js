export class MessageBusError extends Error {
}

export class TimeoutError extends MessageBusError {
  constructor(brokers) {
    super()
    this.brokers = brokers
  }
}

export class NoEndpointRegisteredError extends MessageBusError {
  constructor(endpoint) {
    super(JSON.stringify(endpoint))
    this.endpoint = endpoint
  }
}
