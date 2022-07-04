import {DateFilter} from './common'
import {PaymentPeriodicity, SubscriptionDeactivationReason} from '@prisma/client'

export enum SubscriptionSort {
  CreatedAt = 'createdAt',
  ModifiedAt = 'modifiedAt'
}

export interface SubscriptionFilter {
  readonly startsAtFrom?: DateFilter
  readonly startsAtTo?: DateFilter
  readonly paidUntilFrom?: DateFilter
  readonly paidUntilTo?: DateFilter
  readonly deactivationDateFrom?: DateFilter
  readonly deactivationDateTo?: DateFilter
  readonly deactivationReason?: SubscriptionDeactivationReason
  readonly autoRenew?: boolean
  readonly paymentMethodID?: number
  readonly memberPlanID?: number
  readonly paymentPeriodicity?: PaymentPeriodicity
  readonly userHasAddress?: boolean
}
