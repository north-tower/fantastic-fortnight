/**
 * Calculate the current price of a product based on base price, purchases, and cashouts.
 * @param {number} basePrice - The base price of the product
 * @param {number} totalPurchases - Total number of purchases
 * @param {number} totalCashouts - Total number of cashouts
 * @returns {number} - The current price
 */
function calculateCurrentPrice(basePrice, totalPurchases, totalCashouts) {
  basePrice = Number(basePrice) || 0;
  totalPurchases = Number(totalPurchases) || 0;
  totalCashouts = Number(totalCashouts) || 0;
  return parseFloat((basePrice + (totalPurchases * 0.25) - (totalCashouts * 0.25)).toFixed(2));
}

module.exports = { calculateCurrentPrice }; 