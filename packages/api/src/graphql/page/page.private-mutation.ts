import {Prisma, PrismaClient} from '@prisma/client'
import {Context} from '../../context'
import {DuplicatePageSlugError, NotFound} from '../../error'
import {authorise, CanCreatePage, CanDeletePage, CanPublishPage} from '../permissions'

export const deletePageById = async (
  id: number,
  authenticate: Context['authenticate'],
  page: PrismaClient['page'],
  pageRevision: PrismaClient['pageRevision']
) => {
  const {roles} = authenticate()
  authorise(CanDeletePage, roles)

  await pageRevision.deleteMany({
    where: {
      OR: [
        {
          DraftPage: {
            every: {
              id
            }
          }
        },
        {
          PendingPage: {
            every: {
              id
            }
          }
        },
        {
          PublishedPage: {
            every: {
              id
            }
          }
        }
      ]
    }
  })

  return page.delete({
    where: {
      id
    }
  })
}

export const createPage = (
  input: Omit<Prisma.PageRevisionCreateInput, 'updatedAt' | 'revision'>,
  authenticate: Context['authenticate'],
  page: PrismaClient['page']
) => {
  const {roles} = authenticate()
  authorise(CanCreatePage, roles)

  return page.create({
    data: {
      draft: {
        create: {
          ...input,
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

export const duplicatePage = async (
  id: number,
  authenticate: Context['authenticate'],
  pages: Context['loaders']['pages'],
  pageClient: PrismaClient['page']
) => {
  const {roles} = authenticate()
  authorise(CanCreatePage, roles)

  const page = await pages.load(id)
  if (!page) {
    throw new NotFound('page', id)
  }

  const {id: _, ...pageRevision} = (page.draft ?? page.pending ?? page.published)!

  const input: Prisma.PageRevisionCreateInput = {
    ...pageRevision,
    blocks: pageRevision.blocks as Prisma.JsonValue[],
    slug: '',
    revision: 0,
    publishedAt: null,
    updatedAt: new Date(),
    createdAt: new Date()
  }

  return pageClient.create({
    data: {
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

export const unpublishPage = async (
  id: number,
  authenticate: Context['authenticate'],
  pageClient: PrismaClient['page']
) => {
  const {roles} = authenticate()
  authorise(CanPublishPage, roles)

  const page = await pageClient.findUnique({
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

  if (!page) {
    throw new NotFound('page', id)
  }

  const {id: _, ...revision} = (page.pending ?? page.published)!

  return pageClient.update({
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

export const publishPage = async (
  id: number,
  input: Pick<Prisma.PageRevisionCreateInput, 'publishAt' | 'publishedAt' | 'updatedAt'>,
  authenticate: Context['authenticate'],
  pageClient: PrismaClient['page']
) => {
  const {roles} = authenticate()
  authorise(CanPublishPage, roles)

  const publishAt = input.publishAt ?? new Date()
  const publishedAt = input.publishedAt
  const updatedAt = input.updatedAt

  const page = await pageClient.findUnique({
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

  if (!page) throw new NotFound('page', id)
  if (!page.draft) return null

  const {id: _, ...revision} = page.draft

  const publishedPage = await pageClient.findFirst({
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

  if (publishedPage && publishedPage.id !== id) {
    throw new DuplicatePageSlugError(
      publishedPage.id,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (publishedPage.published || publishedPage.pending)!.slug!
    )
  }

  if (publishAt > new Date()) {
    return pageClient.update({
      where: {id},
      data: {
        pending: {
          upsert: {
            create: {
              ...revision,
              publishAt: publishAt,
              publishedAt: publishedAt ?? page?.published?.publishedAt ?? publishAt,
              updatedAt: updatedAt ?? publishAt
            },
            update: {
              ...revision,
              publishAt: publishAt,
              publishedAt: publishedAt ?? page?.published?.publishedAt ?? publishAt,
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

  return pageClient.update({
    where: {id},
    data: {
      published: {
        upsert: {
          create: {
            ...revision,
            publishedAt: publishedAt ?? page.published?.publishAt ?? publishAt,
            updatedAt: updatedAt ?? publishAt,
            publishAt: null
          },
          update: {
            ...revision,
            publishedAt: publishedAt ?? page.published?.publishAt ?? publishAt,
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

type UpdatePageInput = Omit<
  Prisma.PageRevisionCreateInput,
  'revision' | 'properties' | 'createdAt' | 'updatedAt' | 'publishAt' | 'publishedAt'
> & {
  properties: Prisma.MetadataPropertyUncheckedCreateWithoutPageRevisionInput[]
}

export const updatePage = async (
  id: number,
  {properties, ...input}: UpdatePageInput,
  authenticate: Context['authenticate'],
  pageClient: PrismaClient['page']
) => {
  const {roles} = authenticate()
  authorise(CanCreatePage, roles)

  const page = await pageClient.findUnique({
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

  if (!page) {
    throw new NotFound('page', id)
  }

  return pageClient.update({
    where: {id},
    data: {
      draft: {
        upsert: {
          update: {
            ...input,
            revision: page.pending
              ? page.pending.revision + 1
              : page.published
              ? page.published.revision + 1
              : 0,
            updatedAt: new Date(),
            createdAt: page.draft?.createdAt ?? new Date(),
            properties: {
              deleteMany: {
                pageRevisionId: page.draft?.id ?? 0
              },
              createMany: {
                data: properties
              }
            }
          },
          create: {
            ...input,
            revision: page.pending
              ? page.pending.revision + 1
              : page.published
              ? page.published.revision + 1
              : 0,
            updatedAt: new Date(),
            createdAt: page.draft?.createdAt ?? new Date(),
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
