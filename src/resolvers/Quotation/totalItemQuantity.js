/**
 * @name Quotation/totalItemQuantity
 * @method
 * @memberof Quotation/GraphQL
 * @summary Calculates the total quantity of items in the quotation and returns a number
 * @param {Object} quotation - Result of the parent resolver, which is a Quotation object in GraphQL schema format
 * @param {Object} connectionArgs - Connection args. (not used for this resolver)
 * @param {Object} context - An object containing the per-request state
 * @returns {Promise<Number>} A promise that resolves to the number of the total item quantity
 */
export default async function totalItemQuantity(quotation) {
  if (!Array.isArray(quotation.shipping)) return 0;

  return quotation.shipping.reduce((sum, group) => sum + group.totalItemQuantity, 0);
}
