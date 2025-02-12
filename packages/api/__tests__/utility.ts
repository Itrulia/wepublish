import {MongoDBAdapter} from '@wepublish/api-db-mongodb'
import {URL} from 'url'
import {
  Author,
  contextFromRequest,
  GraphQLWepublishPublicSchema,
  GraphQLWepublishSchema,
  OptionalUserSession,
  PublicArticle,
  PublicPage,
  URLAdapter,
  PublicComment,
  CommentItemType,
  Peer
} from '../src'
import {ApolloServer} from 'apollo-server'
import {createTestClient} from 'apollo-server-testing'
import {ApolloServerTestClient} from 'apollo-server-testing/dist/createTestClient'
import {KarmaMediaAdapter} from '@wepublish/api-media-karma/src'
import {AlgebraicCaptchaChallenge} from '../lib'

export interface TestClient {
  dbAdapter: MongoDBAdapter
  testClientPublic: ApolloServerTestClient
  testClientPrivate: ApolloServerTestClient
}

class ExampleURLAdapter implements URLAdapter {
  getPublicArticleURL(article: PublicArticle): string {
    return `https://demo.wepublish.ch/article/${article.id}/${article.slug}`
  }

  getPublicPageURL(page: PublicPage): string {
    return `https://demo.wepublish.ch/page/${page.id}/${page.slug}`
  }

  getPeeredArticleURL(peer: Peer, article: PublicArticle): string {
    return `https://demo.wepublish.ch/peerArticle/${peer.id}/${article.id}`
  }

  getAuthorURL(author: Author): string {
    return `https://demo.wepublish.ch/author/${author.slug || author.id}`
  }

  getArticlePreviewURL(token: string): string {
    return `https://demo.wepulish.ch/article/preview/${token}`
  }

  getPagePreviewURL(token: string): string {
    return `https://demo.wepulish.ch/page/preview/${token}`
  }

  getCommentURL(item: PublicArticle | PublicPage, comment: PublicComment): string {
    if (comment.itemType === CommentItemType.Article) {
      return `https://demo.wepublish.media/comments/a/${item.id}/${item.slug}/${comment.id}`
    }
    return `https://demo.wepublish.media/comments/${item.slug}/${comment.id}`
  }

  getLoginURL(token: string): string {
    return `https://demo.wepublish.ch/login/${token}`
  }
}

export async function createGraphQLTestClientWithMongoDB(): Promise<TestClient> {
  if (!process.env.TEST_MONGO_URL) {
    throw new Error('TEST_MONGO_URL not defined')
  }
  let adminUser

  await MongoDBAdapter.initialize({
    url: process.env.TEST_MONGO_URL!,
    locale: 'en',
    seed: async adapter => {
      const adminUserRole = await adapter.userRole.getUserRole('Admin')
      const adminUserRoleId = adminUserRole ? adminUserRole.id : 'fake'

      adminUser = await adapter.user.createUser({
        input: {
          email: 'dev@wepublish.ch',
          emailVerifiedAt: new Date(),
          name: 'Dev User',
          roleIDs: [adminUserRoleId],
          active: true,
          properties: []
        },
        password: '123'
      })
    }
  })

  const dbAdapter = await MongoDBAdapter.connect({
    url: process.env.TEST_MONGO_URL!,
    locale: 'en'
  })

  const mediaAdapter: KarmaMediaAdapter = {
    url: new URL('https://fakeurl.com'),
    token: 'fake',
    internalURL: new URL('https://internalurl.com'),
    getImageURL: jest.fn(),

    deleteImage: jest.fn(),
    uploadImage: jest.fn(),
    uploadImageFromArrayBuffer: jest.fn(),
    _uploadImage: jest.fn()
  }
  if (!adminUser) {
    throw new Error('Could not get admin user')
  }

  const userSession: OptionalUserSession = await dbAdapter.session.createUserSession(adminUser)

  const request: any = {
    headers: {
      authorization: `Bearer ${userSession?.token}`
    }
  }

  const challenge = new AlgebraicCaptchaChallenge('secret', 600, {})

  const apolloServerPublic = new ApolloServer({
    schema: GraphQLWepublishPublicSchema,
    playground: false,
    introspection: false,
    tracing: false,
    context: async () =>
      await contextFromRequest(request, {
        hostURL: 'https://fakeURL',
        websiteURL: 'https://fakeurl',
        dbAdapter,
        mediaAdapter,
        mailContextOptions: {
          defaultFromAddress: 'dev@fake.org',
          defaultReplyToAddress: 'reply-to@fake.org',
          mailTemplateMaps: []
        },
        urlAdapter: new ExampleURLAdapter(),
        oauth2Providers: [],
        paymentProviders: [],
        challenge
      })
  })

  const apolloServerPrivate = new ApolloServer({
    schema: GraphQLWepublishSchema,
    playground: false,
    introspection: false,
    tracing: false,
    context: async () =>
      await contextFromRequest(request, {
        hostURL: 'https://fakeURL',
        websiteURL: 'https://fakeurl',
        dbAdapter,
        mediaAdapter,
        mailContextOptions: {
          defaultFromAddress: 'dev@fake.org',
          defaultReplyToAddress: 'reply-to@fake.org',
          mailTemplateMaps: []
        },
        urlAdapter: new ExampleURLAdapter(),
        oauth2Providers: [],
        paymentProviders: [],
        challenge
      })
  })

  const testClientPrivate = createTestClient(apolloServerPrivate)
  const testClientPublic = createTestClient(apolloServerPublic)

  return {
    dbAdapter,
    testClientPublic,
    testClientPrivate
  }
}
