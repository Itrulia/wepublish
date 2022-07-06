import {PrismaClient} from '@prisma/client'
import {hashPassword} from '../../../packages/api/src/db/user'

async function seed() {
  const prisma = new PrismaClient()
  await prisma.$connect()

  await prisma.userRole.create({
    data: {
      id: 'admin',
      systemRole: true,
      name: 'Admin',
      description: 'Administrator Role',
      permissionIDs: []
    }
  })

  await prisma.userRole.create({
    data: {
      id: 'editor',
      systemRole: true,
      name: 'Editor',
      description: 'Editor Role',
      permissionIDs: []
    }
  })

  await prisma.$disconnect()
}

seed()
