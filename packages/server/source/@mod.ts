import { Hono } from 'hono'
import { routes } from './routes/@mod.ts'

const app = new Hono()

app.route('/', routes)

export default app

export * from './containers.ts'
