import {Context} from '../../context'
import {PaymentPeriodicity, Prisma, PrismaClient} from '@prisma/client'
import {MonthlyAmountNotEnough, NotFound, PaymentConfigurationNotAllowed} from '../../error'

export const updatePublicSubscription = async (
  id: number,
  input: Pick<
    Prisma.SubscriptionUncheckedUpdateInput,
    'memberPlanID' | 'paymentPeriodicity' | 'monthlyAmount' | 'autoRenew' | 'paymentMethodID'
  >,
  authenticateUser: Context['authenticateUser'],
  memberContext: Context['memberContext'],
  activeMemberPlansByID: Context['loaders']['activeMemberPlansByID'],
  activePaymentMethodsByID: Context['loaders']['activePaymentMethodsByID'],
  subscriptionClient: PrismaClient['subscription']
) => {
  const {user} = authenticateUser()

  const subscription = await subscriptionClient.findUnique({
    where: {id},
    include: {
      deactivation: true
    }
  })

  if (!subscription) throw new NotFound('subscription', id)

  const {memberPlanID, paymentPeriodicity, monthlyAmount, autoRenew, paymentMethodID} = input

  const memberPlan = await activeMemberPlansByID.load(memberPlanID as number)
  if (!memberPlan) throw new NotFound('MemberPlan', memberPlanID as number)

  const paymentMethod = await activePaymentMethodsByID.load(paymentMethodID as number)
  if (!paymentMethod) throw new NotFound('PaymentMethod', paymentMethodID as number)

  if (!monthlyAmount || monthlyAmount < memberPlan.amountPerMonthMin)
    throw new MonthlyAmountNotEnough()

  if (
    !memberPlan.availablePaymentMethods.some(apm => {
      if (apm.forceAutoRenewal && !autoRenew) {
        return false
      }

      return (
        apm.paymentPeriodicities.includes(paymentPeriodicity as PaymentPeriodicity) &&
        apm.paymentMethodIDs.includes(paymentMethodID as number)
      )
    })
  ) {
    throw new PaymentConfigurationNotAllowed()
  }

  const updateSubscription = await subscriptionClient.update({
    where: {id},
    data: {
      userID: subscription.userID ?? user.id,
      memberPlanID,
      paymentPeriodicity,
      monthlyAmount,
      autoRenew,
      paymentMethodID,
      deactivation: {
        delete: true
      }
    }
  })

  if (!updateSubscription) throw new Error('Error during updateSubscription')

  return await memberContext.handleSubscriptionChange({
    subscription: updateSubscription
  })
}
