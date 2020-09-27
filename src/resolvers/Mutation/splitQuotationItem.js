import {
  decodeQuotationItemOpaqueId,
  decodeQuotationOpaqueId
} from "../../xforms/id.js";

/**
 * @name Mutation/splitQuotationItem
 * @method
 * @memberof Payments/GraphQL
 * @summary resolver for the splitQuotationItem GraphQL mutation
 * @param {Object} parentResult - unused
 * @param {Object} args.input - an object of all mutation arguments that were sent by the client
 * @param {String} args.input.itemId - The ID of the item to split
 * @param {Number} args.input.newItemQuantity - The quantity that will be transferred to a new
 *   quotation item on the same fulfillment group.
 * @param {String} args.input.quotationId - The quotation ID
 * @param {String} [args.input.clientMutationId] - An optional string identifying the mutation call
 * @param {Object} context - an object containing the per-request state
 * @returns {Promise<Object>} SplitQuotationItemPayload
 */
export default async function splitQuotationItem(parentResult, { input }, context) {
  const {
    clientMutationId = null,
    newItemQuantity,
    itemId,
    quotationId
  } = input;

  const { newItemId, quotation } = await context.mutations.splitQuotationItem(context, {
    newItemQuantity,
    itemId: decodeQuotationItemOpaqueId(itemId),
    quotationId: decodeQuotationOpaqueId(quotationId)
  });

  return {
    clientMutationId,
    newItemId,
    quotation
  };
}
