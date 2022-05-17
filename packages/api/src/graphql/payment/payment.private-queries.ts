import {Context} from '../../context'
import {authorise, CanGetPayment} from '../permissions'

export const getPaymentById = (
  id: string,
  authenticate: Context['authenticate'],
  paymentsByID: Context['loaders']['paymentsByID']
) => {
  const {roles} = authenticate()
  authorise(CanGetPayment, roles)

  return paymentsByID.load(id)
}
