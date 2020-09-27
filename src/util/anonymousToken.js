import getAnonymousAccessToken from "@reactioncommerce/api-utils/getAnonymousAccessToken.js";

/**
 * Create a new anonymous access token and add it to an quotation
 *
 * @param {Object} context app context
 * @param {String} quotationId quotation id
 *
 * @returns {String} raw token secret
 */
export async function addAnonymousQuotationToken(context, quotationId) {
  const token = getAnonymousAccessToken();
  // We must never store the raw secret in the DB
  // So that even if the DB data is compromised,
  // the raw secrets are not there
  const toStore = { ...token };
  delete toStore.token;
  const update = { $push: { anonymousAccessTokens: toStore } };
  await context.collections.Quotations.updateOne({ _id: quotationId }, update);
  return token.token;
}
