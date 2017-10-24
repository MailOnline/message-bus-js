import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinonChai from 'sinon-chai'

chai.use(chaiAsPromised)
chai.use(sinonChai)

export {chai}
export const {expect} = chai
