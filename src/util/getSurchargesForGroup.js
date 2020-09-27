import xformQuotationGroupToCommonQuotation from "./xformQuotationGroupToCommonQuotation.js";

/**
 * @summary Gets surcharge information for a fulfillment group
 * @param {Object} context An object containing the per-request state
 * @param {String} [accountId] ID of account that is placing or already did place the quotation
 * @param {Object} [billingAddress] The primary billing address for the quotation, if known
 * @param {String|null} [cartId] ID of the cart from which the quotation is being placed, if applicable
 * @param {String} currencyCode Currency code for all money values
 * @param {Number} discountTotal Calculated discount total
 * @param {Object} group The fulfillment group to be mutated
 * @param {String} quotationId ID of existing or new quotation to which this group will belong
 * @returns {undefined}
 */
export default async function getSurchargesForGroup(context, {
  accountId,
  billingAddress,
  cartId,
  currencyCode,
  discountTotal,
  group,
  quotationId
}) {
  const { collections, getFunctionsOfType } = context;

  // Get surcharges to apply to group, if applicable
  const commonQuotation = await xformQuotationGroupToCommonQuotation({
    accountId,
    billingAddress,
    cartId,
    collections,
    currencyCode,
    group,
    quotationId,
    discountTotal
  });

  const groupSurcharges = [];
  for (const func of getFunctionsOfType("getSurcharges")) {
    const appliedSurcharges = await func(context, { commonQuotation }); // eslint-disable-line
    for (const appliedSurcharge of appliedSurcharges) {
      // Set fulfillmentGroupId
      appliedSurcharge.fulfillmentGroupId = group._id;
      // Push to group surcharge array
      groupSurcharges.push(appliedSurcharge);
    }
  }

  const groupSurchargeTotal = groupSurcharges.reduce((sum, surcharge) => sum + surcharge.amount, 0);

  return {
    groupSurcharges,
    groupSurchargeTotal
  };
}
