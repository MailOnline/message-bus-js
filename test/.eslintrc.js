const conf = require('../.eslintrc.js')

module.exports = Object.assign({}, conf, {
  env: {
    browser: true,
    mocha: true
  },
  globals: Object.assign({}, conf.globals, {
    assert: false,
    async: false,
    chai: false,
    expect: false,
    DM: true,
    sinon: false
  }),
  rules: Object.assign({}, conf.rules, {
    'no-unused-expressions': [0]
  })
})
