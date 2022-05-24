import {
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
  Kind
} from 'graphql'
import {ExtractField, WrapQuery} from 'graphql-tools'
import {Context} from '../context'
import {ArticleSort, PeerArticle} from '../db/article'
import {AuthorSort} from '../db/author'
import {CommentSort} from '../db/comment'
import {ConnectionResult, InputCursor, Limit, SortOrder} from '../db/common'
import {ImageSort} from '../db/image'
import {InvoiceSort} from '../db/invoice'
import {MemberPlanSort} from '../db/memberPlan'
import {PageSort} from '../db/page'
import {PaymentSort} from '../db/payment'
import {Subscription, SubscriptionSort} from '../db/subscription'
import {User, UserSort} from '../db/user'
import {UserRoleSort} from '../db/userRole'
import {NotAuthorisedError} from '../error'
import {base64Decode, base64Encode, delegateToPeerSchema, mapSubscriptionsAsCsv} from '../utility'
import {
  GraphQLArticle,
  GraphQLArticleConnection,
  GraphQLArticleFilter,
  GraphQLArticleSort,
  GraphQLPeerArticleConnection
} from './article'
import {
  getAdminArticles,
  getArticleById,
  getArticlePreviewLink
} from './article/article.private-queries'
import {GraphQLAuthProvider} from './auth'
import {
  GraphQLAuthor,
  GraphQLAuthorConnection,
  GraphQLAuthorFilter,
  GraphQLAuthorSort
} from './author'
import {getAdminAuthors, getAuthorByIdOrSlug} from './author/author.private-queries'
import {GraphQLCommentConnection, GraphQLCommentFilter, GraphQLCommentSort} from './comment'
import {GraphQLSortOrder} from './common'
import {GraphQLImage, GraphQLImageConnection, GraphQLImageFilter, GraphQLImageSort} from './image'
import {getAdminImages, getImageById} from './image/image.private-queries'
import {
  GraphQLInvoice,
  GraphQLInvoiceConnection,
  GraphQLinvoiceFilter,
  GraphQLInvoiceSort
} from './invoice'
import {getInvoiceById} from './invoice/invoice.private-queries'
import {
  getAdminMemberPlans,
  getMemberPlanByIdOrSlug
} from './member-plan/member-plan.private-queries'
import {
  GraphQLMemberPlan,
  GraphQLMemberPlanConnection,
  GraphQLMemberPlanFilter,
  GraphQLMemberPlanSort
} from './memberPlan'
import {GraphQLNavigation} from './navigation'
import {getNavigationByIdOrKey, getNavigations} from './navigation/navigation.private-queries'
import {GraphQLPage, GraphQLPageConnection, GraphQLPageSort} from './page'
import {getAdminPages, getPageById, getPagePreviewLink} from './page/page.private-queries'
import {
  GraphQLPayment,
  GraphQLPaymentConnection,
  GraphQLPaymentFilter,
  GraphQLPaymentSort
} from './payment'
import {
  getPaymentMethodById,
  getPaymentMethods
} from './payment-method/payment-method.private-queries'
import {getPaymentById} from './payment/payment.private-queries'
import {GraphQLPaymentMethod, GraphQLPaymentProvider} from './paymentMethod'
import {GraphQLPeer, GraphQLPeerProfile} from './peer'
import {getPeerProfile, getRemotePeerProfile} from './peer-profile/peer-profile.private-queries'
import {getPeerById, getPeers} from './peer/peer.private-queries'
import {getPermissions} from './permission/permission.private-queries'
import {
  authorise,
  CanGetComments,
  CanGetInvoices,
  CanGetPaymentProviders,
  CanGetPayments,
  CanGetPeerArticle,
  CanGetPeerArticles,
  CanGetSubscriptions,
  CanGetUserRoles,
  CanGetUsers,
  isAuthorised
} from './permissions'
import {GraphQLSession} from './session'
import {GraphQLSlug} from './slug'
import {
  GraphQLSubscription,
  GraphQLSubscriptionConnection,
  GraphQLSubscriptionFilter,
  GraphQLSubscriptionSort
} from './subscription'
import {getSubscriptionById} from './subscription/subscription.private-queries'
import {GraphQLToken} from './token'
import {getTokens} from './token/token.private-queries'
import {GraphQLUser, GraphQLUserConnection, GraphQLUserFilter, GraphQLUserSort} from './user'
import {getUserRoleById} from './user-role/user-role.private-queries'
import {getMe, getUserById} from './user/user.private-queries'
import {
  GraphQLPermission,
  GraphQLUserRole,
  GraphQLUserRoleConnection,
  GraphQLUserRoleFilter,
  GraphQLUserRoleSort
} from './userRole'

export const GraphQLQuery = new GraphQLObjectType<undefined, Context>({
  name: 'Query',
  fields: {
    // Peering
    // =======

    remotePeerProfile: {
      type: GraphQLPeerProfile,
      args: {
        hostURL: {type: GraphQLNonNull(GraphQLString)},
        token: {type: GraphQLNonNull(GraphQLString)}
      },
      resolve: (root, {hostURL, token}, {authenticate}, info) =>
        getRemotePeerProfile(hostURL, token, authenticate, info)
    },

    peerProfile: {
      type: GraphQLNonNull(GraphQLPeerProfile),
      resolve: (root, args, {authenticate, hostURL, websiteURL, prisma: {peerProfile}}) =>
        getPeerProfile(hostURL, websiteURL, authenticate, peerProfile)
    },

    peers: {
      type: GraphQLList(GraphQLNonNull(GraphQLPeer)),
      resolve: (root, _, {authenticate, prisma: {peer}}) => getPeers(authenticate, peer)
    },

    peer: {
      type: GraphQLPeer,
      args: {id: {type: GraphQLNonNull(GraphQLID)}},
      resolve: (root, {id}, {authenticate, loaders: {peer}}) => getPeerById(id, authenticate, peer)
    },

    // User
    // ====

    me: {
      type: GraphQLUser,
      resolve: (root, args, {authenticate}) => getMe(authenticate)
    },

    // Session
    // =======

    sessions: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLSession))),
      resolve(root, args, {authenticateUser, dbAdapter}) {
        const session = authenticateUser()
        return dbAdapter.session.getUserSessions(session.user)
      }
    },

    authProviders: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLAuthProvider))),
      args: {redirectUri: {type: GraphQLString}},
      async resolve(root, {redirectUri}, {getOauth2Clients}) {
        const clients = await getOauth2Clients()
        return clients.map(client => {
          const url = client.client.authorizationUrl({
            scope: client.provider.scopes.join(),
            response_mode: 'query',
            redirect_uri: `${redirectUri}/${client.name}`,
            state: 'fakeRandomString'
          })

          return {
            name: client.name,
            url
          }
        })
      }
    },

    // Users
    // ==========
    user: {
      type: GraphQLUser,
      args: {id: {type: GraphQLID}},
      resolve: (root, {id}, {authenticate, prisma: {user}}) => getUserById(id, authenticate, user)
    },

    users: {
      type: GraphQLNonNull(GraphQLUserConnection),
      args: {
        after: {type: GraphQLID},
        before: {type: GraphQLID},
        first: {type: GraphQLInt},
        last: {type: GraphQLInt},
        skip: {type: GraphQLInt},
        filter: {type: GraphQLUserFilter},
        sort: {type: GraphQLUserSort, defaultValue: UserSort.ModifiedAt},
        order: {type: GraphQLSortOrder, defaultValue: SortOrder.Descending}
      },
      async resolve(
        root,
        {filter, sort, order, after, before, first, skip, last},
        {authenticate, dbAdapter}
      ) {
        const {roles} = authenticate()
        authorise(CanGetUsers, roles)

        return await dbAdapter.user.getUsers({
          filter,
          sort,
          order,
          cursor: InputCursor(after, before),
          limit: Limit(first, last, skip)
        })
      }
    },

    // Subscriptions
    // ==========
    subscription: {
      type: GraphQLSubscription,
      args: {id: {type: GraphQLNonNull(GraphQLID)}},
      resolve: (root, {id}, {authenticate, prisma: {subscription}}) =>
        getSubscriptionById(id, authenticate, subscription)
    },

    subscriptions: {
      type: GraphQLNonNull(GraphQLSubscriptionConnection),
      args: {
        after: {type: GraphQLID},
        before: {type: GraphQLID},
        first: {type: GraphQLInt},
        last: {type: GraphQLInt},
        skip: {type: GraphQLInt},
        filter: {type: GraphQLSubscriptionFilter},
        sort: {type: GraphQLSubscriptionSort, defaultValue: SubscriptionSort.ModifiedAt},
        order: {type: GraphQLSortOrder, defaultValue: SortOrder.Descending}
      },
      async resolve(
        root,
        {filter, sort, order, after, before, first, skip, last},
        {authenticate, dbAdapter}
      ) {
        const {roles} = authenticate()
        authorise(CanGetSubscriptions, roles)
        return await dbAdapter.subscription.getSubscriptions({
          filter,
          sort,
          order,
          cursor: InputCursor(after, before),
          limit: Limit(first, last, skip)
        })
      }
    },

    subscriptionsAsCsv: {
      type: GraphQLString,
      args: {filter: {type: GraphQLSubscriptionFilter}},
      async resolve(root, {filter}, {dbAdapter, authenticate}) {
        const {roles} = authenticate()
        authorise(CanGetSubscriptions, roles)
        authorise(CanGetUsers, roles)

        const subscriptions: Subscription[] = []
        const users: User[] = []

        let hasMore = true
        let afterCursor
        while (hasMore) {
          const listResult: ConnectionResult<Subscription> = await dbAdapter.subscription.getSubscriptions(
            {
              filter,
              limit: Limit(100),
              sort: SubscriptionSort.ModifiedAt,
              cursor: InputCursor(afterCursor ?? undefined),
              order: SortOrder.Descending
            }
          )
          subscriptions.push(...listResult.nodes)
          hasMore = listResult.pageInfo.hasNextPage
          afterCursor = listResult.pageInfo.endCursor
        }

        hasMore = true
        afterCursor = undefined

        while (hasMore) {
          const listResult: ConnectionResult<User> = await dbAdapter.user.getUsers({
            cursor: InputCursor(afterCursor ?? undefined),
            filter: {},
            limit: Limit(100),
            sort: UserSort.ModifiedAt,
            order: SortOrder.Descending
          })
          users.push(...listResult.nodes)
          hasMore = listResult.pageInfo.hasNextPage
          afterCursor = listResult.pageInfo.endCursor
        }

        return mapSubscriptionsAsCsv(users, subscriptions)
      }
    },

    // UserRole
    // ========

    userRole: {
      type: GraphQLUserRole,
      args: {id: {type: GraphQLID}},
      resolve: (root, {id}, {authenticate, loaders}) =>
        getUserRoleById(id, authenticate, loaders.userRolesByID)
    },

    userRoles: {
      type: GraphQLNonNull(GraphQLUserRoleConnection),
      args: {
        after: {type: GraphQLID},
        before: {type: GraphQLID},
        first: {type: GraphQLInt},
        last: {type: GraphQLInt},
        filter: {type: GraphQLUserRoleFilter},
        sort: {type: GraphQLUserRoleSort, defaultValue: UserRoleSort.ModifiedAt},
        order: {type: GraphQLSortOrder, defaultValue: SortOrder.Descending}
      },
      resolve(root, {filter, sort, order, after, before, first, last}, {authenticate, dbAdapter}) {
        const {roles} = authenticate()
        authorise(CanGetUserRoles, roles)

        return dbAdapter.userRole.getUserRoles({
          filter,
          sort,
          order,
          cursor: InputCursor(after, before),
          limit: Limit(first, last)
        })
      }
    },

    // Permissions
    // ========

    permissions: {
      type: GraphQLList(GraphQLNonNull(GraphQLPermission)),
      args: {},
      resolve: (root, _, {authenticate}) => getPermissions(authenticate)
    },

    // Token
    // =====

    tokens: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLToken))),
      resolve: (root, args, {authenticateUser, prisma: {token}}) =>
        getTokens(authenticateUser, token)
    },

    // Navigation
    // ==========

    navigation: {
      type: GraphQLNavigation,
      args: {id: {type: GraphQLID}, key: {type: GraphQLID}},
      resolve: (root, {id, key}, {authenticate, loaders: {navigationByID, navigationByKey}}) =>
        getNavigationByIdOrKey(id, key, authenticate, navigationByID, navigationByKey)
    },

    navigations: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLNavigation))),
      resolve: (root, args, {authenticate, prisma: {navigation}}) =>
        getNavigations(authenticate, navigation)
    },

    // Author
    // ======

    author: {
      type: GraphQLAuthor,
      args: {id: {type: GraphQLID}, slug: {type: GraphQLSlug}},
      resolve: (root, {id, slug}, {authenticate, loaders: {authorsByID, authorsBySlug}}) =>
        getAuthorByIdOrSlug(id, slug, authenticate, authorsByID, authorsBySlug)
    },

    authors: {
      type: GraphQLNonNull(GraphQLAuthorConnection),
      args: {
        cursor: {type: GraphQLID},
        take: {type: GraphQLInt, defaultValue: 10},
        skip: {type: GraphQLInt, defaultValue: 0},
        filter: {type: GraphQLAuthorFilter},
        sort: {type: GraphQLAuthorSort, defaultValue: AuthorSort.ModifiedAt},
        order: {type: GraphQLSortOrder, defaultValue: SortOrder.Descending}
      },
      resolve: (
        root,
        {filter, sort, order, take, skip, cursor},
        {authenticate, prisma: {author}}
      ) => getAdminAuthors(filter, sort, order, cursor, skip, take, authenticate, author)
    },

    // Image
    // =====

    image: {
      type: GraphQLImage,
      args: {id: {type: GraphQLID}},
      resolve: (root, {id}, {authenticate, loaders: {images}}) =>
        getImageById(id, authenticate, images)
    },

    images: {
      type: GraphQLNonNull(GraphQLImageConnection),
      args: {
        cursor: {type: GraphQLID},
        take: {type: GraphQLInt, defaultValue: 5},
        skip: {type: GraphQLInt, defaultValue: 0},
        filter: {type: GraphQLImageFilter},
        sort: {type: GraphQLImageSort, defaultValue: ImageSort.ModifiedAt},
        order: {type: GraphQLSortOrder, defaultValue: SortOrder.Descending}
      },
      resolve: (root, {filter, sort, order, skip, take, cursor}, {authenticate, prisma: {image}}) =>
        getAdminImages(filter, sort, order, cursor, skip, take, authenticate, image)
    },

    // Comments
    // =======

    comments: {
      type: GraphQLNonNull(GraphQLCommentConnection),
      args: {
        after: {type: GraphQLID},
        before: {type: GraphQLID},
        first: {type: GraphQLInt},
        last: {type: GraphQLInt},
        skip: {type: GraphQLInt},
        filter: {type: GraphQLCommentFilter},
        sort: {type: GraphQLCommentSort, defaultValue: CommentSort.ModifiedAt},
        order: {type: GraphQLSortOrder, defaultValue: SortOrder.Descending}
      },
      async resolve(
        root,
        {filter, sort, order, after, before, first, last, skip},
        {authenticate, dbAdapter}
      ) {
        const {roles} = authenticate()

        const canGetComments = isAuthorised(CanGetComments, roles)

        if (canGetComments) {
          return await dbAdapter.comment.getComments({
            filter,
            sort,
            order,
            cursor: InputCursor(after, before),
            limit: Limit(first, last, skip)
          })
        } else {
          throw new NotAuthorisedError()
        }
      }
    },

    // Article
    // =======

    article: {
      type: GraphQLArticle,
      args: {id: {type: GraphQLNonNull(GraphQLID)}},
      resolve: (root, {id}, {authenticate, loaders}) =>
        getArticleById(id, authenticate, loaders.articles)
    },

    articles: {
      type: GraphQLNonNull(GraphQLArticleConnection),
      args: {
        cursor: {type: GraphQLID},
        take: {type: GraphQLInt, defaultValue: 10},
        skip: {type: GraphQLInt, defaultValue: 0},
        filter: {type: GraphQLArticleFilter},
        sort: {type: GraphQLArticleSort, defaultValue: ArticleSort.ModifiedAt},
        order: {type: GraphQLSortOrder, defaultValue: SortOrder.Descending}
      },
      resolve: (
        root,
        {filter, sort, order, skip, take, cursor},
        {authenticate, prisma: {article}}
      ) => getAdminArticles(filter, sort, order, cursor, skip, take, authenticate, article)
    },

    // Peer Article
    // ============

    peerArticle: {
      type: GraphQLArticle,
      args: {peerID: {type: GraphQLNonNull(GraphQLID)}, id: {type: GraphQLNonNull(GraphQLID)}},
      resolve(root, {peerID, id}, context, info) {
        const {authenticate} = context
        const {roles} = authenticate()

        authorise(CanGetPeerArticle, roles)

        return delegateToPeerSchema(peerID, true, context, {fieldName: 'article', args: {id}, info})
      }
    },

    peerArticles: {
      type: GraphQLNonNull(GraphQLPeerArticleConnection),
      args: {
        after: {type: GraphQLID},
        first: {type: GraphQLInt},
        filter: {type: GraphQLArticleFilter},
        sort: {type: GraphQLArticleSort, defaultValue: ArticleSort.ModifiedAt},
        order: {type: GraphQLSortOrder, defaultValue: SortOrder.Descending},
        peerFilter: {type: GraphQLString},
        last: {type: GraphQLInt},
        skip: {type: GraphQLInt}
      },

      async resolve(
        root,
        {filter, sort, order, after, first, peerFilter, last, skip},
        context,
        info
      ) {
        const {authenticate, loaders, dbAdapter} = context
        const {roles} = authenticate()

        authorise(CanGetPeerArticles, roles)

        after = after ? JSON.parse(base64Decode(after)) : null

        const peers = (await dbAdapter.peer.getPeers()).filter(peer =>
          peerFilter ? peer.name === peerFilter : true
        )

        for (const peer of peers) {
          // Prime loader cache so we don't need to refetch inside `delegateToPeerSchema`.
          loaders.peer.prime(peer.id, peer)
        }

        const articles = await Promise.all(
          peers.map(peer => {
            try {
              if (after && after[peer.id] == null) return null

              return delegateToPeerSchema(peer.id, true, context, {
                info,
                fieldName: 'articles',
                args: {after: after ? after[peer.id] : undefined},
                transforms: [
                  new ExtractField({
                    from: ['articles', 'nodes', 'article'],
                    to: ['articles', 'nodes']
                  }),
                  new WrapQuery(
                    ['articles', 'nodes', 'article'],
                    subtree => ({
                      kind: Kind.SELECTION_SET,
                      selections: [
                        ...subtree.selections,
                        {
                          kind: Kind.FIELD,
                          name: {kind: Kind.NAME, value: 'id'}
                        },
                        {
                          kind: Kind.FIELD,
                          name: {kind: Kind.NAME, value: 'latest'},
                          selectionSet: {
                            kind: Kind.SELECTION_SET,
                            selections: [
                              {
                                kind: Kind.FIELD,
                                name: {kind: Kind.NAME, value: 'updatedAt'}
                              },
                              {
                                kind: Kind.FIELD,
                                name: {kind: Kind.NAME, value: 'publishAt'}
                              },
                              {
                                kind: Kind.FIELD,
                                name: {kind: Kind.NAME, value: 'publishedAt'}
                              }
                            ]
                          }
                        },
                        {
                          kind: Kind.FIELD,
                          name: {kind: Kind.NAME, value: 'modifiedAt'}
                        },
                        {
                          kind: Kind.FIELD,
                          name: {kind: Kind.NAME, value: 'createdAt'}
                        }
                      ]
                    }),
                    result => result
                  ),
                  new WrapQuery(
                    ['articles'],
                    subtree => ({
                      kind: Kind.SELECTION_SET,
                      selections: [
                        ...subtree.selections,
                        {
                          kind: Kind.FIELD,
                          name: {kind: Kind.NAME, value: 'pageInfo'},
                          selectionSet: {
                            kind: Kind.SELECTION_SET,
                            selections: [
                              {
                                kind: Kind.FIELD,
                                name: {kind: Kind.NAME, value: 'endCursor'}
                              },
                              {
                                kind: Kind.FIELD,
                                name: {kind: Kind.NAME, value: 'hasNextPage'}
                              }
                            ]
                          }
                        },
                        {
                          kind: Kind.FIELD,
                          name: {kind: Kind.NAME, value: 'totalCount'}
                        }
                      ]
                    }),
                    result => result
                  )
                ]
              })
            } catch (err) {
              return null
            }
          })
        )

        const totalCount = articles.reduce((prev, result) => prev + (result?.totalCount ?? 0), 0)
        const cursors = Object.fromEntries(
          articles.map((result, index) => [peers[index].id, result?.pageInfo.endCursor ?? null])
        )

        const hasNextPage = articles.reduce(
          (prev, result) => prev || (result?.pageInfo.hasNextPage ?? false),
          false
        )

        const peerArticles = articles.flatMap<PeerArticle & {article: any}>((result, index) => {
          const peer = peers[index]

          return result?.nodes.map((article: any) => ({peerID: peer.id, article})) ?? []
        })

        switch (sort) {
          case ArticleSort.CreatedAt:
            peerArticles.sort(
              (a, b) =>
                new Date(b.article.createdAt).getTime() - new Date(a.article.createdAt).getTime()
            )
            break

          case ArticleSort.ModifiedAt:
            peerArticles.sort(
              (a, b) =>
                new Date(b.article.modifiedAt).getTime() - new Date(a.article.modifiedAt).getTime()
            )
            break

          case ArticleSort.PublishAt:
            peerArticles.sort(
              (a, b) =>
                new Date(b.article.latest.publishAt).getTime() -
                new Date(a.article.latest.publishAt).getTime()
            )
            break

          case ArticleSort.PublishedAt:
            peerArticles.sort(
              (a, b) =>
                new Date(b.article.latest.publishedAt).getTime() -
                new Date(a.article.latest.publishedAt).getTime()
            )
            break

          case ArticleSort.UpdatedAt:
            peerArticles.sort(
              (a, b) =>
                new Date(b.article.latest.updatedAt).getTime() -
                new Date(a.article.latest.updatedAt).getTime()
            )
            break
        }

        if (order === SortOrder.Ascending) {
          peerArticles.reverse()
        }

        return {
          nodes: peerArticles,
          totalCount: totalCount,
          pageInfo: {
            endCursor: base64Encode(JSON.stringify(cursors)),
            hasNextPage: hasNextPage
          }
        }
      }
    },

    articlePreviewLink: {
      type: GraphQLString,
      args: {id: {type: GraphQLNonNull(GraphQLID)}, hours: {type: GraphQLNonNull(GraphQLInt)}},
      resolve: async (
        root,
        {id, hours},
        {authenticate, loaders: {articles}, urlAdapter, generateJWT}
      ) => getArticlePreviewLink(id, hours, authenticate, generateJWT, urlAdapter, articles)
    },

    // Page
    // ====

    page: {
      type: GraphQLPage,
      args: {id: {type: GraphQLID}},
      resolve: (root, {id}, {authenticate, loaders: {pages}}) =>
        getPageById(id, authenticate, pages)
    },

    pages: {
      type: GraphQLNonNull(GraphQLPageConnection),
      args: {
        cursor: {type: GraphQLID},
        take: {type: GraphQLInt, defaultValue: 10},
        skip: {type: GraphQLInt, defaultValue: 0},
        filter: {type: GraphQLArticleFilter},
        sort: {type: GraphQLPageSort, defaultValue: PageSort.ModifiedAt},
        order: {type: GraphQLSortOrder, defaultValue: SortOrder.Descending}
      },
      resolve: (root, {filter, sort, order, skip, take, cursor}, {authenticate, prisma: {page}}) =>
        getAdminPages(filter, sort, order, cursor, skip, take, authenticate, page)
    },

    pagePreviewLink: {
      type: GraphQLString,
      args: {id: {type: GraphQLNonNull(GraphQLID)}, hours: {type: GraphQLNonNull(GraphQLInt)}},
      resolve: (root, {id, hours}, {authenticate, loaders: {pages}, urlAdapter, generateJWT}) =>
        getPagePreviewLink(id, hours, authenticate, generateJWT, urlAdapter, pages)
    },

    // MemberPlan
    // ======

    memberPlan: {
      type: GraphQLMemberPlan,
      args: {id: {type: GraphQLID}, slug: {type: GraphQLSlug}},
      resolve: (root, {id, slug}, {authenticate, loaders: {memberPlansByID, memberPlansBySlug}}) =>
        getMemberPlanByIdOrSlug(id, slug, authenticate, memberPlansByID, memberPlansBySlug)
    },

    memberPlans: {
      type: GraphQLNonNull(GraphQLMemberPlanConnection),
      args: {
        cursor: {type: GraphQLID},
        take: {type: GraphQLInt, defaultValue: 10},
        skip: {type: GraphQLInt, defaultValue: 0},
        filter: {type: GraphQLMemberPlanFilter},
        sort: {type: GraphQLMemberPlanSort, defaultValue: MemberPlanSort.ModifiedAt},
        order: {type: GraphQLSortOrder, defaultValue: SortOrder.Descending}
      },
      resolve: (
        root,
        {filter, sort, order, cursor, take, skip},
        {authenticate, prisma: {memberPlan}}
      ) => getAdminMemberPlans(filter, sort, order, cursor, skip, take, authenticate, memberPlan)
    },

    // PaymentMethod
    // ======

    paymentMethod: {
      type: GraphQLPaymentMethod,
      args: {id: {type: GraphQLID}},
      resolve: (root, {id}, {authenticate, loaders: {paymentMethodsByID}}) =>
        getPaymentMethodById(id, authenticate, paymentMethodsByID)
    },

    paymentMethods: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLPaymentMethod))),
      resolve: (root, _, {authenticate, prisma: {paymentMethod}}) =>
        getPaymentMethods(authenticate, paymentMethod)
    },

    paymentProviders: {
      type: GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLPaymentProvider))),
      resolve(root, _, {authenticate, paymentProviders}) {
        const {roles} = authenticate()
        authorise(CanGetPaymentProviders, roles)

        return paymentProviders.map(paymentProvider => ({
          id: paymentProvider.id,
          name: paymentProvider.name
        }))
      }
    },

    // Invoice
    // ======

    invoice: {
      type: GraphQLInvoice,
      args: {id: {type: GraphQLID}},
      resolve: (root, {id}, {authenticate, loaders: {invoicesByID}}) =>
        getInvoiceById(id, authenticate, invoicesByID)
    },

    invoices: {
      type: GraphQLNonNull(GraphQLInvoiceConnection),
      args: {
        after: {type: GraphQLID},
        before: {type: GraphQLID},
        first: {type: GraphQLInt},
        last: {type: GraphQLInt},
        filter: {type: GraphQLinvoiceFilter},
        sort: {type: GraphQLInvoiceSort, defaultValue: InvoiceSort.ModifiedAt},
        order: {type: GraphQLSortOrder, defaultValue: SortOrder.Descending}
      },
      resolve(root, {filter, sort, order, after, before, first, last}, {authenticate, dbAdapter}) {
        const {roles} = authenticate()
        authorise(CanGetInvoices, roles)

        return dbAdapter.invoice.getInvoices({
          filter,
          sort,
          order,
          cursor: InputCursor(after, before),
          limit: Limit(first, last)
        })
      }
    },

    // Payment
    // ======

    payment: {
      type: GraphQLPayment,
      args: {id: {type: GraphQLID}},
      resolve: (root, {id}, {authenticate, loaders: {paymentsByID}}) =>
        getPaymentById(id, authenticate, paymentsByID)
    },

    payments: {
      type: GraphQLNonNull(GraphQLPaymentConnection),
      args: {
        after: {type: GraphQLID},
        before: {type: GraphQLID},
        first: {type: GraphQLInt},
        last: {type: GraphQLInt},
        filter: {type: GraphQLPaymentFilter},
        sort: {type: GraphQLPaymentSort, defaultValue: PaymentSort.ModifiedAt},
        order: {type: GraphQLSortOrder, defaultValue: SortOrder.Descending}
      },
      resolve(root, {filter, sort, order, after, before, first, last}, {authenticate, dbAdapter}) {
        const {roles} = authenticate()
        authorise(CanGetPayments, roles)

        return dbAdapter.payment.getPayments({
          filter,
          sort,
          order,
          cursor: InputCursor(after, before),
          limit: Limit(first, last)
        })
      }
    }
  }
})
