import {PrismaClient} from '@prisma/client'
import {hashPassword} from '../../../packages/api/src/db/user'

async function seed() {
  const prisma = new PrismaClient()
  await prisma.$connect()

  const adminUserRole = await prisma.userRole.findUnique({
    where: {
      id: 'admin'
    }
  })

  const editorUserRole = await prisma.userRole.findUnique({
    where: {
      id: 'editor'
    }
  })

  if (!adminUserRole || !editorUserRole) {
    throw new Error('@wepublish/api seeding has not been done')
  }

  await prisma.user.createMany({
    data: [
      {
        email: 'dev@wepublish.ch',
        emailVerifiedAt: new Date(),
        name: 'Dev User',
        active: true,
        roleIDs: [adminUserRole.id],
        password: await hashPassword('123')
      },
      {
        email: 'editor@wepublish.ch',
        emailVerifiedAt: new Date(),
        name: 'Editor User',
        active: true,
        roleIDs: [editorUserRole.id],
        password: await hashPassword('123')
      }
    ]
  })

  await prisma.$disconnect()
}

seed()
