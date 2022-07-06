import {Context} from '../../context'
import {authorise, CanCreateNavigation, CanDeleteNavigation} from '../permissions'
import {PrismaClient, Prisma} from '@prisma/client'

export const deleteNavigationById = async (
  id: number,
  authenticate: Context['authenticate'],
  navigation: PrismaClient['navigation']
) => {
  const {roles} = authenticate()
  authorise(CanDeleteNavigation, roles)

  return navigation.delete({
    where: {
      id
    }
  })
}

type CreateNavigationInput = Omit<Prisma.NavigationUncheckedCreateInput, 'links' | 'modifiedAt'> & {
  links: Prisma.NavigationLinkUncheckedCreateWithoutNavigationInput[]
}

export const createNavigation = (
  {links, ...input}: CreateNavigationInput,
  authenticate: Context['authenticate'],
  navigation: PrismaClient['navigation']
) => {
  const {roles} = authenticate()
  authorise(CanCreateNavigation, roles)

  return navigation.create({
    data: {
      ...input,
      links: {
        create: links
      }
    },
    include: {
      links: true
    }
  })
}

type UpdateNavigationInput = Omit<
  Prisma.NavigationUncheckedUpdateInput,
  'links' | 'modifiedAt' | 'createdAt'
> & {
  links: Prisma.NavigationLinkUncheckedCreateWithoutNavigationInput[]
}

export const updateNavigation = async (
  id: number,
  {links, ...input}: UpdateNavigationInput,
  authenticate: Context['authenticate'],
  navigation: PrismaClient['navigation']
) => {
  const {roles} = authenticate()
  authorise(CanCreateNavigation, roles)

  return navigation.update({
    where: {id},
    data: {
      ...input,
      links: {
        deleteMany: {
          navigationId: {
            equals: id
          }
        },
        create: links
      }
    },
    include: {
      links: true
    }
  })
}
