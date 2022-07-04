import {User, UserRole} from '@prisma/client'

export enum SessionType {
  User = 'user',
  Token = 'token'
}

export interface TokenSession {
  type: SessionType.Token
  id: number
  name: string
  token: string
  roles: UserRole[]
}

export interface UserSession {
  type: SessionType.User
  id: number
  user: User
  roles: UserRole[]
  createdAt: Date
  expiresAt: Date
  token: string
}

export type Session = TokenSession | UserSession
