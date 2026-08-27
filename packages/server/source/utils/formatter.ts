import type { BufferView } from './crypto.ts'

export function formatKey(key: BufferView): string {
	return key.toBase64({
		alphabet: 'base64url',
		omitPadding: true,
	})
}

export function formattedKeyLength(byteLength: number): number {
	return Math.ceil((byteLength * 4) / 3)
}
