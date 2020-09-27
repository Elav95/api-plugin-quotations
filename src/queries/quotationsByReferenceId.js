import ReactionError from "@reactioncommerce/reaction-error";
import { getQuotationQuery } from "../util/getQuotationQuery.js";

/**
 * @name quotationByReferenceId
 * @method
 * @memberof Quotation/NoMeteorQueries
 * @summary Query the Quotations collection for an quotation with the provided quotation referenceId
 * @param {Object} context - an object containing the per-request state
 * @param {Object} params - request parameters
 * @param {String} params.quotationReferenceId - Quotation reference ID
 * @param {String} params.shopId - Shop ID for the shop that owns the quotation
 * @param {String} [params.token] - Anonymous quotation token
 * @returns {Promise<Object>|undefined} - An Quotation document, if one is found
 */
export default async function quotationByReferenceId(context, { quotationReferenceId, shopId, token } = {}) {
  if (!quotationReferenceId || !shopId) {
    throw new ReactionError("invalid-param", "You must provide quotationReferenceId and shopId arguments");
  }

  return getQuotationQuery(context, { referenceId: quotationReferenceId }, shopId, token);
}
