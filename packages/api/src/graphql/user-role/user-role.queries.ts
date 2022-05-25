import {Prisma, PrismaClient} from '@prisma/client'
import {UserRoleFilter, UserRoleSort} from '../../db/userRole'
import {getSortOrder, SortOrder} from '../queries/sort'

export const createUserRoleOrder = (
  field: UserRoleSort,
  sortOrder: SortOrder
): Prisma.UserRoleFindManyArgs['orderBy'] => {
  switch (field) {
    case UserRoleSort.CreatedAt:
      return {
        createdAt: sortOrder
      }

    case UserRoleSort.ModifiedAt:
      return {
        modifiedAt: sortOrder
      }
  }
}

const createNameFilter = (filter: Partial<UserRoleFilter>): Prisma.UserRoleWhereInput => {
  if (filter?.name) {
    return {
      name: filter.name
    }
  }

  return {}
}

export const createUserRoleFilter = (
  filter: Partial<UserRoleFilter>
): Prisma.UserRoleWhereInput => ({
  AND: [createNameFilter(filter)]
})

export const getUserRoles = async (
  filter: Partial<UserRoleFilter>,
  sortedField: UserRoleSort,
  order: 1 | -1,
  cursorId: string,
  skip: number,
  take: number,
  userRole: PrismaClient['userRole']
) => {
  const orderBy = createUserRoleOrder(sortedField, getSortOrder(order))
  const where = createUserRoleFilter(filter)

  const [totalCount, userroles] = await Promise.all([
    userRole.count({
      where: where,
      orderBy: orderBy
    }),
    userRole.findMany({
      where: where,
      skip: skip,
      take: take + 1,
      orderBy: orderBy,
      cursor: cursorId ? {id: cursorId} : undefined
    })
  ])

  const nodes = userroles.slice(0, take)
  const firstUserRole = nodes[0]
  const lastUserRole = nodes[nodes.length - 1]

  const hasPreviousPage = Boolean(skip)
  const hasNextPage = userroles.length > nodes.length

  return {
    nodes,
    totalCount,
    pageInfo: {
      hasPreviousPage,
      hasNextPage,
      startCursor: firstUserRole?.id,
      lastUserRole: lastUserRole?.id
    }
  }
}
