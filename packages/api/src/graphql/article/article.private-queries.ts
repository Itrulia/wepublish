import {Prisma, PrismaClient} from '@prisma/client'
import {Context} from '../../context'
import {ArticleSort} from '../../db/article'
import {NotAuthorisedError, NotFound, UserInputError} from '../../error'
import {
  authorise,
  CanGetArticle,
  CanGetArticlePreviewLink,
  CanGetSharedArticle,
  isAuthorised
} from '../permissions'
import {getSortOrder, SortOrder} from '../queries/sort'

export const getArticleById = async (
  id: string,
  authenticate: Context['authenticate'],
  articleLoader: Context['loaders']['articles']
) => {
  const {roles} = authenticate()

  const canGetArticle = isAuthorised(CanGetArticle, roles)
  const canGetSharedArticle = isAuthorised(CanGetSharedArticle, roles)

  if (canGetArticle || canGetSharedArticle) {
    const article = await articleLoader.load(id)

    if (canGetArticle) {
      return article
    } else {
      return article?.shared ? article : null
    }
  } else {
    throw new NotAuthorisedError()
  }
}

export const getArticlePreviewLink = async (
  id: string,
  hours: number,
  authenticate: Context['authenticate'],
  generateJWT: Context['generateJWT'],
  urlAdapter: Context['urlAdapter'],
  articles: Context['loaders']['articles']
) => {
  const {roles} = authenticate()
  authorise(CanGetArticlePreviewLink, roles)

  const article = await articles.load(id)

  if (!article) throw new NotFound('article', id)

  if (!article.draft) throw new UserInputError('Article needs to have a draft')

  const token = generateJWT({
    id: article.id,
    expiresInMinutes: hours * 60
  })

  return urlAdapter.getArticlePreviewURL(token)
}

export const createArticleOrder = (
  field: ArticleSort,
  sortOrder: SortOrder
): Prisma.ArticleFindManyArgs['orderBy'] => {
  switch (field) {
    case ArticleSort.CreatedAt:
      return {
        createdAt: sortOrder
      }

    case ArticleSort.ModifiedAt:
      return {
        modifiedAt: sortOrder
      }

    case ArticleSort.PublishedAt:
      return {
        published: {
          publishedAt: sortOrder
        }
      }

    case ArticleSort.UpdatedAt:
      return {
        published: {
          updatedAt: sortOrder
        }
      }

    case ArticleSort.PublishAt:
      return {
        pending: {
          publishAt: sortOrder
        }
      }
  }
}

type ArticleFilter = {
  title: string
  published: boolean
  draft: boolean
  pending: boolean
  shared: boolean
  tags: string[]
  authors: string[]
}

const createTitleFilter = (filter: Partial<ArticleFilter>) => {
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

const createPublishedFilter = (filter: Partial<ArticleFilter>) => {
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

const createDraftFilter = (filter: Partial<ArticleFilter>) => {
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

const createPendingFilter = (filter: Partial<ArticleFilter>) => {
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

const createSharedFilter = (filter: Partial<ArticleFilter>) => {
  if (filter.shared != null) {
    return {
      shared: filter.shared
    }
  }

  return {}
}

export const createArticleFilter = (
  filter: Partial<ArticleFilter>
): Prisma.ArticleFindManyArgs['where'] => ({
  ...createTitleFilter(filter),
  ...createPublishedFilter(filter),
  ...createDraftFilter(filter),
  ...createPendingFilter(filter),
  ...createSharedFilter(filter)
})

export const getArticles = async (
  filter: Partial<ArticleFilter>,
  sortedField: ArticleSort,
  order: 1 | -1,
  cursorId: string,
  skip: number,
  take: number,
  article: PrismaClient['article']
) => {
  const orderBy = createArticleOrder(sortedField, getSortOrder(order))
  const where = createArticleFilter(filter)

  const [totalCount, articles] = await Promise.all([
    article.count({
      where: where,
      orderBy: orderBy
    }),
    article.findMany({
      where: where,
      skip: skip,
      take: take + 1,
      orderBy: orderBy,
      cursor: cursorId ? {id: cursorId} : undefined
    })
  ])

  const nodes = articles.slice(0, take)
  const firstArticle = nodes[0]
  const lastArticle = nodes[nodes.length - 1]

  const hasPreviousPage = Boolean(skip)
  const hasNextPage = articles.length > nodes.length

  return {
    nodes,
    totalCount,
    pageInfo: {
      hasPreviousPage,
      hasNextPage,
      startCursor: firstArticle?.id,
      lastArticle: lastArticle?.id
    }
  }
}
