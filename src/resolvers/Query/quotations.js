import getPaginatedResponse from "@reactioncommerce/api-utils/graphql/getPaginatedResponse.js";
import wasFieldRequested from "@reactioncommerce/api-utils/graphql/wasFieldRequested.js";
import { decodeShopOpaqueId } from "../../xforms/id.js";

/**
 * @name Query/quotations
 * @method
 * @memberof Quotation/GraphQL
 * @summary Get an quotation by its reference ID
 * @param {Object} parentResult - unused
 * @param {ConnectionArgs} args - An object of all arguments that were sent by the client
 * @param {Object} args.filters - An Object of filters to apply
 * @param {String} args.shopIds - shop IDs to check for quotations from
 * @param {Object} context - An object containing the per-request state
 * @param {Object} info Info about the GraphQL request
 * @returns {Promise<Object>|undefined} An Quotation object
 */
export default async function quotations(parentResult, args, context, info) {
  const { filters, shopIds: opaqueShopIds, ...connectionArgs } = args;

  const shopIds = opaqueShopIds && opaqueShopIds.map(decodeShopOpaqueId);

  const query = await context.queries.quotations(context, {
    filters,
    shopIds
  });

  return getPaginatedResponse(query, connectionArgs, {
    includeHasNextPage: wasFieldRequested("pageInfo.hasNextPage", info),
    includeHasPreviousPage: wasFieldRequested("pageInfo.hasPreviousPage", info),
    includeTotalCount: wasFieldRequested("totalCount", info)
  });
}
