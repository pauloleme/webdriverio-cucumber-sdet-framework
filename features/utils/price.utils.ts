/**
 * Parses a currency string (e.g., "$29.99" or "29.99") into integer cents.
 * Using integer arithmetic avoids floating-point precision issues inherent to IEEE 754.
 */
export function parsePriceToCents(priceString: string): number {
    const match = priceString.match(/\$?(\d+)\.(\d{2})/);
    if (!match) {
        throw new Error(`Unable to parse price amount from string: "${priceString}"`);
    }

    const dollars = parseInt(match[1], 10);
    const cents = parseInt(match[2], 10);
    return dollars * 100 + cents;
}

/**
 * Formats an amount in integer cents back to standard currency string (e.g. "$29.99").
 */
export function formatCentsToPrice(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Sums an array of price strings using map and reduce on integer cents.
 */
export function calculateTotalInCents(prices: string[]): number {
    return prices
        .map(parsePriceToCents)
        .reduce((sum, itemCents) => sum + itemCents, 0);
}
