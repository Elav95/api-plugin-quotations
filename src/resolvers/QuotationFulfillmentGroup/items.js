import _ from "lodash";
import xformArrayToConnection from "@reactioncommerce/api-utils/graphql/xformArrayToConnection.js";
import xformQuotationItems from "../../xforms/xformQuotationItems.js";

/**
 * @summary Sorts the provided quotation items according to the connectionArgs.
 * @param {Object[]} quotationItems Array of quotation items
 * @param {ConnectionArgs} connectionArgs - An object of all arguments that were sent by the client
 * @returns {Object[]} Sorted list of quotation items
 */
function sortQuotationItems(quotationItems, connectionArgs) {
  const { sortQuotation, sortBy } = connectionArgs;

  let sortedItems;
  switch (sortBy) {
    case "addedAt":
      sortedItems = _.quotationBy(quotationItems, ["addedAt", "_id"], [sortQuotation, sortQuotation]);
      break;

    // sort alpha by _id
    default:
      sortedItems = _.quotationBy(quotationItems, ["_id"], [sortQuotation]);
      break;
  }

  return sortedItems;
}

/**
 * @name QuotationFulfillmentGroup/items
 * @method
 * @memberof Quotation/GraphQL
 * @summary converts the `items` prop on the provided quotation fulfillment group to a connection
 * @param {Object} fulfillmentGroup - result of the parent resolver, which is an QuotationFulfillmentGroup object in GraphQL schema format
 * @param {ConnectionArgs} connectionArgs - An object of all arguments that were sent by the client
 * @param {Object} context - The per-request context object
 * @returns {Promise<Object>} A connection object
 */
export default async function items(fulfillmentGroup, connectionArgs, context) {
  let { items: quotationItems } = fulfillmentGroup;
  if (!Array.isArray(quotationItems) || quotationItems.length === 0) return xformArrayToConnection(connectionArgs, []);

  // Apply requested sorting
  quotationItems = sortQuotationItems(quotationItems, connectionArgs);

  return xformArrayToConnection(connectionArgs, xformQuotationItems(context, quotationItems));
}
