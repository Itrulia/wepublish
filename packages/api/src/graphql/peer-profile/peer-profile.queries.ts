import {PrismaClient} from '@prisma/client'

export const getPeerProfile = async (
  hostURL: string,
  websiteURL: string,
  peerProfile: PrismaClient['peerProfile']
) => {
  const profile = await peerProfile.findFirst({})

  return {...profile, hostURL, websiteURL}
}
