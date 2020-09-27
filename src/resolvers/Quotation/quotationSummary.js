import getRateObjectForRate from "@reactioncommerce/api-utils/getRateObjectForRate.js";

/**
 * @name Quotation/quotationSummary
 * @method
 * @memberof Quotation/GraphQL
 * @summary Returns an aggregate of all fulfillmentGroup summaries to provide a single quotationSummary
 * @param {Object} context An object with request-specific state
 * @param {Object} quotation - Result of the parent resolver, which is a Quotation object in GraphQL schema format
 * @returns {Object} An object containing quotation pricing information from all fulfillmentGroups
 */
export default async function quotationSummary(context, quotation) {
  const { currencyCode, shipping: fulfillmentMethods } = quotation;
  const totalDiscounts = [];
  const totalShipping = [];
  const totalSubtotal = [];
  const totalSurcharges = [];
  const totalTaxableAmount = [];
  const totalTaxes = [];
  const totalTotal = [];

  // Loop over each fulfillmentGroup (shipping[]), and push all values into `totalX` array
  fulfillmentMethods.forEach((fulfillmentMethod) => {
    const { invoice: { discounts, shipping, subtotal, surcharges, taxableAmount, taxes, total } } = fulfillmentMethod;

    totalDiscounts.push(discounts);
    totalShipping.push(shipping);
    totalSubtotal.push(subtotal);
    totalSurcharges.push(surcharges);
    totalTaxableAmount.push(taxableAmount);
    totalTaxes.push(taxes);
    totalTotal.push(total);
  });

  // Reduce each `totalX` array to get quotation total from all fulfillmentGroups
  const totalDiscountsAmount = totalDiscounts.reduce((acc, value) => acc + value, 0);
  const totalShippingAmount = totalShipping.reduce((acc, value) => acc + value, 0);
  const totalSubtotalAmount = totalSubtotal.reduce((acc, value) => acc + value, 0);
  const totalSurchargesAmount = totalSurcharges.reduce((acc, value) => acc + value, 0);
  const totalTaxableAmountAmount = totalTaxableAmount.reduce((acc, value) => acc + value, 0);
  const totalTaxesAmount = totalTaxes.reduce((acc, value) => acc + value, 0);
  const totalTotalAmount = totalTotal.reduce((acc, value) => acc + value, 0);

  // Calculate effective tax rate of combined fulfillmentGroups
  const effectiveTaxRate = totalTaxableAmountAmount > 0 ? totalTaxesAmount / totalTaxableAmountAmount : 0;

  return {
    discountTotal: {
      amount: totalDiscountsAmount,
      currencyCode
    },
    effectiveTaxRate: getRateObjectForRate(effectiveTaxRate),
    fulfillmentTotal: {
      amount: totalShippingAmount,
      currencyCode
    },
    itemTotal: {
      amount: totalSubtotalAmount,
      currencyCode
    },
    surchargeTotal: {
      amount: totalSurchargesAmount,
      currencyCode
    },
    taxableAmount: {
      amount: totalTaxableAmountAmount,
      currencyCode
    },
    taxTotal: {
      amount: totalTaxesAmount,
      currencyCode
    },
    total: {
      amount: totalTotalAmount,
      currencyCode
    }
  };
}
