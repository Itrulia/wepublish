import {Context} from '../../context'
import {authorise, CanGetPage} from '../permissions'

export const getPageById = (
  id: string,
  authenticate: Context['authenticate'],
  pages: Context['loaders']['pages']
) => {
  const {roles} = authenticate()
  authorise(CanGetPage, roles)

  return pages.load(id)
}
