import {Context} from '../../context'
import {authorise, CanGetImage} from '../permissions'

export const getImageById = (
  id: string,
  authenticate: Context['authenticate'],
  imageLoader: Context['loaders']['images']
) => {
  const {roles} = authenticate()
  authorise(CanGetImage, roles)

  return imageLoader.load(id)
}
