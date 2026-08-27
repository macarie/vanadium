import { getContainer } from '@cloudflare/containers'

export function containerFromVersion(
	env: CFBindings,
	version: string | undefined,
) {
	switch (version) {
		case '1.62.1':
			return getContainer(env.PLAYWRIGHT_1_62_1)

		case '1.62.0':
			return getContainer(env.PLAYWRIGHT_1_62_0)

		case '1.61.1':
			return getContainer(env.PLAYWRIGHT_1_61_1)

		case '1.61.0':
			return getContainer(env.PLAYWRIGHT_1_61_0)

		case '1.60.0':
			return getContainer(env.PLAYWRIGHT_1_60_0)

		case '1.59.1':
			return getContainer(env.PLAYWRIGHT_1_59_1)

		case '1.59.0':
			return getContainer(env.PLAYWRIGHT_1_59_0)

		default:
			throw new Error(`Unsupported Playwright version: ${version}`)
	}
}
