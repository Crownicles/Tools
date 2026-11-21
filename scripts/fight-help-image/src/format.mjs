// Figures written the way each language writes them (separators, percent sign, ranges)

/**
 * Writes a range of values, or a single value when its ends are written the same way
 * @param {Intl.NumberFormat} format
 * @param {{ min: number, max: number }} range
 */
function formatRange(format, range) {
	const min = format.format(range.min);
	const max = format.format(range.max);
	return min === max ? min : format.formatRange(range.min, range.max);
}

/**
 * Damage of an action, as an integer
 * @param {{ min: number, max: number }} range
 * @param {string} language
 */
export function formatNumber(range, language) {
	return formatRange(new Intl.NumberFormat(language, { maximumFractionDigits: 0 }), range);
}

/**
 * Probability of an action, given in percent
 * @param {{ min: number, max: number }} range
 * @param {string} language
 */
export function formatPercent(range, language) {
	return formatRange(new Intl.NumberFormat(language, {
		style: "percent", maximumFractionDigits: 0
	}), {
		min: range.min / 100, max: range.max / 100
	});
}
