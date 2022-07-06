import {Article, Prisma, PrismaClient} from '@prisma/client'
import {Context} from '../../context'
import {ArticleWithRevisions} from '../../db/article'
import {DuplicateArticleSlugError, NotFound} from '../../error'
import {authorise, CanCreateArticle, CanDeleteArticle, CanPublishArticle} from '../permissions'

export const deleteArticleById = async (
  id: number,
  authenticate: Context['authenticate'],
  article: PrismaClient['article'],
  articleRevision: PrismaClient['articleRevision']
): Promise<Article> => {
  const {roles} = authenticate()
  authorise(CanDeleteArticle, roles)

  await articleRevision.deleteMany({
    where: {
      OR: [
        {
          DraftArticle: {
            every: {
              id
            }
          }
        },
        {
          PendingArticle: {
            every: {
              id
            }
          }
        },
        {
          PublishedArticle: {
            every: {
              id
            }
          }
        }
      ]
    }
  })

  return article.delete({
    where: {
      id
    }
  })
}

export const createArticle = (
  input: Pick<Prisma.ArticleUncheckedCreateInput, 'shared'> &
    Omit<Prisma.ArticleRevisionCreateInput, 'updatedAt' | 'revision'>,
  authenticate: Context['authenticate'],
  article: PrismaClient['article']
): Promise<ArticleWithRevisions> => {
  const {roles} = authenticate()
  authorise(CanCreateArticle, roles)
  const {shared, ...data} = input

  return article.create({
    data: {
      shared,
      draft: {
        create: {
          ...data,
          revision: 0
        }
      }
    },
    include: {
      draft: {
        include: {
          properties: true
        }
      },
      pending: {
        include: {
          properties: true
        }
      },
      published: {
        include: {
          properties: true
        }
      }
    }
  })
}

export const duplicateArticle = async (
  id: number,
  authenticate: Context['authenticate'],
  articles: Context['loaders']['articles'],
  articleClient: PrismaClient['article']
): Promise<ArticleWithRevisions> => {
  const {roles} = authenticate()
  authorise(CanCreateArticle, roles)

  const article = await articles.load(id)
  if (!article) {
    throw new NotFound('article', id)
  }

  const {
    id: _id,
    updatedAt: _updatedAt,
    createdAt: _createdAt,
    publishedAt: _publishedAt,
    slug: _slug,
    properties,
    ...articleRevision
  } = (article.draft ?? article.pending ?? article.published)!

  const duplicatedProperties = properties.map(property => ({
    key: property.key,
    value: property.value,
    public: property.public
  }))

  const input: Prisma.ArticleRevisionCreateInput = {
    ...articleRevision,
    properties: {
      createMany: {
        data: duplicatedProperties
      }
    }
  }

  return articleClient.create({
    data: {
      shared: article.shared,
      draft: {
        create: input
      }
    },
    include: {
      draft: {
        include: {
          properties: true
        }
      },
      pending: {
        include: {
          properties: true
        }
      },
      published: {
        include: {
          properties: true
        }
      }
    }
  })
}

export const unpublishArticle = async (
  id: number,
  authenticate: Context['authenticate'],
  articleClient: PrismaClient['article']
): Promise<ArticleWithRevisions> => {
  const {roles} = authenticate()
  authorise(CanPublishArticle, roles)

  const article = await articleClient.findUnique({
    where: {id},
    include: {
      draft: {
        include: {
          properties: true
        }
      },
      pending: {
        include: {
          properties: true
        }
      },
      published: {
        include: {
          properties: true
        }
      }
    }
  })

  if (!article) {
    throw new NotFound('article', id)
  }

  const {id: _, ...revision} = (article.pending ?? article.published)!

  return articleClient.update({
    where: {id},
    data: {
      draft: {
        upsert: {
          create: {
            ...revision,
            publishAt: null,
            publishedAt: null,
            updatedAt: null
          },
          update: {
            ...revision,
            publishAt: null,
            publishedAt: null,
            updatedAt: null
          }
        }
      },
      pending: {
        delete: true
      },
      published: {
        delete: true
      }
    },
    include: {
      draft: {
        include: {
          properties: true
        }
      },
      pending: {
        include: {
          properties: true
        }
      },
      published: {
        include: {
          properties: true
        }
      }
    }
  })
}

export const publishArticle = async (
  id: number,
  input: Pick<Prisma.ArticleRevisionCreateInput, 'publishAt' | 'publishedAt' | 'updatedAt'>,
  authenticate: Context['authenticate'],
  articleClient: PrismaClient['article']
): Promise<ArticleWithRevisions | null> => {
  const {roles} = authenticate()
  authorise(CanPublishArticle, roles)

  const publishAt = input.publishAt ?? new Date()
  const publishedAt = input.publishedAt
  const updatedAt = input.updatedAt

  const article = await articleClient.findUnique({
    where: {id},
    include: {
      draft: {
        include: {
          properties: true
        }
      },
      pending: {
        include: {
          properties: true
        }
      },
      published: {
        include: {
          properties: true
        }
      }
    }
  })

  if (!article) throw new NotFound('article', id)
  if (!article.draft) return null

  const {id: _, ...revision} = article.draft

  const publishedArticle = await articleClient.findFirst({
    where: {
      OR: [
        {
          published: {
            is: {
              slug: revision.slug
            }
          }
        },
        {
          pending: {
            is: {
              slug: revision.slug
            }
          }
        }
      ]
    },
    include: {
      draft: {
        include: {
          properties: true
        }
      },
      pending: {
        include: {
          properties: true
        }
      },
      published: {
        include: {
          properties: true
        }
      }
    }
  })

  if (publishedArticle && publishedArticle.id !== id) {
    throw new DuplicateArticleSlugError(
      publishedArticle.id,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (publishedArticle.published || publishedArticle.pending)!.slug!
    )
  }

  if (publishAt > new Date()) {
    return articleClient.update({
      where: {id},
      data: {
        pending: {
          upsert: {
            create: {
              ...revision,
              publishAt: publishAt,
              publishedAt: publishedAt ?? article?.published?.publishedAt ?? publishAt,
              updatedAt: updatedAt ?? publishAt
            },
            update: {
              ...revision,
              publishAt: publishAt,
              publishedAt: publishedAt ?? article?.published?.publishedAt ?? publishAt,
              updatedAt: updatedAt ?? publishAt
            }
          }
        },
        draft: {
          delete: true
        }
      },
      include: {
        draft: {
          include: {
            properties: true
          }
        },
        pending: {
          include: {
            properties: true
          }
        },
        published: {
          include: {
            properties: true
          }
        }
      }
    })
  }

  return articleClient.update({
    where: {id},
    data: {
      published: {
        upsert: {
          create: {
            ...revision,
            publishedAt: publishedAt ?? article.published?.publishAt ?? publishAt,
            updatedAt: updatedAt ?? publishAt,
            publishAt: null
          },
          update: {
            ...revision,
            publishedAt: publishedAt ?? article.published?.publishAt ?? publishAt,
            updatedAt: updatedAt ?? publishAt,
            publishAt: null
          }
        }
      },
      pending: {
        delete: true
      },
      draft: {
        delete: true
      }
    },
    include: {
      draft: {
        include: {
          properties: true
        }
      },
      pending: {
        include: {
          properties: true
        }
      },
      published: {
        include: {
          properties: true
        }
      }
    }
  })
}

type UpdateArticleInput = Omit<
  Prisma.ArticleRevisionCreateInput,
  'revision' | 'properties' | 'createdAt' | 'updatedAt' | 'publishAt' | 'publishedAt'
> & {
  properties: Prisma.MetadataPropertyUncheckedCreateWithoutArticleRevisionInput[]
}

export const updateArticle = async (
  id: number,
  {properties, ...input}: UpdateArticleInput,
  authenticate: Context['authenticate'],
  articleClient: PrismaClient['article']
) => {
  const {roles} = authenticate()
  authorise(CanCreateArticle, roles)

  const article = await articleClient.findUnique({
    where: {id},
    include: {
      draft: {
        include: {
          properties: true
        }
      },
      pending: {
        include: {
          properties: true
        }
      },
      published: {
        include: {
          properties: true
        }
      }
    }
  })

  if (!article) {
    throw new NotFound('article', id)
  }

  return articleClient.update({
    where: {id},
    data: {
      draft: {
        upsert: {
          update: {
            ...input,
            revision: article.pending
              ? article.pending.revision + 1
              : article.published
              ? article.published.revision + 1
              : 0,
            updatedAt: new Date(),
            createdAt: article.draft?.createdAt ?? new Date(),
            properties: {
              deleteMany: {
                articleRevisionId: article.draft?.id ?? 0
              },
              createMany: {
                data: properties
              }
            }
          },
          create: {
            ...input,
            revision: article.pending
              ? article.pending.revision + 1
              : article.published
              ? article.published.revision + 1
              : 0,
            updatedAt: new Date(),
            createdAt: article.draft?.createdAt ?? new Date(),
            properties: {
              createMany: {
                data: properties
              }
            }
          }
        }
      }
    },
    include: {
      draft: {
        include: {
          properties: true
        }
      },
      pending: {
        include: {
          properties: true
        }
      },
      published: {
        include: {
          properties: true
        }
      }
    }
  })
}
