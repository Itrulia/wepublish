import {CommentState, PrismaClient} from '@prisma/client'

export const getPublicChildrenCommentsByParentId = (
  parentId: string,
  userId: string,
  comment: PrismaClient['comment']
) =>
  comment.findMany({
    where: {
      AND: [{parentID: parentId}, {OR: [{userID: userId}, {state: CommentState.approved}]}]
    },
    orderBy: {
      modifiedAt: 'desc'
    }
  })
