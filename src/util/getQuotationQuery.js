import hashToken from "@reactioncommerce/api-utils/hashToken.js";
import ReactionError from "@reactioncommerce/reaction-error";

/**
 * @name getQuotationQuery
 * @method
 * @memberof Quotation/helpers
 * @summary Queries for an quotation and returns it if user has correct permissions
 * @param {Object} context An object containing the per-request state
 * @param {Object} selector Quotation ID or Reference ID to query
 * @param {String} shopId Shop ID of the quotation
 * @param {String} token An anonymous quotation token, required if the quotation was placed without being logged in
 * @returns {Object} An quotation object
 */
export async function getQuotationQuery(context, selector, shopId, token) {
  const { collections } = context;

  const quotation = await collections.Quotations.findOne(selector);

  if (!quotation) {
    throw new ReactionError("not-found", "Quotation not found");
  }

  // If you have the hashed token, you don't need to pass a permission check
  if (token && quotation.anonymousAccessTokens.some((accessToken) => accessToken.hashedToken === hashToken(token))) {
    return quotation;
  }

  // if you don't have the hashed token,
  // you must either have `reaction:legacy:quotations/read` permissions,
  // or this must be your own quotation
  await context.validatePermissions(
    "reaction:legacy:quotations",
    "read",
    {
      shopId,
      owner: quotation.accountId
    }
  );

  return quotation;
}
