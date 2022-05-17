import {Context} from '../../context'
import {isAuthorised, CanGetArticle, CanGetSharedArticle} from '../permissions'
import {NotAuthorisedError} from '../../error'

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
