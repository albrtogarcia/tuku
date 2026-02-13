import { vi } from 'vitest'
import '@testing-library/jest-dom'
import enCommon from '../i18n/locales/en/common.json'

// Flatten nested JSON keys into dot-notation (e.g. { player: { readyToPlay: "..." } } -> { "player.readyToPlay": "..." })
function flattenKeys(obj: Record<string, any>, prefix = ''): Record<string, string> {
	const result: Record<string, string> = {}
	for (const key of Object.keys(obj)) {
		const fullKey = prefix ? `${prefix}.${key}` : key
		if (typeof obj[key] === 'object' && obj[key] !== null) {
			Object.assign(result, flattenKeys(obj[key], fullKey))
		} else {
			result[fullKey] = obj[key]
		}
	}
	return result
}

const flatTranslations = flattenKeys(enCommon)

vi.mock('react-i18next', () => ({
	useTranslation: () => ({
		t: (key: string, opts?: Record<string, any>) => {
			let value = flatTranslations[key] || key
			if (opts) {
				// Handle interpolation
				for (const [k, v] of Object.entries(opts)) {
					if (k === 'count') {
						// Handle pluralization: try _one / _other suffix
						const pluralKey = opts.count === 1 ? `${key}_one` : `${key}_other`
						if (flatTranslations[pluralKey]) {
							value = flatTranslations[pluralKey]
						}
					}
					value = value.replace(`{{${k}}}`, String(v))
				}
			}
			return value
		},
		i18n: {
			changeLanguage: vi.fn(),
			resolvedLanguage: 'en',
		},
	}),
	initReactI18next: { type: '3rdParty', init: vi.fn() },
}))
