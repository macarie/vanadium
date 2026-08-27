import { Hono } from 'hono'
import { api } from './api/@mod.ts'
import { browsers } from './browsers.ts'

export const routes = new Hono()

routes.route('/api', api)
routes.route('/browsers', browsers)
