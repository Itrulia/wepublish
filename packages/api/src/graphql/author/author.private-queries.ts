import {Context} from '../../context'
import {UserInputError} from '../../error'
import {authorise, CanGetAuthor} from '../permissions'

export const getAuthorByIdOrSlug = (
  id: string | null,
  slug: string | null,
  authenticate: Context['authenticate'],
  authorsByID: Context['loaders']['authorsByID'],
  authorsBySlug: Context['loaders']['authorsBySlug']
) => {
  const {roles} = authenticate()
  authorise(CanGetAuthor, roles)

  if ((!id && !slug) || (id && slug)) {
    throw new UserInputError('You must provide either `id` or `slug`.')
  }

  return id ? authorsByID.load(id) : authorsBySlug.load(slug!)
}
