import ReactionError from "@reactioncommerce/reaction-error";
import { getQuotationQuery } from "../util/getQuotationQuery.js";

/**
 * @name quotationById
 * @method
 * @memberof Quotation/NoMeteorQueries
 * @summary Query the Quotations collection for an quotation with the provided quotationId
 * @param {Object} context - an object containing the per-request state
 * @param {Object} params - request parameters
 * @param {String} params.quotationId - Quotation ID
 * @param {String} params.shopId - Shop ID for the shop that owns the quotation
 * @param {String} [params.token] - Anonymous quotation token
 * @returns {Promise<Object>|undefined} - An Quotation document, if one is found
 */
export default async function quotationById(context, { quotationId, shopId, token } = {}) {
  if (!quotationId || !shopId) {
    throw new ReactionError("invalid-param", "You must provide quotationId and shopId arguments");
  }

  return getQuotationQuery(context, { _id: quotationId }, shopId, token);
}
