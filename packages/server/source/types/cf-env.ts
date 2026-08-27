import type { Env } from 'hono'

export interface CFEnv extends Env {
	Bindings: CFBindings
}
