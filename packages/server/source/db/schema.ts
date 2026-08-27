import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { FORMATTED_ID_LENGTH } from '../utils/const.ts'

export const keysTable = sqliteTable('users_table', {
	id: text({ length: FORMATTED_ID_LENGTH }).primaryKey(),
	key: text({ length: 86 }).notNull().unique(),
	name: text().notNull(),
	createdAt: int({ mode: 'timestamp' }).notNull(),
	expiration: int({ mode: 'timestamp' }),
	revoked: int({ mode: 'boolean' }).notNull(),
})
