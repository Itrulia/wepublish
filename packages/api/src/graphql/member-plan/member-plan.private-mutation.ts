import {Context} from '../../context'
import {authorise, CanCreateMemberPlan, CanDeleteMemberPlan} from '../permissions'
import {PrismaClient, Prisma} from '@prisma/client'

export const deleteMemberPlanById = async (
  id: number,
  authenticate: Context['authenticate'],
  memberPlan: PrismaClient['memberPlan']
) => {
  const {roles} = authenticate()
  authorise(CanDeleteMemberPlan, roles)

  return memberPlan.delete({
    where: {
      id
    }
  })
}

type CreateMemberPlanInput = Omit<
  Prisma.MemberPlanUncheckedCreateInput,
  'availablePaymentMethods' | 'modifiedAt'
> & {
  availablePaymentMethods: Prisma.AvailablePaymentMethodUncheckedCreateWithoutMemberPlanInput[]
}

export const createMemberPlan = (
  {availablePaymentMethods, ...input}: CreateMemberPlanInput,
  authenticate: Context['authenticate'],
  memberPlan: PrismaClient['memberPlan']
) => {
  const {roles} = authenticate()
  authorise(CanCreateMemberPlan, roles)

  return memberPlan.create({
    data: {
      ...input,
      availablePaymentMethods: {
        create: availablePaymentMethods
      }
    },
    include: {
      availablePaymentMethods: true
    }
  })
}

type UpdateMemberPlanInput = Omit<
  Prisma.MemberPlanUncheckedUpdateInput,
  'availablePaymentMethods' | 'modifiedAt' | 'createdAt'
> & {
  availablePaymentMethods: Prisma.AvailablePaymentMethodUncheckedCreateWithoutMemberPlanInput[]
}

export const updateMemberPlan = async (
  id: number,
  {availablePaymentMethods, ...input}: UpdateMemberPlanInput,
  authenticate: Context['authenticate'],
  memberPlan: PrismaClient['memberPlan']
) => {
  const {roles} = authenticate()
  authorise(CanCreateMemberPlan, roles)

  return memberPlan.update({
    where: {id},
    data: {
      ...input,
      availablePaymentMethods: {
        deleteMany: {
          memberPlanId: {
            equals: id
          }
        },
        create: availablePaymentMethods
      }
    },
    include: {
      availablePaymentMethods: true
    }
  })
}
