import decodeOpaqueIdForNamespace from "@reactioncommerce/api-utils/decodeOpaqueIdForNamespace.js";
import encodeOpaqueId from "@reactioncommerce/api-utils/encodeOpaqueId.js";

const namespaces = {
  Account: "reaction/account",
  Cart: "reaction/cart",
  FulfillmentMethod: "reaction/fulfillmentMethod",
  Quotation: "reaction/quotation",
  QuotationFulfillmentGroup: "reaction/quotationFulfillmentGroup",
  QuotationItem: "reaction/quotationItem",
  Payment: "reaction/payment",
  Product: "reaction/product",
  Refund: "reaction/refund",
  Shop: "reaction/shop"
};

export const encodeAccountOpaqueId = encodeOpaqueId(namespaces.Account);
export const encodeCartOpaqueId = encodeOpaqueId(namespaces.Cart);
export const encodeQuotationFulfillmentGroupOpaqueId = encodeOpaqueId(namespaces.QuotationFulfillmentGroup);
export const encodeQuotationItemOpaqueId = encodeOpaqueId(namespaces.QuotationItem);
export const encodeQuotationOpaqueId = encodeOpaqueId(namespaces.Quotation);
export const encodePaymentOpaqueId = encodeOpaqueId(namespaces.Payment);
export const encodeProductOpaqueId = encodeOpaqueId(namespaces.Product);
export const encodeRefundOpaqueId = encodeOpaqueId(namespaces.Refund);
export const encodeShopOpaqueId = encodeOpaqueId(namespaces.Shop);

export const decodeAccountOpaqueId = decodeOpaqueIdForNamespace(namespaces.Account);
export const decodeCartOpaqueId = decodeOpaqueIdForNamespace(namespaces.Cart);
export const decodeFulfillmentMethodOpaqueId = decodeOpaqueIdForNamespace(namespaces.FulfillmentMethod);
export const decodeQuotationFulfillmentGroupOpaqueId = decodeOpaqueIdForNamespace(namespaces.QuotationFulfillmentGroup);
export const decodeQuotationItemOpaqueId = decodeOpaqueIdForNamespace(namespaces.QuotationItem);
export const decodeQuotationOpaqueId = decodeOpaqueIdForNamespace(namespaces.Quotation);
export const decodePaymentOpaqueId = decodeOpaqueIdForNamespace(namespaces.Payment);
export const decodeProductOpaqueId = decodeOpaqueIdForNamespace(namespaces.Product);
export const decodeRefundOpaqueId = decodeOpaqueIdForNamespace(namespaces.Refund);
export const decodeShopOpaqueId = decodeOpaqueIdForNamespace(namespaces.Shop);

/**
 * @param {Object[]} items Array of QuotationItemInput
 * @returns {Object[]} Same array with all IDs transformed to internal
 */
export function decodeQuotationItemsOpaqueIds(items) {
  return items.map((item) => ({
    ...item,
    productConfiguration: {
      productId: decodeProductOpaqueId(item.productConfiguration.productId),
      productVariantId: decodeProductOpaqueId(item.productConfiguration.productVariantId)
    }
  }));
}
