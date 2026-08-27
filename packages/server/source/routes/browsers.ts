import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { keysTable } from '../db/schema.ts'
import { hash } from '../utils/crypto.ts'
import { containerFromVersion } from '../utils/pw-container.ts'

import type { CFEnv } from '../types/cf-env.ts'

interface BrowsersEnv extends CFEnv {
	Variables: {
		apiKey: typeof keysTable.$inferSelect
	}
}

export const browsers = new Hono<BrowsersEnv>()

browsers.use('*', async (c, next) => {
	const bearer = bearerAuth<BrowsersEnv>({
		verifyToken: async (token, c) => {
			const db = drizzle(c.env.keys)
			const [key] = await db
				.select()
				.from(keysTable)
				.where(eq(keysTable.key, await hash(token)))
				.limit(1)

			if (!key) {
				return false
			}

			// potentially tell if it's revoked or expired

			c.set('apiKey', key)

			if (key.revoked || (key.expiration && key.expiration < new Date())) {
				return false
			}

			return true
		},
	})

	return bearer(c, next)
})

browsers.get('/*', async (c) => {
	if (c.req.header('Upgrade') !== 'websocket') {
		return
	}

	const version = c.req
		.header('User-Agent')
		?.match(/Playwright\/(?<version>\d+\.\d+\.\d+)/)?.groups?.version
	const container = containerFromVersion(c.env, version)

	console.log('--- playwright', version)
	console.log('--- browser', c.req.header('x-playwright-browser'))

	await container.startAndWaitForPorts({
		ports: [3000],
		startOptions: {
			entrypoint: [
				'/bin/sh',
				'-c',
				`npx -y playwright@${version} run-server --port 3000 --host 0.0.0.0`,
			],
			enableInternet: true,
		},
		cancellationOptions: {
			portReadyTimeoutMS: 30_000,
		},
	})

	const headers = new Headers(c.req.raw.headers)

	headers.delete('Host')
	headers.delete('Authorization')

	const url = new URL(c.req.raw.url)

	url.pathname = '/'

	const request = new Request(url, {
		headers,
		body: c.req.raw.body,
		method: c.req.raw.method,
		redirect: c.req.raw.redirect,
	})

	return container.fetch(request)
})
