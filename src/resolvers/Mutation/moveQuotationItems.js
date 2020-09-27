import {
  decodeQuotationFulfillmentGroupOpaqueId,
  decodeQuotationItemOpaqueId,
  decodeQuotationOpaqueId
} from "../../xforms/id.js";

/**
 * @name Mutation/moveQuotationItems
 * @method
 * @memberof Payments/GraphQL
 * @summary resolver for the moveQuotationItems GraphQL mutation
 * @param {Object} parentResult - unused
 * @param {Object} args.input - an object of all mutation arguments that were sent by the client
 * @param {String} args.input.fromFulfillmentGroupId - The ID of the quotation fulfillment group from which all the items
 *   are to be moved.
 * @param {String[]} args.input.itemIds - The list of item IDs to move. The full quantity must be moved.
 * @param {String} args.input.quotationId - The quotation ID
 * @param {String} args.input.toFulfillmentGroupId - The ID of the quotation fulfillment group to which all the items
 *   are to be moved.
 * @param {String} [args.input.clientMutationId] - An optional string identifying the mutation call
 * @param {Object} context - an object containing the per-request state
 * @returns {Promise<Object>} MoveQuotationItemsPayload
 */
export default async function moveQuotationItems(parentResult, { input }, context) {
  const {
    clientMutationId = null,
    fromFulfillmentGroupId,
    itemIds,
    quotationId,
    toFulfillmentGroupId
  } = input;

  const { quotation } = await context.mutations.moveQuotationItems(context, {
    fromFulfillmentGroupId: decodeQuotationFulfillmentGroupOpaqueId(fromFulfillmentGroupId),
    itemIds: itemIds.map(decodeQuotationItemOpaqueId),
    quotationId: decodeQuotationOpaqueId(quotationId),
    toFulfillmentGroupId: decodeQuotationFulfillmentGroupOpaqueId(toFulfillmentGroupId)
  });

  return {
    clientMutationId,
    quotation
  };
}
