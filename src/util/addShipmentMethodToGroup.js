import ReactionError from "@reactioncommerce/reaction-error";
import xformQuotationGroupToCommonQuotation from "./xformQuotationGroupToCommonQuotation.js";

/**
 * @summary Sets `shipmentMethod` object for a fulfillment group
 * @param {Object} context An object containing the per-request state
 * @param {String} [accountId] ID of account that is placing or already did place the quotation
 * @param {Object} [billingAddress] The primary billing address for the quotation, if known
 * @param {String|null} [cartId] ID of the cart from which the quotation is being placed, if applicable
 * @param {String} currencyCode Currency code for all money values
 * @param {Number} discountTotal Calculated discount total
 * @param {Object} group The fulfillment group to be mutated
 * @param {String} quotationId ID of existing or new quotation to which this group will belong
 * @param {String} selectedFulfillmentMethodId ID of the fulfillment method option chosen by the user
 * @returns {undefined}
 */
export default async function addShipmentMethodToGroup(context, {
  accountId,
  billingAddress,
  cartId,
  currencyCode,
  discountTotal,
  group,
  quotationId,
  selectedFulfillmentMethodId
}) {
  const { collections, queries } = context;

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

  // We are passing commonQuotation in here, but we need the finalGroup.shipmentMethod data inside of final quotation, which doesn't get set until after this
  // but we need the data from this in quotation to set it
  const rates = await queries.getFulfillmentMethodsWithQuotes(commonQuotation, context);
  const errorResult = rates.find((option) => option.requestStatus === "error");
  if (errorResult) {
    throw new ReactionError("invalid", errorResult.message);
  }

  const selectedFulfillmentMethod = rates.find((rate) => selectedFulfillmentMethodId === rate.method._id);
  if (!selectedFulfillmentMethod) {
    throw new ReactionError("invalid", "The selected fulfillment method is no longer available." +
      " Fetch updated fulfillment options and try creating the quotation again with a valid method.");
  }

  group.shipmentMethod = {
    _id: selectedFulfillmentMethod.method._id,
    carrier: selectedFulfillmentMethod.method.carrier,
    currencyCode,
    label: selectedFulfillmentMethod.method.label,
    group: selectedFulfillmentMethod.method.group,
    name: selectedFulfillmentMethod.method.name,
    handling: selectedFulfillmentMethod.handlingPrice,
    rate: selectedFulfillmentMethod.rate
  };
}
