import getPaginatedResponse from "@reactioncommerce/api-utils/graphql/getPaginatedResponse.js";
import wasFieldRequested from "@reactioncommerce/api-utils/graphql/wasFieldRequested.js";
import xformArrayToConnection from "@reactioncommerce/api-utils/graphql/xformArrayToConnection.js";

/**
 * @name QuotationItem/productTags
 * @method
 * @memberof Catalog/GraphQL
 * @summary Returns the tags for an QuotationItem
 * @param {Object} quotationItem - QuotationItem from parent resolver
 * @param {TagConnectionArgs} connectionArgs - arguments sent by the client {@link ConnectionArgs|See default connection arguments}
 * @param {Object} context - an object containing the per-request state
 * @param {Object} info Info about the GraphQL request
 * @returns {Promise<Object[]>} Promise that resolves with array of Tag objects
 */
export default async function productTags(quotationItem, connectionArgs, context, info) {
  const { productTagIds } = quotationItem;
  if (!productTagIds || productTagIds.length === 0) return xformArrayToConnection(connectionArgs, []);

  const query = await context.queries.tagsByIds(context, productTagIds, connectionArgs);

  return getPaginatedResponse(query, connectionArgs, {
    includeHasNextPage: wasFieldRequested("pageInfo.hasNextPage", info),
    includeHasPreviousPage: wasFieldRequested("pageInfo.hasPreviousPage", info),
    includeTotalCount: wasFieldRequested("totalCount", info)
  });
}
