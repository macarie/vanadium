import { formattedKeyLength } from './formatter.ts'

// configurable
export const ID_BYTES = 16

// derived
export const FORMATTED_ID_LENGTH = formattedKeyLength(ID_BYTES)

// constants
export const HASH_ALGORITHM = 'SHA-512'
export const HASH_LENGTH = 86
