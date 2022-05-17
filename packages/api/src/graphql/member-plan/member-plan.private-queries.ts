import {Context} from '../../context'
import {UserInputError} from '../../error'
import {authorise, CanGetMemberPlan} from '../permissions'

export const getMemberPlanByIdOrSlug = (
  id: string | null,
  slug: string | null,
  authenticate: Context['authenticate'],
  memberPlansByID: Context['loaders']['memberPlansByID'],
  memberPlansBySlug: Context['loaders']['memberPlansBySlug']
) => {
  const {roles} = authenticate()
  authorise(CanGetMemberPlan, roles)

  if ((!id && !slug) || (id && slug)) {
    throw new UserInputError('You must provide either `id` or `slug`.')
  }

  return id ? memberPlansByID.load(id) : memberPlansBySlug.load(slug!)
}
