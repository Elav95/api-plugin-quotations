import { decodeQuotationOpaqueId } from "../../xforms/id.js";

/**
 * @name Mutation/updateQuotation
 * @method
 * @memberof Payments/GraphQL
 * @summary resolver for the updateQuotation GraphQL mutation
 * @param {Object} parentResult - unused
 * @param {Object} args.input - an object of all mutation arguments that were sent by the client
 * @param {Object} [args.input.customFields] - Updated custom fields
 * @param {String} [args.input.email] - Set this as the quotation email
 * @param {String} args.input.quotationId - The quotation ID
 * @param {String} [args.input.status] - Set this as the current quotation status
 * @param {String} [args.input.clientMutationId] - An optional string identifying the mutation call
 * @param {Object} context - an object containing the per-request state
 * @returns {Promise<Object>} UpdateQuotationPayload
 */
export default async function updateQuotation(parentResult, { input }, context) {
  const {
    clientMutationId = null,
    customFields,
    email,
    quotationId,
    status
  } = input;

  const { quotation } = await context.mutations.updateQuotation(context, {
    customFields,
    email,
    quotationId: decodeQuotationOpaqueId(quotationId),
    status
  });

  return {
    clientMutationId,
    quotation
  };
}
