import getPaginatedResponse from "@reactioncommerce/api-utils/graphql/getPaginatedResponse.js";
import wasFieldRequested from "@reactioncommerce/api-utils/graphql/wasFieldRequested.js";
import { decodeAccountOpaqueId, decodeShopOpaqueId } from "../../xforms/id.js";

/**
 * @name Query/quotationsByAccountId
 * @method
 * @memberof Quotation/GraphQL
 * @summary Get an quotation by its reference ID
 * @param {Object} parentResult - unused
 * @param {ConnectionArgs} args - An object of all arguments that were sent by the client
 * @param {String} args.accountId - accountId of owner of the quotations
 * @param {String} args.quotationStatus - workflow status to limit search results
 * @param {String} args.shopIds - shop IDs to check for quotations from
 * @param {Object} context - An object containing the per-request state
 * @param {Object} info Info about the GraphQL request
 * @returns {Promise<Object>|undefined} An Quotation object
 */
export default async function quotationsByAccountId(parentResult, args, context, info) {
  const { accountId, quotationStatus, shopIds: opaqueShopIds, ...connectionArgs } = args;

  const shopIds = opaqueShopIds && opaqueShopIds.map(decodeShopOpaqueId);

  const query = await context.queries.quotationsByAccountId(context, {
    accountId: decodeAccountOpaqueId(accountId),
    quotationStatus,
    shopIds
  });

  return getPaginatedResponse(query, connectionArgs, {
    includeHasNextPage: wasFieldRequested("pageInfo.hasNextPage", info),
    includeHasPreviousPage: wasFieldRequested("pageInfo.hasPreviousPage", info),
    includeTotalCount: wasFieldRequested("totalCount", info)
  });
}
