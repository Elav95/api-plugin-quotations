import ReactionError from "@reactioncommerce/reaction-error";

/**
 * @name quotationsByAccountId
 * @method
 * @memberof Quotation/NoMeteorQueries
 * @summary Query the Quotations collection for quotations made by the provided accountId and (optionally) shopIds
 * @param {Object} context - an object containing the per-request state
 * @param {Object} params - request parameters
 * @param {String} params.accountId - Account ID to search quotations for
 * @param {String} params.quotationStatus - Workflow status to limit search results
 * @param {String} params.shopIds - Shop IDs for the shops that owns the quotations
 * @returns {Promise<Object>|undefined} - An Array of Quotation documents, if found
 */
export default async function quotationsByAccountId(context, { accountId, quotationStatus, shopIds } = {}) {
  const { collections } = context;
  const { Quotations } = collections;

  if (!accountId) throw new ReactionError("invalid-param", "You must provide accountId arguments");

  // Validate user has permission to view quotations for all shopIds
  if (!shopIds) throw new ReactionError("invalid-param", "You must provide ShopId(s)");
  for (const shopId of shopIds) {
    await context.validatePermissions("reaction:legacy:quotations", "read", { shopId, owner: accountId }); // eslint-disable-line no-await-in-loop
  }

  let query = {
    accountId,
    shopId: { $in: shopIds }
  };

  // If quotationStatus array is provided, only return quotations with statuses in Array
  // Otherwise, return all quotations
  if (Array.isArray(quotationStatus) && quotationStatus.length > 0) {
    query = {
      "workflow.status": { $in: quotationStatus },
      ...query
    };
  }

  return Quotations.find(query);
}
