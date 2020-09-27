import _ from "lodash";
import formatMoney from "@reactioncommerce/api-utils/formatMoney.js";
import xformQuotationItems from "../xforms/xformQuotationItems.js";
import { addAnonymousQuotationToken } from "./anonymousToken.js";

/**
 * @name formatDateForEmail
 * @method
 * @private
 * @summary helper to generate the quotation date as a string for emails
 * @param {Date} date The date to format
 * @returns {String} return date formatted as a MM/DD/YYYY string
 */
function formatDateForEmail(date) {
  const emailDate = new Date(date); // Clone date
  const year = emailDate.getFullYear(); // get year
  const month = emailDate.getMonth() + 1; // get month number + 1 (js has 0 indexed months)
  const day = emailDate.getDate(); // get day number (js has 1 indexed days)

  const paddedMonth = month > 9 ? `${month}` : `0${month}`; // generate padded month if necessary
  const paddedDay = day > 9 ? `${day}` : `0${day}`; // generate padded days if necessary

  return `${paddedMonth}/${paddedDay}/${year}`; // return MM/DD/YYYY formatted string
}

/**
 * @summary Builds data for rendering quotation emails
 * @param {Object} context - App context
 * @param {Object} input - Necessary input
 * @param {Object} input.quotation - The quotation document
 * @returns {Object} Data object to use when rendering email templates
 */
export default async function getDataForQuotationEmailDefault(context, { quotation }) {
  const { collections, getAbsoluteUrl } = context;
  const { Accounts, Shops } = collections;

  // Get Shop information
  const shop = await Shops.findOne({ _id: quotation.shopId });

  // Get Account information
  let account = null;
  if (quotation.accountId) {
    account = await Accounts.findOne({ _id: quotation.accountId });
  }

  // TODO need to make this fully support multiple fulfillment groups. Now it's just collapsing into one
  const amount = quotation.shipping.reduce((sum, group) => sum + group.invoice.total, 0);
  const discounts = quotation.shipping.reduce((sum, group) => sum + group.invoice.discounts, 0);
  const subtotal = quotation.shipping.reduce((sum, group) => sum + group.invoice.subtotal, 0);
  const taxes = quotation.shipping.reduce((sum, group) => sum + group.invoice.taxes, 0);
  const shippingCost = quotation.shipping.reduce((sum, group) => sum + group.invoice.shipping, 0);

  const { address: shippingAddress, shipmentMethod, tracking } = quotation.shipping[0];
  const { carrier } = shipmentMethod;
  const [firstPayment] = (quotation.payments || []);
  const { address: paymentBillingAddress, currency } = firstPayment || {};

  const shippingAddressForEmail = shippingAddress ? {
    address: `${shippingAddress.address1}${shippingAddress.address2 ? ` ${shippingAddress.address2}` : ""}`,
    city: shippingAddress.city,
    fullName: shippingAddress.fullName,
    postal: shippingAddress.postal,
    region: shippingAddress.region
  } : null;

  let billingAddressForEmail = null;
  if (quotation.billingAddress) {
    billingAddressForEmail = {
      address: `${quotation.billingAddress.address1}${quotation.billingAddress.address2 ? ` ${quotation.billingAddress.address2}` : ""}`,
      city: quotation.billingAddress.city,
      fullName: quotation.billingAddress.fullName,
      postal: quotation.billingAddress.postal,
      region: quotation.billingAddress.region
    };
  } else if (paymentBillingAddress) {
    billingAddressForEmail = {
      address: `${paymentBillingAddress.address1}${paymentBillingAddress.address2 ? ` ${paymentBillingAddress.address2}` : ""}`,
      city: paymentBillingAddress.city,
      fullName: paymentBillingAddress.fullName,
      postal: paymentBillingAddress.postal,
      region: paymentBillingAddress.region
    };
  }

  const refunds = [];

  if (Array.isArray(quotation.payments)) {
    const promises = quotation.payments.map(async (payment) => {
      const shopRefunds = await context.queries.getPaymentMethodConfigByName(payment.name).functions.listRefunds(context, payment);
      const shopRefundsWithPaymentId = shopRefunds.map((shopRefund) => ({ ...shopRefund, paymentId: payment._id }));
      refunds.push(...shopRefundsWithPaymentId);
    });
    await Promise.all(promises);
  }

  const refundTotal = refunds.reduce((acc, refund) => acc + refund.amount, 0);

  const userCurrency = (currency && currency.userCurrency) || shop.currency;

  // Get user currency exchange rate at time of transaction
  const userCurrencyExchangeRate = (currency && currency.exchangeRate) || 1;

  // Combine same products into single "product" for display purposes
  const combinedItems = [];

  // Transform all quotation items to add images, etc.
  const adjustedQuotationGroups = await Promise.all(quotation.shipping.map(async (group) => {
    let items = await xformQuotationItems(context, group.items);

    items = items.map((item) => ({
      ...item,
      placeholderImage: getAbsoluteUrl("/resources/placeholder.gif"),
      price: {
        ...item.price,
        // Add displayAmount to match user currency settings
        displayAmount: formatMoney(item.price.amount * userCurrencyExchangeRate, userCurrency)
      },
      subtotal: {
        ...item.subtotal,
        // Add displayAmount to match user currency settings
        displayAmount: formatMoney(item.subtotal.amount * userCurrencyExchangeRate, userCurrency)
      },
      // These next two are for backward compatibility with existing email templates.
      // New templates should use `imageURLs` instead.
      productImage: item.imageURLs && item.imageURLs.large,
      variantImage: item.imageURLs && item.imageURLs.large
    }));

    return { ...group, items };
  }));

  // Loop through all items in the quotation. The items are split into individual items
  const quotationItems = adjustedQuotationGroups.reduce((list, group) => [...list, ...group.items], []);
  for (const quotationItem of quotationItems) {
    // Find an existing item in the combinedItems array
    const foundItem = combinedItems.find((combinedItem) => combinedItem.variantId === quotationItem.variantId);

    // Increment the quantity count for the duplicate product variants
    if (foundItem) {
      foundItem.quantity += quotationItem.quantity;
    } else {
      // Otherwise push the unique item into the combinedItems array
      combinedItems.push(quotationItem);
    }
  }

  const copyrightDate = new Date().getFullYear();

  // storefront URLs are technically optional, and headless is OK.
  // In that case we'll assume the email template does not use nor need
  // the quotationUrl property, so it will be null in the quotation email data object.
  let quotationUrl = _.get(shop, "storefrontUrls.storefrontQuotationUrl", null);
  if (quotationUrl) {
    let token = "";
    quotationUrl = quotationUrl.replace(":quotationId", encodeURIComponent(quotation.referenceId));
    const isAnonymous = !quotation.accountId;
    const wantsToken = quotationUrl.includes(":token");
    if (isAnonymous && wantsToken) {
      token = await addAnonymousQuotationToken(context, quotation._id);
    }
    // Replace :token either with empty string or a toke
    quotationUrl = quotationUrl.replace(":token", encodeURIComponent(token));
  }

  const physicalAddress = (shop.addressBook && shop.addressBook[0]) || null;
  if (physicalAddress) {
    physicalAddress.address = `${physicalAddress.address1}${physicalAddress.address2 ? ` ${physicalAddress.address2}` : ""}`;
  }

  // Merge data into single object to pass to email template
  return {
    account,
    billing: {
      address: billingAddressForEmail,
      payments: (quotation.payments || []).map((payment) => ({
        displayName: payment.displayName,
        displayAmount: formatMoney(payment.amount * userCurrencyExchangeRate, userCurrency)
      })),
      subtotal: formatMoney(subtotal * userCurrencyExchangeRate, userCurrency),
      shipping: formatMoney(shippingCost * userCurrencyExchangeRate, userCurrency),
      taxes: formatMoney(taxes * userCurrencyExchangeRate, userCurrency),
      discounts: formatMoney(discounts * userCurrencyExchangeRate, userCurrency),
      refunds: formatMoney(refundTotal * userCurrencyExchangeRate, userCurrency),
      total: formatMoney(
        (subtotal + shippingCost + taxes - discounts) * userCurrencyExchangeRate,
        userCurrency
      ),
      adjustedTotal: formatMoney(
        (amount - refundTotal) * userCurrencyExchangeRate,
        userCurrency
      )
    },
    combinedItems,
    contactEmail: shop.emails[0].address,
    copyrightDate,
    homepage: _.get(shop, "storefrontUrls.storefrontHomeUrl", null),
    legalName: _.get(shop, "addressBook[0].company"),
    quotation: {
      ...quotation,
      shipping: adjustedQuotationGroups
    },
    quotationDate: formatDateForEmail(quotation.createdAt),
    quotationUrl,
    physicalAddress,
    shipping: {
      address: shippingAddressForEmail,
      carrier,
      tracking
    },
    shop,
    shopName: shop.name,
    socialLinks: {
      display: false
    }
  };
}
