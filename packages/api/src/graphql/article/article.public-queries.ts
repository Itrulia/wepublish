import {ArticleFilter, ArticleSort} from '../../db/article'
import {getArticles} from './article.queries'
import {PrismaClient} from '@prisma/client'

export const getPublishedArticles = async (
  filter: Partial<ArticleFilter>,
  sortedField: ArticleSort,
  order: 1 | -1,
  cursorId: string | null,
  skip: number,
  take: number,
  article: PrismaClient['article']
) => {
  const data = await getArticles(
    {...filter, published: true},
    sortedField,
    order,
    cursorId,
    skip,
    take,
    article
  )

  return {
    ...data,
    nodes: data.nodes.map(({id, shared, published}) => ({id, shared, ...published}))
  }
}
