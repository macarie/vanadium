#!/usr/bin/env node

import { inspect, stripVTControlCharacters } from 'node:util'

type CreatedKey = {
	id: string
	key: string
	name: string
	expiration: string | null
}

type KeySummary = {
	id: string
	name: string
	createdAt: string
	expiration: string | null
	revoked: boolean
}

const colorEnabled = Boolean(
	process.stdout.isTTY && process.env.NO_COLOR === undefined,
)

const style = {
	bold: (text: string) => ansi('1', text),
	dim: (text: string) => ansi('2', text),
	cyan: (text: string) => ansi('38;5;81', text),
	green: (text: string) => ansi('38;5;84', text),
	yellow: (text: string) => ansi('38;5;220', text),
	red: (text: string) => ansi('38;5;203', text),
	purple: (text: string) => ansi('38;5;213', text),
}

function ansi(code: string, text: string): string {
	return colorEnabled ? `\u001B[${code}m${text}\u001B[0m` : text
}

function usage(): string {
	return [
		style.bold(style.purple('VANADIUM KEYS')),
		'',
		`  ${style.cyan('create')} ${style.dim('{name} [--expires-in {seconds}]')}  Create a key`,
		`  ${style.cyan('list')}                                    List existing keys`,
		`  ${style.cyan('revoke')} ${style.dim('{id}')}                             Revoke a key`,
		'',
		style.dim('Environment'),
		`  ${style.bold('VANADIUM_HOSTNAME')}  Server origin (default: http://localhost:8787)`,
		`  ${style.bold('ROOT_KEY')}          Root bearer key (required)`,
	].join('\n')
}

function apiUrl(path: string): URL {
	const hostname = process.env.VANADIUM_HOSTNAME ?? 'http://localhost:8787'

	try {
		const url = new URL(hostname)
		url.pathname = path
		url.search = ''
		url.hash = ''
		return url
	} catch {
		throw new Error(`VANADIUM_HOSTNAME is not a valid URL: ${hostname}`)
	}
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
	const rootKey = process.env.ROOT_KEY
	if (!rootKey) {
		throw new Error('ROOT_KEY is required')
	}

	const headers = new Headers(init?.headers)
	headers.set('authorization', `Bearer ${rootKey}`)
	if (init?.body !== undefined) {
		headers.set('content-type', 'application/json')
	}

	const response = await fetch(apiUrl(path), { ...init, headers })
	const text = await response.text()
	let body: unknown

	try {
		body = text ? JSON.parse(text) : undefined
	} catch {
		body = text
	}

	if (!response.ok) {
		const detail = errorDetail(body)
		throw new Error(
			`${response.status} ${response.statusText}${detail ? `: ${detail}` : ''}`,
		)
	}

	return body
}

function errorDetail(body: unknown): string {
	if (typeof body === 'string') return body
	if (!isRecord(body)) return ''
	if (typeof body.message === 'string') return body.message
	if (typeof body.error === 'string') return body.error
	return inspect(body, { colors: colorEnabled, depth: 3, breakLength: 100 })
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function readCreatedKey(body: unknown): CreatedKey {
	if (
		!isRecord(body) ||
		body.success !== true ||
		typeof body.id !== 'string' ||
		typeof body.key !== 'string' ||
		typeof body.name !== 'string' ||
		!(typeof body.expiration === 'string' || body.expiration === null)
	) {
		throw new Error('Server returned an unexpected response')
	}

	return {
		id: body.id,
		key: body.key,
		name: body.name,
		expiration: body.expiration,
	}
}

function readKeyList(body: unknown): KeySummary[] {
	if (!isRecord(body) || body.success !== true || !Array.isArray(body.keys)) {
		throw new Error('Server returned an unexpected response')
	}

	return body.keys.map((key) => {
		if (
			!isRecord(key) ||
			typeof key.id !== 'string' ||
			typeof key.name !== 'string' ||
			typeof key.createdAt !== 'string' ||
			!(typeof key.expiration === 'string' || key.expiration === null) ||
			typeof key.revoked !== 'boolean'
		) {
			throw new Error('Server returned an unexpected response')
		}

		return {
			id: key.id,
			name: key.name,
			createdAt: key.createdAt,
			expiration: key.expiration,
			revoked: key.revoked,
		}
	})
}

function box(title: string, rows: Array<[string, string]>): string {
	const labelWidth = Math.max(10, ...rows.map(([label]) => label.length))
	const content = rows.map(
		([label, value]) => `${style.dim(label.padEnd(labelWidth))} ${value}`,
	)
	const width = Math.max(
		title.length + 2,
		...rows.map(
			([, value]) => labelWidth + stripVTControlCharacters(value).length + 1,
		),
	)
	const top = `\u256d\u2500 ${style.bold(style.purple(title))} ${'\u2500'.repeat(Math.max(1, width - title.length - 1))}\u256e`
	const middle = content.map((line, index) => {
		const [, value] = rows[index] ?? ['', '']
		const padding = ' '.repeat(
			width - labelWidth - stripVTControlCharacters(value).length - 1,
		)
		return `\u2502 ${line}${padding} \u2502`
	})
	const bottom = `\u2570${'\u2500'.repeat(width + 2)}\u256f`

	return [top, ...middle, bottom].join('\n')
}

function formatDate(value: string): string {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value

	return new Intl.DateTimeFormat(undefined, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(date)
}

function keyStatus(key: KeySummary): string {
	const statuses: string[] = []
	if (key.revoked) statuses.push(style.red('REVOKED'))
	if (
		key.expiration !== null &&
		new Date(key.expiration).getTime() <= Date.now()
	) {
		statuses.push(style.yellow('EXPIRED'))
	}

	return statuses.length > 0
		? statuses.join(style.dim(', '))
		: style.green('ACTIVE')
}

async function create(name: string, expiresIn: number): Promise<void> {
	const body = await request('/api/keys', {
		method: 'POST',
		body: JSON.stringify({ name, expiresIn }),
	})
	const created = readCreatedKey(body)

	console.log(
		box('KEY CREATED', [
			['Name', created.name],
			['ID', created.id],
			['Key', style.bold(style.cyan(created.key))],
			[
				'Expires',
				created.expiration === null ? 'Never' : formatDate(created.expiration),
			],
		]),
	)
	console.log(style.yellow('\nStore this key now. It will not be shown again.'))
}

async function list(): Promise<void> {
	const keys = readKeyList(await request('/api/keys/list'))
	if (keys.length === 0) {
		console.log(box('KEYS', [['Status', style.dim('No keys found')]]))
		return
	}

	for (const [index, key] of keys.entries()) {
		if (index > 0) console.log()
		console.log(
			box(key.name, [
				['ID', key.id],
				['Status', keyStatus(key)],
				['Created', formatDate(key.createdAt)],
				[
					'Expires',
					key.expiration === null ? 'Never' : formatDate(key.expiration),
				],
			]),
		)
	}
}

async function revoke(id: string): Promise<void> {
	const body = await request(`/api/keys/delete/${encodeURIComponent(id)}`, {
		method: 'DELETE',
	})
	if (!isRecord(body) || body.success !== true) {
		throw new Error('Server returned an unexpected response')
	}

	console.log(
		box('KEY REVOKED', [
			['ID', id],
			['Status', style.red('REVOKED')],
		]),
	)
}

async function main(): Promise<void> {
	const [command, ...args] = process.argv.slice(2)

	switch (command) {
		case 'create': {
			const [name, option, value] = args
			if (!name || (args.length !== 1 && args.length !== 3)) {
				throw new Error('Usage: create {name} [--expires-in {seconds}]')
			}
			if (args.length === 3 && option !== '--expires-in') {
				throw new Error(`Unknown option: ${option}`)
			}

			const expiresIn = value === undefined ? 0 : Number(value)
			if (
				value?.trim() === '' ||
				!Number.isFinite(expiresIn) ||
				expiresIn < 0
			) {
				throw new Error('--expires-in must be a non-negative number')
			}

			await create(name, expiresIn)
			break
		}
		case 'list': {
			if (args.length !== 0) throw new Error('Usage: list')
			await list()
			break
		}
		case 'revoke': {
			if (args.length !== 1 || !args[0]) throw new Error('Usage: revoke {id}')
			await revoke(args[0])
			break
		}
		case '--help':
		case '-h':
		case undefined:
			console.log(usage())
			break
		default:
			throw new Error(`Unknown command: ${command}`)
	}
}

try {
	await main()
} catch (error) {
	const message = error instanceof Error ? error.message : String(error)
	console.error(`${style.bold(style.red('Error:'))} ${message}`)
	process.exitCode = 1
}
