import {
  decodeCartOpaqueId,
  decodeFulfillmentMethodOpaqueId,
  decodeQuotationItemsOpaqueIds,
  decodeShopOpaqueId
} from "../../xforms/id.js";

/**
 * @name Mutation/placeQuotation
 * @method
 * @memberof Payments/GraphQL
 * @summary resolver for the placeQuotation GraphQL mutation
 * @param {Object} parentResult - unused
 * @param {Object} args.input - an object of all mutation arguments that were sent by the client
 * @param {Object} args.input.quotation - The quotation input
 * @param {Object[]} args.input.payments - Payment info
 * @param {String} [args.input.clientMutationId] - An optional string identifying the mutation call
 * @param {Object} context - an object containing the per-request state
 * @returns {Promise<Object>} PlaceQuotationPayload
 */
export default async function placeQuotation(parentResult, { input }, context) {
  const { clientMutationId = null, quotation, payments } = input;
  const { cartId: opaqueCartId, fulfillmentGroups, shopId: opaqueShopId } = quotation;

  const cartId = opaqueCartId ? decodeCartOpaqueId(opaqueCartId) : null;
  const shopId = decodeShopOpaqueId(opaqueShopId);

  const transformedFulfillmentGroups = fulfillmentGroups.map((group) => ({
    ...group,
    items: decodeQuotationItemsOpaqueIds(group.items),
    selectedFulfillmentMethodId: decodeFulfillmentMethodOpaqueId(group.selectedFulfillmentMethodId),
    shopId: decodeShopOpaqueId(group.shopId)
  }));

  const { quotations, token } = await context.mutations.placeQuotation(context, {
    quotation: {
      ...quotation,
      cartId,
      fulfillmentGroups: transformedFulfillmentGroups,
      shopId
    },
    payments
  });

  return {
    clientMutationId,
    quotations,
    token
  };
}
