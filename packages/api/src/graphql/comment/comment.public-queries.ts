import {CommentState, PrismaClient} from '@prisma/client'

export const getPublicChildrenCommentsByParentId = (
  parentId: number,
  userId: number | null,
  comment: PrismaClient['comment']
) =>
  comment.findMany({
    where: {
      AND: [
        {parentID: parentId},
        {OR: [userId ? {userID: userId} : {}, {state: CommentState.approved}]}
      ]
    },
    orderBy: {
      modifiedAt: 'desc'
    }
  })

export const getPublicCommentsForItemById = async (
  itemId: number,
  userId: number | null,
  comment: PrismaClient['comment']
) => {
  const comments = await comment.findMany({
    where: {
      OR: [
        {itemID: itemId, state: CommentState.approved, parentID: null},
        userId ? {itemID: itemId, userID: userId, parentID: null} : {}
      ]
    },
    include: {
      revisions: true
    }
  })

  return comments.map(({revisions, ...comment}) => ({
    text: revisions[revisions.length - 1],
    ...comment
  }))
}
