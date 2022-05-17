import {Context} from '../../context'
import {SessionType} from '../../db/session'
import {CanGetUser, authorise} from '../permissions'
import {UserInputError} from '../../error'
import {PrismaClient} from '@prisma/client'

export const getMe = (authenticate: Context['authenticate']) => {
  const session = authenticate()

  return session?.type === SessionType.User ? session.user : null
}

export const getUserById = (
  id: string,
  authenticate: Context['authenticate'],
  user: PrismaClient['user']
) => {
  const {roles} = authenticate()
  authorise(CanGetUser, roles)

  if (!id) {
    throw new UserInputError('You must provide `id`')
  }

  return user.findUnique({
    where: {
      id
    }
  })
}
