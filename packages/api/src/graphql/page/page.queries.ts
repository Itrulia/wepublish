import {Prisma, PrismaClient} from '@prisma/client'
import {PageSort} from '../../db/page'
import {getSortOrder, SortOrder} from '../queries/sort'

export const createPageOrder = (
  field: PageSort,
  sortOrder: SortOrder
): Prisma.PageFindManyArgs['orderBy'] => {
  switch (field) {
    case PageSort.CreatedAt:
      return {
        createdAt: sortOrder
      }

    case PageSort.ModifiedAt:
      return {
        modifiedAt: sortOrder
      }

    case PageSort.PublishedAt:
      return {
        published: {
          publishedAt: sortOrder
        }
      }

    case PageSort.UpdatedAt:
      return {
        published: {
          updatedAt: sortOrder
        }
      }

    case PageSort.PublishAt:
      return {
        pending: {
          publishAt: sortOrder
        }
      }
  }
}

type PageFilter = {
  title: string
  published: boolean
  draft: boolean
  pending: boolean
  shared: boolean
  tags: string[]
  authors: string[]
}

const createTitleFilter = (filter: Partial<PageFilter>): Prisma.PageWhereInput => {
  if (filter.title) {
    const containsTitle = {
      is: {
        title: {
          contains: filter.title
        }
      }
    }

    return {
      OR: [{draft: containsTitle}, {pending: containsTitle}, {published: containsTitle}]
    }
  }

  return {}
}

const createPublishedFilter = (filter: Partial<PageFilter>): Prisma.PageWhereInput => {
  if (filter.published != null) {
    return {
      published: filter.published
        ? {
            isNot: null
          }
        : null
    }
  }

  return {}
}

const createDraftFilter = (filter: Partial<PageFilter>): Prisma.PageWhereInput => {
  if (filter.draft != null) {
    return {
      draft: filter.draft
        ? {
            isNot: null
          }
        : null
    }
  }

  return {}
}

const createPendingFilter = (filter: Partial<PageFilter>): Prisma.PageWhereInput => {
  if (filter.pending != null) {
    return {
      pending: filter.pending
        ? {
            isNot: null
          }
        : null
    }
  }

  return {}
}

const createTagsFilter = (filter: Partial<PageFilter>): Prisma.PageWhereInput => {
  if (filter.tags) {
    const hasTags = {
      is: {
        tags: {hasEvery: filter.tags}
      }
    }

    return {
      OR: [{draft: hasTags}, {pending: hasTags}, {published: hasTags}]
    }
  }

  return {}
}

export const createPageFilter = (filter: Partial<PageFilter>): Prisma.PageWhereInput => ({
  AND: [
    createTitleFilter(filter),
    createPublishedFilter(filter),
    createDraftFilter(filter),
    createPendingFilter(filter),
    createTagsFilter(filter)
  ]
})

export const getPages = async (
  filter: Partial<PageFilter>,
  sortedField: PageSort,
  order: 1 | -1,
  cursorId: string,
  skip: number,
  take: number,
  page: PrismaClient['page']
) => {
  const orderBy = createPageOrder(sortedField, getSortOrder(order))
  const where = createPageFilter(filter)

  const [totalCount, pages] = await Promise.all([
    page.count({
      where: where,
      orderBy: orderBy
    }),
    page.findMany({
      where: where,
      skip: skip,
      take: take + 1,
      orderBy: orderBy,
      cursor: cursorId ? {id: cursorId} : undefined
    })
  ])

  const nodes = pages.slice(0, take)
  const firstPage = nodes[0]
  const lastPage = nodes[nodes.length - 1]

  const hasPreviousPage = Boolean(skip)
  const hasNextPage = pages.length > nodes.length

  return {
    nodes,
    totalCount,
    pageInfo: {
      hasPreviousPage,
      hasNextPage,
      startCursor: firstPage?.id,
      lastPage: lastPage?.id
    }
  }
}
