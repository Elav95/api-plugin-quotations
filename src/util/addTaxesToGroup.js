import xformQuotationGroupToCommonQuotation from "./xformQuotationGroupToCommonQuotation.js";

/**
 * @summary Adds taxes to a fulfillment group
 * @param {Object} context An object containing the per-request state
 * @param {String} [accountId] ID of account that is placing or already did place the quotation
 * @param {Object} [billingAddress] The primary billing address for the quotation, if known
 * @param {String|null} [cartId] ID of the cart from which the quotation is being placed, if applicable
 * @param {String} currencyCode Currency code for all money values
 * @param {Number} discountTotal Calculated discount total
 * @param {Object} group The fulfillment group to be mutated
 * @param {String} quotationId ID of existing or new quotation to which this group will belong
 * @param {Object} surcharges Surcharges object so it can be passed along
 * @returns {Object} An object with `taxTotal` and `taxableAmount` numeric properties
 */
export default async function addTaxesToGroup(context, {
  accountId,
  billingAddress,
  cartId,
  currencyCode,
  discountTotal,
  group,
  quotationId,
  surcharges
}) {
  const { collections, mutations } = context;

  const commonQuotation = await xformQuotationGroupToCommonQuotation({
    accountId,
    billingAddress,
    cartId,
    collections,
    currencyCode,
    group,
    quotationId,
    discountTotal,
    surcharges
  });

  // A taxes plugin is expected to add a mutation named `setTaxesOnQuotationFulfillmentGroup`.
  // If this isn't done, assume 0 tax.
  if (typeof mutations.setTaxesOnQuotationFulfillmentGroup !== "function") {
    return { taxTotal: 0, taxableAmount: 0 };
  }

  // This will mutate `group` to add whatever tax fields the `taxes` plugin has added to the schemas.
  return mutations.setTaxesOnQuotationFulfillmentGroup(context, { group, commonQuotation });
}
