import {Context} from '../../context'
import {UserInputError} from '../../error'
import {authorise, CanGetUserRole} from '../permissions'

export const getUserRoleById = (
  id: string,
  authenticate: Context['authenticate'],
  userRoleLoader: Context['loaders']['userRolesByID']
) => {
  const {roles} = authenticate()
  authorise(CanGetUserRole, roles)

  if (id == null) {
    throw new UserInputError('You must provide `id`')
  }

  return userRoleLoader.load(id)
}
