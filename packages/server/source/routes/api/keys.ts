import { sValidator } from '@hono/standard-validator'
import { desc, eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/d1'
import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { number, object, string } from 'valibot'
import { keysTable } from '../../db/schema.ts'
import { ID_BYTES } from '../../utils/const.ts'
import { generateKey, hash } from '../../utils/crypto.ts'
import { formatKey } from '../../utils/formatter.ts'

import type { CFEnv } from '../../types/cf-env.ts'

export const keys = new Hono<CFEnv>()

keys.use('*', (c, next) => {
	const bearer = bearerAuth<CFEnv>({
		token: c.env.ROOT_KEY,
	})

	return bearer(c, next)
})

const postSchema = object({
	name: string(),
	expiresIn: number(),
})

keys.post('/', sValidator('json', postSchema), async (c) => {
	const { expiresIn, name } = c.req.valid('json')
	const db = drizzle(c.env.keys)

	const id = formatKey(generateKey(ID_BYTES))
	const key = formatKey(generateKey(c.env.KEY_BYTES))
	const timestamp = new Date()
	const expiration =
		expiresIn > 0 ? new Date(timestamp.getTime() + expiresIn * 1000) : null

	await db.insert(keysTable).values({
		id,
		key: await hash(key),
		name,
		createdAt: timestamp,
		expiration,
		revoked: false,
	})

	return c.json({
		success: true,
		id,
		key,
		name,
		expiration,
	})
})

keys.delete('/delete/:id', async (c) => {
	const id = c.req.param('id')
	const db = drizzle(c.env.keys)

	await db.update(keysTable).set({ revoked: true }).where(eq(keysTable.id, id))

	return c.json({ success: true })
})

keys.get('/list', async (c) => {
	const db = drizzle(c.env.keys)
	const keyList = await db
		.select({
			id: keysTable.id,
			name: keysTable.name,
			createdAt: keysTable.createdAt,
			expiration: keysTable.expiration,
			revoked: keysTable.revoked,
		})
		.from(keysTable)
		.orderBy(desc(keysTable.createdAt))

	return c.json({
		success: true,
		keys: keyList,
	})
})
