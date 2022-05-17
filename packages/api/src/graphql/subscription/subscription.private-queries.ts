import {Context} from '../../context'
import {authorise, CanGetSubscription} from '../permissions'
import {PrismaClient} from '@prisma/client'

export const getSubscriptionById = (
  id: string,
  authenticate: Context['authenticate'],
  subscription: PrismaClient['subscription']
) => {
  const {roles} = authenticate()
  authorise(CanGetSubscription, roles)

  return subscription.findUnique({
    where: {
      id
    }
  })
}
