/**
 * @name Quotation/quotationDisplayStatus
 * @method
 * @memberof Quotation/GraphQL
 * @summary Displays a human readable status of quotation state
 * @param {Object} context An object with request-specific state
 * @param {Object} quotation - Result of the parent resolver, which is a Quotation object in GraphQL schema format
 * @param {String} language Language to filter item content by
 * @returns {String} A string of the quotation status
 */
export default async function quotationDisplayStatus(context, quotation, language) {
  const { Shops } = context.collections;
  const shop = await Shops.findOne({ _id: quotation.shopId });
  const quotationStatusLabels = shop && shop.quotationStatusLabels;
  const { workflow: { status } } = quotation;

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
