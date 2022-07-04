import {Context} from '../../context'
import {authorise, CanCreateInvoice, CanDeleteInvoice} from '../permissions'
import {PrismaClient, Prisma} from '@prisma/client'

export const deleteInvoiceById = async (
  id: number,
  authenticate: Context['authenticate'],
  invoice: PrismaClient['invoice']
) => {
  const {roles} = authenticate()
  authorise(CanDeleteInvoice, roles)

  return invoice.delete({
    where: {
      id
    }
  })
}

type CreateInvoiceInput = Omit<Prisma.InvoiceUncheckedCreateInput, 'items' | 'modifiedAt'> & {
  items: Prisma.InvoiceItemUncheckedCreateWithoutInvoiceInput[]
}

export const createInvoice = (
  {items, ...input}: CreateInvoiceInput,
  authenticate: Context['authenticate'],
  invoice: PrismaClient['invoice']
) => {
  const {roles} = authenticate()
  authorise(CanCreateInvoice, roles)

  return invoice.create({
    data: {
      ...input,
      modifiedAt: new Date(),
      items: {
        create: items
      }
    },
    include: {
      items: true
    }
  })
}

type UpdateInvoiceInput = Omit<
  Prisma.InvoiceUncheckedUpdateInput,
  'items' | 'modifiedAt' | 'createdAt'
> & {
  items: Prisma.InvoiceItemUncheckedCreateWithoutInvoiceInput[]
}

export const updateInvoice = async (
  id: number,
  {items, ...input}: UpdateInvoiceInput,
  authenticate: Context['authenticate'],
  invoice: PrismaClient['invoice']
) => {
  const {roles} = authenticate()
  authorise(CanCreateInvoice, roles)

  return invoice.update({
    where: {id},
    data: {
      ...input,
      items: {
        deleteMany: {
          invoiceId: {
            equals: id
          }
        },
        create: items
      }
    },
    include: {
      items: true
    }
  })
}
