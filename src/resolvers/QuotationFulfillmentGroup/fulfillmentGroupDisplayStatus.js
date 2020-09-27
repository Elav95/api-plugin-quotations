/**
 * @name QuotationFulfillmentGroup/fulfillmentGroupDisplayStatus
 * @method
 * @memberof Quotation/GraphQL
 * @summary Displays a human readable status of quotation fulfillment group state
 * @param {Object} context An object with request-specific state
 * @param {Object} fulfillmentGroup - Result of the parent resolver, which is a Fulfillment Group object in GraphQL schema format
 * @param {String} language Language to filter item content by
 * @returns {String} A string of the quotation status
 */
export default async function fulfillmentGroupDisplayStatus(context, fulfillmentGroup, language) {
  const { Shops } = context.collections;
  const shop = await Shops.findOne({ _id: fulfillmentGroup.shopId });
  const quotationStatusLabels = shop && shop.quotationStatusLabels;
  const { workflow: { status } } = fulfillmentGroup;

  // If translations are available in the `Shops` collection,
  // and are available for this specific quotation status, get translations
  if (quotationStatusLabels && quotationStatusLabels[status]) {
    const quotationStatusLabel = quotationStatusLabels[status];
    const translatedLabel = quotationStatusLabel.find((label) => label.language === language);

    // If translations are available in desired language, return them.
    // Otherwise, return raw status
    return (translatedLabel && translatedLabel.label) || status;
  }

  // If no translations are available in the `Shops` collection, use raw status data
  return status;
}
