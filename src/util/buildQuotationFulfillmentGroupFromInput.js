import Random from "@reactioncommerce/random";
import buildQuotationItem from "./buildQuotationItem.js";
import updateGroupTotals from "./updateGroupTotals.js";

/**
 * @summary Builds an quotation fulfillment group from fulfillment group input.
 * @param {Object} context an object containing the per-request state
 * @param {String} [accountId] ID of account placing the quotation
 * @param {Object[]} [additionalItems] Additional already-created quotation items to push into the group
 *   items array before calculating shipping, tax, surcharges, and totals.
 * @param {Object} [billingAddress] The primary billing address for the quotation, if known
 * @param {String|null} [cartId] ID of the cart from which the quotation is being placed, if applicable
 * @param {String} currencyCode Currency code for all money values
 * @param {Number} discountTotal Calculated discount total
 * @param {Object} inputGroup Quotation fulfillment group input. See schema.
 * @param {String} quotationId ID of existing or new quotation to which this group will belong
 * @returns {Promise<Object>} The fulfillment group
 */
export default async function buildQuotationFulfillmentGroupFromInput(context, {
  accountId,
  additionalItems,
  billingAddress,
  cartId,
  currencyCode,
  discountTotal,
  inputGroup,
  quotationId
}) {
  const { data, items, selectedFulfillmentMethodId, shopId, totalPrice: expectedGroupTotal, type } = inputGroup;

  const group = {
    _id: Random.id(),
    address: data ? data.shippingAddress : null,
    shopId,
    type,
    workflow: { status: "new", workflow: ["new"] }
  };

  // Build the final quotation item objects. As part of this, we look up the variant in the system and make sure that
  // the price is what the caller expects it to be.
  if (items) {
    group.items = await Promise.all(items.map((inputItem) => buildQuotationItem(context, { currencyCode, inputItem })));
  } else {
    group.items = [];
  }

  if (Array.isArray(additionalItems) && additionalItems.length) {
    group.items.push(...additionalItems);
  }

  // Add some more properties for convenience
  group.itemIds = group.items.map((item) => item._id);
  group.totalItemQuantity = group.items.reduce((sum, item) => sum + item.quantity, 0);

  const {
    groupSurcharges,
    groupSurchargeTotal,
    taxableAmount,
    taxTotal
  } = await updateGroupTotals(context, {
    accountId,
    billingAddress,
    cartId,
    currencyCode,
    discountTotal,
    expectedGroupTotal,
    group,
    quotationId,
    selectedFulfillmentMethodId
  });

  return {
    group,
    groupSurcharges,
    groupSurchargeTotal,
    taxableAmount,
    taxTotal
  };
}
