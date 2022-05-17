import {InputCursor, InputCursorType} from '../../db/common'

export type Cursor = {
  id: string
  date: Date | null
}

export const decodeCursor = (cursor: InputCursor): Cursor | null => {
  if (cursor.type === InputCursorType.None) {
    return null
  }

  const [id, timestampStr] = atob(cursor.data).split('|')

  return {
    id,
    date: timestampStr ? new Date(+timestampStr) : null
  }
}
