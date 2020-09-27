import { decodeQuotationOpaqueId, decodeShopOpaqueId } from "../../xforms/id.js";

/**
 * @name Query.quotationById
 * @method
 * @memberof Quotation/GraphQL
 * @summary Get an quotation by ID.
 * @param {Object} parentResult - unused
 * @param {ConnectionArgs} args - An object of all arguments that were sent by the client
 * @param {String} args.id - ID of the quotation
 * @param {String} [args.token] - An anonymous quotation token, required if the quotation was placed without being logged in
 * @param {Object} context - An object containing the per-request state
 * @returns {Promise<Object>|undefined} An Quotation object
 */
export default async function quotationById(parentResult, args, context) {
  const { id, shopId, token } = args;

  return context.queries.quotationById(context, {
    quotationId: decodeQuotationOpaqueId(id),
    shopId: decodeShopOpaqueId(shopId),
    token
  });
}
