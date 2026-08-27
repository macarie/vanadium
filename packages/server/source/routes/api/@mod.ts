import { Hono } from 'hono'
import { keys } from './keys.ts'

export const api = new Hono()

api.route('/keys', keys)
