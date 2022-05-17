import {Context} from '../../context'
import {authorise, CanGetInvoice} from '../permissions'

export const getInvoiceById = (
  id: string,
  authenticate: Context['authenticate'],
  invoicesByID: Context['loaders']['invoicesByID']
) => {
  const {roles} = authenticate()
  authorise(CanGetInvoice, roles)

  return invoicesByID.load(id)
}
