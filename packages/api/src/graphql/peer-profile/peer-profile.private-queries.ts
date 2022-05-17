import {PrismaClient} from '@prisma/client'
import {GraphQLResolveInfo} from 'graphql'
import {delegateToSchema, introspectSchema, makeRemoteExecutableSchema} from 'graphql-tools'
import {Context} from '../../context'
import {createFetcher} from '../../context'
import {PeerTokenInvalidError} from '../../error'
import {markResultAsProxied} from '../../utility'
import {authorise, CanCreatePeer, CanGetPeerProfile} from '../permissions'

export const getPeerProfile = async (
  hostURL: string,
  websiteURL: string,
  authenticate: Context['authenticate'],
  peerProfile: PrismaClient['peerProfile']
) => {
  const {roles} = authenticate()
  authorise(CanGetPeerProfile, roles)

  const profile = await peerProfile.findFirst({})

  return {...profile, hostURL, websiteURL}
}

export const getRemotePeerProfile = async (
  hostURL: string,
  token: string,
  authenticate: Context['authenticate'],
  info: GraphQLResolveInfo
) => {
  const {roles} = authenticate()
  authorise(CanCreatePeer, roles)
  const link = new URL('/admin', hostURL)
  const fetcher = await createFetcher(link.toString(), token)
  const schema = await introspectSchema(fetcher)
  const remoteExecutableSchema = await makeRemoteExecutableSchema({
    schema,
    fetcher
  })
  const remoteAnswer = await delegateToSchema({
    info,
    fieldName: 'peerProfile',
    args: {},
    schema: remoteExecutableSchema,
    transforms: []
  })

  if (remoteAnswer?.extensions?.code === 'UNAUTHENTICATED') {
    // check for unauthenticated error and throw more specific error.
    // otherwise client doesn't know who (own or remote api) threw the error
    throw new PeerTokenInvalidError(link.toString())
  } else {
    return await markResultAsProxied(remoteAnswer)
  }
}
