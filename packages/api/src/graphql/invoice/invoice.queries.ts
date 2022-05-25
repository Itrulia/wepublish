import {Prisma, PrismaClient} from '@prisma/client'
import {DateFilterComparison} from '../../db/common'
import {InvoiceFilter, InvoiceSort} from '../../db/invoice'
import {getSortOrder, SortOrder} from '../queries/sort'

export const createInvoiceOrder = (
  field: InvoiceSort,
  sortOrder: SortOrder
): Prisma.InvoiceFindManyArgs['orderBy'] => {
  switch (field) {
    case InvoiceSort.CreatedAt:
      return {
        createdAt: sortOrder
      }

    case InvoiceSort.ModifiedAt:
      return {
        modifiedAt: sortOrder
      }

    case InvoiceSort.PaidAt:
      return {
        paidAt: sortOrder
      }
  }
}

const createUserFilter = (filter: Partial<InvoiceFilter>): Prisma.InvoiceWhereInput => {
  if (filter?.userID) {
    return {
      userID: filter.userID
    }
  }

  return {}
}

const createMailFilter = (filter: Partial<InvoiceFilter>): Prisma.InvoiceWhereInput => {
  if (filter?.mail) {
    return {
      mail: {
        contains: filter.mail,
        mode: 'insensitive'
      }
    }
  }

  return {}
}

const createPaidAtFilter = (filter: Partial<InvoiceFilter>): Prisma.InvoiceWhereInput => {
  if (filter?.paidAt) {
    const {comparison, date} = filter.paidAt
    const mappedComparison: keyof Prisma.DateTimeNullableFilter =
      comparison === DateFilterComparison.Equal ? 'equals' : comparison

    return {
      paidAt: {
        [mappedComparison]: date
      }
    }
  }

  return {}
}

const createCancelledAtFilter = (filter: Partial<InvoiceFilter>): Prisma.InvoiceWhereInput => {
  if (filter?.canceledAt) {
    const {comparison, date} = filter.canceledAt
    const mappedComparison: keyof Prisma.DateTimeNullableFilter =
      comparison === DateFilterComparison.Equal ? 'equals' : comparison

    return {
      canceledAt: {
        [mappedComparison]: date
      }
    }
  }

  return {}
}

export const createInvoiceFilter = (filter: Partial<InvoiceFilter>): Prisma.InvoiceWhereInput => ({
  AND: [
    createUserFilter(filter),
    createMailFilter(filter),
    createPaidAtFilter(filter),
    createCancelledAtFilter(filter)
  ]
})

export const getInvoices = async (
  filter: Partial<InvoiceFilter>,
  sortedField: InvoiceSort,
  order: 1 | -1,
  cursorId: string,
  skip: number,
  take: number,
  invoice: PrismaClient['invoice']
) => {
  const orderBy = createInvoiceOrder(sortedField, getSortOrder(order))
  const where = createInvoiceFilter(filter)

  const [totalCount, invoices] = await Promise.all([
    invoice.count({
      where: where,
      orderBy: orderBy
    }),
    invoice.findMany({
      where: where,
      skip: skip,
      take: take + 1,
      orderBy: orderBy,
      cursor: cursorId ? {id: cursorId} : undefined
    })
  ])

  const nodes = invoices.slice(0, take)
  const firstInvoice = nodes[0]
  const lastInvoice = nodes[nodes.length - 1]

  const hasPreviousPage = Boolean(skip)
  const hasNextPage = invoices.length > nodes.length

  return {
    nodes,
    totalCount,
    pageInfo: {
      hasPreviousPage,
      hasNextPage,
      startCursor: firstInvoice?.id,
      lastInvoice: lastInvoice?.id
    }
  }
}