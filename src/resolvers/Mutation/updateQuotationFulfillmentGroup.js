import { decodeQuotationOpaqueId, decodeQuotationFulfillmentGroupOpaqueId } from "../../xforms/id.js";

/**
 * @name Mutation/updateQuotationFulfillmentGroup
 * @method
 * @memberof Payments/GraphQL
 * @summary resolver for the updateQuotationFulfillmentGroup GraphQL mutation
 * @param {Object} parentResult - unused
 * @param {Object} args.input - an object of all mutation arguments that were sent by the client
 * @param {String} args.input.quotationFulfillmentGroupId - The quotation fulfillment group ID
 * @param {String} args.input.quotationId - The quotation ID
 * @param {String} [args.input.status] - Set this as the current quotation fulfillment group status
 * @param {String} [args.input.tracking] - Set this as the current quotation fulfillment group shipment tracking reference
 * @param {String} [args.input.trackingUrl] - Set this as the current quotation fulfillment group shipment tracking URL
 * @param {String} [args.input.clientMutationId] - An optional string identifying the mutation call
 * @param {Object} context - an object containing the per-request state
 * @returns {Promise<Object>} UpdateQuotationFulfillmentGroupPayload
 */
export default async function updateQuotationFulfillmentGroup(parentResult, { input }, context) {
  const {
    clientMutationId = null,
    quotationId,
    quotationFulfillmentGroupId,
    status,
    tracking,
    trackingUrl
  } = input;

  const { quotation } = await context.mutations.updateQuotationFulfillmentGroup(context, {
    quotationId: decodeQuotationOpaqueId(quotationId),
    quotationFulfillmentGroupId: decodeQuotationFulfillmentGroupOpaqueId(quotationFulfillmentGroupId),
    status,
    tracking,
    trackingUrl
  });

  return {
    clientMutationId,
    quotation
  };
}
