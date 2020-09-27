import {
  decodeFulfillmentMethodOpaqueId,
  decodeQuotationItemOpaqueId,
  decodeQuotationItemsOpaqueIds,
  decodeQuotationOpaqueId,
  decodeShopOpaqueId
} from "../../xforms/id.js";

/**
 * @name Mutation/addQuotationFulfillmentGroup
 * @method
 * @memberof Payments/GraphQL
 * @summary resolver for the addQuotationFulfillmentGroup GraphQL mutation
 * @param {Object} parentResult - unused
 * @param {Object} args.input - an object of all mutation arguments that were sent by the client
 * @param {Object} args.input.fulfillmentGroup The quotation fulfillment group input, used to build the new group
 * @param {String[]} [args.input.moveItemIds] Optional list of quotation item IDs that should be moved from an
 *   existing group to the new group.
 * @param {String} args.input.quotationId Quotation ID
 * @param {String} [args.input.clientMutationId] - An optional string identifying the mutation call
 * @param {Object} context - an object containing the per-request state
 * @returns {Promise<Object>} AddQuotationFulfillmentGroupPayload
 */
export default async function addQuotationFulfillmentGroup(parentResult, { input }, context) {
  const {
    clientMutationId = null,
    fulfillmentGroup,
    moveItemIds,
    quotationId
  } = input;

  const { newFulfillmentGroupId, quotation } = await context.mutations.addQuotationFulfillmentGroup(context, {
    fulfillmentGroup: {
      ...fulfillmentGroup,
      items: fulfillmentGroup.items ? decodeQuotationItemsOpaqueIds(fulfillmentGroup.items) : null,
      selectedFulfillmentMethodId: decodeFulfillmentMethodOpaqueId(fulfillmentGroup.selectedFulfillmentMethodId),
      shopId: decodeShopOpaqueId(fulfillmentGroup.shopId)
    },
    moveItemIds: moveItemIds && moveItemIds.map(decodeQuotationItemOpaqueId),
    quotationId: decodeQuotationOpaqueId(quotationId)
  });

  return {
    clientMutationId,
    newFulfillmentGroupId,
    quotation
  };
}
