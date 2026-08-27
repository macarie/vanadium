import { Container } from '@cloudflare/containers'

class BaseContainer extends Container {
	override defaultPort = 3000
	override requiredPorts = [3000]
}

export class Playwright_v1_59_0 extends BaseContainer {}
export class Playwright_v1_59_1 extends BaseContainer {}
export class Playwright_v1_60_0 extends BaseContainer {}
export class Playwright_v1_61_0 extends BaseContainer {}
export class Playwright_v1_61_1 extends BaseContainer {}
export class Playwright_v1_62_0 extends BaseContainer {}
export class Playwright_v1_62_1 extends BaseContainer {}
