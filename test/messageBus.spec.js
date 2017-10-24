import { MessageBus } from '../src/MessageBus'
import { LoggingMessageBus } from '../src/LoggingMessageBus'
import { expect } from './helpers/chai'
import sinon from 'sinon'

describe('MessageBus', () => {
  let messageBus

  beforeEach(() => {
    messageBus = new MessageBus()
    messageBus.start()
  })

  it('will pass a message', (done) => {
    const receiver = messageBus.broker('receiver')
    expect(receiver).to.be.an('object')
    expect(receiver).to.have.property('on')

    receiver.on('msg', done)

    const sender = messageBus.broker('sender')
    expect(sender).to.be.an('object')
    expect(sender).to.have.property('emit')

    sender.emit('msg')
  })

  it('notifies when subscriber consumed message', done => {
    let count = 0
    messageBus.broker('receiver').on('msg', () => {
      count++
      return Promise.resolve()
    })
    messageBus.broker('receiver2').on('msg', () => {
      return new Promise((resolve, reject) => {
        count++
        setTimeout(resolve, 100)
      })
    })
    let p = messageBus.broker('sender').emit('msg')
    p.then(() => {
      expect(count).to.be.equal(2)
      done()
    })
  })

  it('will pass a message with more arguments than expected', () => {
    let spy = sinon.spy()

    messageBus.broker('receiver').on('msg', spy)

    const sender = messageBus.broker('sender')
    sender.emit('msg', 1)
    expect(spy).to.have.been.calledWith(1)
    sender.emit('msg', 'a', 2)
    expect(spy).to.have.been.calledWith('a', 2)
    expect(spy).to.have.been.calledTwice
  })

  it('will pass a message more arguments than expected to a more specific endpoint', () => {
    let spy = sinon.spy()

    messageBus.broker('receiver').on('msg', 'arg', spy)

    const sender = messageBus.broker('sender')
    sender.emit('msg', 1)
    expect(spy).to.not.have.been.called
    sender.emit('msg', 'arg')
    expect(spy).to.have.been.calledWithExactly()
    sender.emit('msg', 'arg', 1)
    expect(spy).to.have.been.calledWithExactly(1)
    expect(spy).to.have.been.calledTwice
  })

  it('can emit message from inside a message handler', (done) => {
    const proxy = messageBus.broker('proxy')
    proxy.on('msg', () => proxy.emit('another'))
    messageBus.broker('final').on('another', done)
    messageBus.broker('sender').emit('msg')
  })

  it('can stop listening to messges', () => {
    let spy = sinon.spy()
    let sender = messageBus.broker('sender')
    let receiver = messageBus.broker('receiver')
    let sub = receiver.on('msg', () => {
      spy()
      sub.cancel()
    })
    sender.emit('msg')
    sender.emit('msg')
    sender.emit('msg')
    expect(spy).to.have.been.calledOnce
  })

  describe('Dispatcher', () => {
    it('can intercept messages', () => {
      let spy1 = sinon.spy()

      const receiver = messageBus.broker('receiver')
      const sender = messageBus.broker('sender')

      receiver.on('msg', spy1)
      expect(spy1).not.to.have.been.called
      sender.emit('msg')
      expect(spy1).to.have.been.calledOnce

      const oldDispatcher = messageBus.dispatcher
      messageBus.setDispatcher(fn => {})
      sender.emit('msg')
      expect(spy1).to.have.been.calledOnce

      messageBus.setDispatcher(oldDispatcher)
      sender.emit('msg')
      expect(spy1).to.have.been.calledTwice
    })
  })

  describe('intercept', () => {
    it('can break call chain', () => {
      let spy1 = sinon.spy()
      let spy2 = sinon.spy()

      let p1 = messageBus.broker('p1')
      let p2 = messageBus.broker('p2')

      p2.on('msg', spy1)

      messageBus.intercept('msg', spy2)

      p1.emit('msg')

      expect(spy1).to.not.have.been.called
      expect(spy2).to.have.been.calledOnce
      expect(spy2).to.have.been.calledWith(['msg'])
    })

    it('can change msgs', () => {
      let spy1 = sinon.spy()

      let p1 = messageBus.broker('p1')
      let p2 = messageBus.broker('p2')

      p2.on('msg', spy1)

      messageBus.intercept('msg', ([msg, value], done) => {
        done(msg, value + 1)
      })

      p1.emit('msg', 1)

      expect(spy1).to.have.been.calledWith(2)
    })

    it('can intercept all messages', () => {
      let spy1 = sinon.spy()

      messageBus.broker('p2').on('msg', spy1)

      messageBus.intercept(([msg, value], done) => {
        done(msg, value + 1)
      })

      messageBus.broker('p1').emit('msg', 1)

      expect(spy1).to.have.been.calledWith(2)
    })

    it('can chain interceptors', () => {
      let spy1 = sinon.spy()

      messageBus.broker('p2').on('msg', spy1)

      messageBus.intercept(([msg, value], done) => done(msg, value + 'a'))
      messageBus.intercept('msg', ([msg, value], done) => done(msg, value + 'b'))
      messageBus.intercept(([msg, value], done) => done(msg, value + 'c'))
      messageBus.intercept('bla', ([msg, value], done) => done(msg, value + 'd'))

      messageBus.broker('p1').emit('msg', 1)

      expect(spy1).to.have.been.calledWith('1abc')
    })
    it('can intercept messages', () => {
      let spy1 = sinon.spy()
      let spy2 = sinon.spy()
      const receiver = messageBus.broker('receiver')
      receiver.on('yes', spy1)
      receiver.on('no', spy2)

      receiver.intercept((msg, done) => {
        if (msg[0] !== 'no') {
          done()
        }
      })

      const sender = messageBus.broker('sender')
      sender.emit('yes')
      sender.emit('no')
      expect(spy1).to.have.been.calledOnce
      expect(spy2).not.to.have.been.called
    })

    it('can change messages', () => {
      let spy = sinon.spy()
      const receiver = messageBus.broker('receiver')
      receiver.on('final', spy)

      messageBus.intercept((msg, done) => {
        if (msg[0] === 'msg') {
          done('final')
        }
      })

      const sender = messageBus.broker('sender')
      sender.emit('msg')
      expect(spy).to.have.been.calledOnce
    })
  })

  describe('rpc', () => {
    it('simple', () => {
      const p1 = messageBus.broker('p1')
      const p2 = messageBus.broker('p2')
      p1.register('call', () => Promise.resolve(42))
      return p2.invokeAll('call').then(([arg]) => expect(arg).to.be.equal(42))
    })

    it('requests with more arguments than endpoint', () => {
      let p1 = messageBus.broker('p1')
      p1.register('call', () => Promise.resolve(42))
      return Promise.all([
        messageBus.broker('p2').invoke('call', 1, 2).then((arg) => expect(arg).to.be.eql(42)),
        messageBus.broker('p2').invoke({message: ['call', 1, 2]}).then((arg) => expect(arg).to.be.eql(42))
      ])
    })

    it('map promise', () => {
      let p1 = messageBus.broker('p1')
      p1.register('call', () => Promise.resolve(42))

      return messageBus.broker('p2').invoke({
        message: 'call',
        map: p => p.then(arg => arg + 1)
      }).then(arg => expect(arg).to.be.equal(43))
    })

    it('invoke timeout', () => {
      let p1 = messageBus.broker('p1')
      p1.register('call', () => new Promise((resolve, reject) => {}))

      let p = messageBus.broker('p2').invoke({
        message: 'call',
        timeout: 100
      })

      return expect(p).to.eventually.be.rejected
    })

    it('invokeAll timeout', () => {
      let p1 = messageBus.broker('p1')
      p1.register('call', () => new Promise((resolve, reject) => {}))

      let p = messageBus.broker('p2').invokeAll({
        message: 'call',
        timeout: 100
      })

      return p.then(() => {
        throw new Error('it should have failed')
      }).catch(e => {
        expect(e.brokers.map(a => a.id)).to.be.eql(['p1'])
      })
    })

    it('multicast', () => {
      messageBus.broker('p1').register('call', () => Promise.resolve(1))
      messageBus.broker('p2').register('call', () => Promise.resolve(2))
      messageBus.broker('p3').register('call', () => Promise.resolve(3))
      return messageBus.broker('r').invokeAll('call').then(responses => expect(responses.sort()).to.be.eql([1, 2, 3]))
    })

    it('streaming multicast', () => {
      messageBus.broker('p1').register('call', () => Promise.resolve(1))
      messageBus.broker('p2').register('call', () => Promise.resolve(2))
      messageBus.broker('p3').register('call', () => Promise.resolve(3))
      let ps = messageBus.broker('t').request('call')
      expect(ps.length).to.be.equal(3)
      return Promise.all([
        ps[0].then(arg => expect(arg).to.be.equal(1)),
        ps[1].then(arg => expect(arg).to.be.equal(2)),
        ps[2].then(arg => expect(arg).to.be.equal(3))
      ])
    })

    it('multicast stream with timeout', () => {
      messageBus.broker('p1').register('call', () => Promise.resolve(1))
      messageBus.broker('p2').register('call', () => new Promise((resolve, reject) => {}))
      messageBus.broker('p3').register('call', () => Promise.resolve(3))
      let responses = []
      let p = messageBus.broker('r').invokeAll({
        message: 'call',
        timeout: 100,
        map: p => p.then(arg => responses.push(arg))
      })
      return p.catch(() => {
        expect(responses).to.be.eql([1, 3])
      })
    })

    it('can subscribe to messages while responding to rpc call', () => {
      messageBus.broker('p1').register('call', () => new Promise((resolve, reject) => {
        messageBus.broker('p1-1').register('call', () => Promise.resolve(2))
        resolve(1)
      }))
      return messageBus.broker('r').invokeAll('call').then(responses => {
        expect(responses).to.be.eql([1])
      }).then(messageBus.broker('r').invokeAll('call').then(responses => {
        expect(responses).to.be.eql([1, 2])
      }))
    })

    it('receive multiple arguments', () => {
      messageBus.broker('p1').register('call', () => Promise.resolve([1, 2, 3]))
      return messageBus.broker('r').invoke('call').then(responses => {
        expect(responses).to.be.eql([1, 2, 3])
      })
    })

    it('call back when there is no responses', () => {
      return expect(messageBus.broker('r').invokeAll('call')).to.eventually.be.eql([])
    })

    describe('invoke', () => {
      it('resolves', () => {
        const p1 = messageBus.broker('p1')
        const p2 = messageBus.broker('p2')

        p1.register('call', () => Promise.resolve(1))

        return p2.invoke('call').then(arg => expect(arg).to.be.eql(1))
      })

      it('rejects', done => {
        const p1 = messageBus.broker('p1')
        const p2 = messageBus.broker('p2')

        p1.register('call', () => new Promise((resolve, reject) => {
          // eslint-disable-next-line prefer-promise-reject-errors
          reject(1)
        }))

        let p = p2.invoke('call')

        p.catch(arg => {
          expect(arg).to.be.eql(1)
          done()
        })
      })

      it('no receiver', () => {
        const p1 = messageBus.broker('p1')

        let p = p1.invoke('call')

        return expect(p).to.eventually.be.rejected
      })

      it('times out', () => {
        const p1 = messageBus.broker('p1')
        const p2 = messageBus.broker('p2')

        p1.register('call', () => new Promise((resolve, reject) => {}))

        let p = p2.invoke({message: 'call', timeout: 100})

        return expect(p).to.eventually.be.rejected
      })

      it('works with a simple argument', () => {
        const p1 = messageBus.broker('p1')
        const p2 = messageBus.broker('p2')

        p1.register('call', p1 => new Promise((resolve, reject) => {
          resolve(p1 + 1)
        }))

        let p = p2.invoke('call', 41)

        return p.then(arg => expect(arg).to.be.equal(42))
      })
    })
  })
})

describe('LoggingMessageBus', () => {
  let orig
  let messageBus

  beforeEach(() => {
    orig = console.log
    messageBus = new LoggingMessageBus()
  })

  afterEach(() => {
    console.log = orig
  })

  it('logs messages to console.log', () => {
    let spy = sinon.spy()
    console.log = spy
    messageBus.broker('test').on('system ready', () => {})
    messageBus.start()
    expect(spy).to.have.been.called
  })
})
