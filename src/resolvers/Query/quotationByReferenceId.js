import { decodeShopOpaqueId } from "../../xforms/id.js";

/**
 * @name Query.quotationByReferenceId
 * @method
 * @memberof Quotation/GraphQL
 * @summary Get an quotation by its reference ID
 * @param {Object} parentResult - unused
 * @param {ConnectionArgs} args - An object of all arguments that were sent by the client
 * @param {String} args.id - reference ID of the quotation
 * @param {String} args.shopId - shop ID of the quotation
 * @param {String} [args.token] - An anonymous quotation token, required if the quotation was placed without being logged in
 * @param {Object} context - An object containing the per-request state
 * @returns {Promise<Object>|undefined} An Quotation object
 */
export default async function quotationByReferenceId(parentResult, args, context) {
  const { id, shopId, token } = args;

  return context.queries.quotationByReferenceId(context, {
    quotationReferenceId: id,
    shopId: decodeShopOpaqueId(shopId),
    token
  });
}
