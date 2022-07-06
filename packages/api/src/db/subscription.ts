import {DateFilter} from './common'
import {
  PaymentPeriodicity,
  Subscription,
  SubscriptionDeactivation,
  SubscriptionDeactivationReason,
  SubscriptionPeriod
} from '@prisma/client'
import {MetadataProperty} from '../../../../examples/website/src/shared/types'

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

export type SubscriptionWithRelations = Subscription & {
  periods: SubscriptionPeriod[]
  properties: MetadataProperty[]
  deactivation: SubscriptionDeactivation | null
}
