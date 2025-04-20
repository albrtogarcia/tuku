import { formatTime } from './utils'

describe('formatTime', () => {
	it('formats seconds as mm:ss', () => {
		expect(formatTime(0)).toBe('0:00')
		expect(formatTime(5)).toBe('0:05')
		expect(formatTime(65)).toBe('1:05')
		expect(formatTime(600)).toBe('10:00')
	})
})
