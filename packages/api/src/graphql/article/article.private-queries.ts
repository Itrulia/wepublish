import {Context} from '../../context'
import {
  isAuthorised,
  CanGetArticle,
  CanGetSharedArticle,
  authorise,
  CanGetArticlePreviewLink
} from '../permissions'
import {NotAuthorisedError, NotFound, UserInputError} from '../../error'
import {PrismaClient, Prisma} from '@prisma/client'
import {Limit} from '../../db/common'
import {ArticleSort} from '../../db/article'
import {getSortOrder, SortOrder} from '../queries/sort'
import {Cursor} from '../queries/cursor'

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

const createArticleOrder = (
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

const createArticleFilter = (
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
  cursor: Cursor | null,
  limit: Limit,
  article: PrismaClient['article']
) => {
  const orderBy = createArticleOrder(sortedField, getSortOrder(order))
  const where = createArticleFilter(filter)

  console.log(where)

  const data = await article.findMany({
    where: where,
    skip: limit.skip,
    take: limit.count,
    orderBy: orderBy,
    cursor: cursor ? {id: cursor.id} : undefined
  })

  console.log(data.length)

  return data
}
