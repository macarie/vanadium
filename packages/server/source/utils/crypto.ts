import { HASH_ALGORITHM } from './const.ts'
import { formatKey } from './formatter.ts'

export type BufferView = Uint8Array<ArrayBuffer> & { __tag: 'key' }

export function generateKey(byteLength: number) {
	return globalThis.crypto.getRandomValues(
		new Uint8Array(byteLength),
	) as BufferView
}

let te: TextEncoder

export async function hash(input: BufferView | string): Promise<string> {
	let data = input

	if (typeof data === 'string') {
		te ??= new TextEncoder()

		data = te.encode(data) as BufferView
	}

	const hashBufferView = new Uint8Array(
		await globalThis.crypto.subtle.digest(HASH_ALGORITHM, data),
	) as BufferView

	return formatKey(hashBufferView)
}
