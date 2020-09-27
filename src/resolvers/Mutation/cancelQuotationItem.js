import { decodeQuotationItemOpaqueId, decodeQuotationOpaqueId } from "../../xforms/id.js";

/**
 * @name Mutation/cancelQuotationItem
 * @method
 * @memberof Payments/GraphQL
 * @summary resolver for the cancelQuotationItem GraphQL mutation
 * @param {Object} parentResult - unused
 * @param {Object} args.input - an object of all mutation arguments that were sent by the client
 * @param {String} args.input.quotationId - The quotation ID
 * @param {String} args.input.itemId - The ID of the item to cancel
 * @param {Number} args.input.cancelQuantity - Quantity to cancel. Must be equal to or less than the item quantity.
 * @param {String} [args.input.reason] - Optional free text reason for cancel
 * @param {String} [args.input.clientMutationId] - An optional string identifying the mutation call
 * @param {Object} context - an object containing the per-request state
 * @returns {Promise<Object>} CancelQuotationItemPayload
 */
export default async function cancelQuotationItem(parentResult, { input }, context) {
  const {
    clientMutationId = null,
    cancelQuantity,
    itemId,
    quotationId,
    reason
  } = input;

  const { quotation } = await context.mutations.cancelQuotationItem(context, {
    cancelQuantity,
    itemId: decodeQuotationItemOpaqueId(itemId),
    quotationId: decodeQuotationOpaqueId(quotationId),
    reason
  });

  return {
    clientMutationId,
    quotation
  };
}
