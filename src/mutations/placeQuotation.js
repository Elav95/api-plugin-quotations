import _ from "lodash";
import SimpleSchema from "simpl-schema";
import Logger from "@reactioncommerce/logger";
import Random from "@reactioncommerce/random";
import ReactionError from "@reactioncommerce/reaction-error";
import getAnonymousAccessToken from "@reactioncommerce/api-utils/getAnonymousAccessToken.js";
import buildQuotationFulfillmentGroupFromInput from "../util/buildQuotationFulfillmentGroupFromInput.js";
import verifyPaymentsMatchQuotationTotal from "../util/verifyPaymentsMatchQuotationTotal.js";
import { Quotation as QuotationSchema, quotationInputSchema, Payment as PaymentSchema, paymentInputSchema } from "../simpleSchemas.js";

const inputSchema = new SimpleSchema({
  "quotation": quotationInputSchema,
  "payments": {
    type: Array,
    optional: true
  },
  "payments.$": paymentInputSchema
});

/**
 * @summary Create all authorized payments for a potential quotation
 * @param {String} [accountId] The ID of the account placing the quotation
 * @param {Object} [billingAddress] Billing address for the quotation as a whole
 * @param {Object} context - The application context
 * @param {String} currencyCode Currency code for interpreting the amount of all payments
 * @param {String} email Email address for the quotation
 * @param {Number} quotationTotal Total due for the quotation
 * @param {Object[]} paymentsInput List of payment inputs
 * @param {Object} [shippingAddress] Shipping address, if relevant, for fraud detection
 * @param {String} shop shop that owns the quotation
 * @returns {Object[]} Array of created payments
 */
async function createPayments({
  accountId,
  billingAddress,
  context,
  currencyCode,
  email,
  quotationTotal,
  paymentsInput,
  shippingAddress,
  shop
}) {
  // Determining which payment methods are enabled for the shop
  const availablePaymentMethods = shop.availablePaymentMethods || [];

  // Verify that total of payment inputs equals total due. We need to be sure
  // to do this before creating any payment authorizations
  verifyPaymentsMatchQuotationTotal(paymentsInput || [], quotationTotal);

  // Create authorized payments for each
  const paymentPromises = (paymentsInput || []).map(async (paymentInput) => {
    const { amount, method: methodName } = paymentInput;

    // Verify that this payment method is enabled for the shop
    if (!availablePaymentMethods.includes(methodName)) {
      throw new ReactionError("payment-failed", `Payment method not enabled for this shop: ${methodName}`);
    }

    // Grab config for this payment method
    let paymentMethodConfig;
    try {
      paymentMethodConfig = context.queries.getPaymentMethodConfigByName(methodName);
    } catch (error) {
      Logger.error(error);
      throw new ReactionError("payment-failed", `Invalid payment method name: ${methodName}`);
    }

    // Authorize this payment
    const payment = await paymentMethodConfig.functions.createAuthorizedPayment(context, {
      accountId, // optional
      amount,
      billingAddress: paymentInput.billingAddress || billingAddress,
      currencyCode,
      email,
      shippingAddress, // optional, for fraud detection, the first shipping address if shipping to multiple
      shopId: shop._id,
      paymentData: {
        ...(paymentInput.data || {})
      } // optional, object, blackbox
    });

    const paymentWithCurrency = {
      ...payment,
      // This is from previous support for exchange rates, which was removed in v3.0.0
      currency: { exchangeRate: 1, userCurrency: currencyCode },
      currencyCode
    };

    PaymentSchema.validate(paymentWithCurrency);

    return paymentWithCurrency;
  });

  let payments;
  try {
    payments = await Promise.all(paymentPromises);
    payments = payments.filter((payment) => !!payment); // remove nulls
  } catch (error) {
    Logger.error("createQuotation: error creating payments", error.message);
    throw new ReactionError("payment-failed", `There was a problem authorizing this payment: ${error.message}`);
  }

  return payments;
}

/**
 * @method placeQuotation
 * @summary Places an quotation, authorizing all payments first
 * @param {Object} context - an object containing the per-request state
 * @param {Object} input - Necessary input. See SimpleSchema
 * @returns {Promise<Object>} Object with `quotation` property containing the created quotation
 */
export default async function placeQuotation(context, input) {
  const cleanedInput = inputSchema.clean(input); // add default values and such
  inputSchema.validate(cleanedInput);

  const { quotation: quotationInput, payments: paymentsInput } = cleanedInput;
  const {
    billingAddress,
    cartId,
    currencyCode,
    customFields: customFieldsFromClient,
    email,
    fulfillmentGroups,
    quotationerPreferredLanguage,
    shopId
  } = quotationInput;
  const { accountId, appEvents, collections, getFunctionsOfType, userId } = context;
  const { Quotations, Cart } = collections;

  const shop = await context.queries.shopById(context, shopId);
  if (!shop) throw new ReactionError("not-found", "Shop not found");

  if (!userId && !shop.allowGuestCheckout) {
    throw new ReactionError("access-denied", "Guest checkout not allowed");
  }

  let cart;
  if (cartId) {
    cart = await Cart.findOne({ _id: cartId });
    if (!cart) {
      throw new ReactionError("not-found", "Cart not found while trying to place quotation");
    }
  }


  // We are mixing concerns a bit here for now. This is for backwards compatibility with current
  // discount codes feature. We are planning to revamp discounts soon, but until then, we'll look up
  // any discounts on the related cart here.
  let discounts = [];
  let discountTotal = 0;
  if (cart) {
    const discountsResult = await context.queries.getDiscountsTotalForCart(context, cart);
    ({ discounts } = discountsResult);
    discountTotal = discountsResult.total;
  }

  // Create array for surcharges to apply to quotation, if applicable
  // Array is populated inside `fulfillmentGroups.map()`
  const quotationSurcharges = [];

  // Create quotationId
  const quotationId = Random.id();


  // Add more props to each fulfillment group, and validate/build the items in each group
  let quotationTotal = 0;
  let shippingAddressForPayments = null;
  const finalFulfillmentGroups = await Promise.all(fulfillmentGroups.map(async (inputGroup) => {
    const { group, groupSurcharges } = await buildQuotationFulfillmentGroupFromInput(context, {
      accountId,
      billingAddress,
      cartId,
      currencyCode,
      discountTotal,
      inputGroup,
      quotationId
    });

    // We save off the first shipping address found, for passing to payment services. They use this
    // for fraud detection.
    if (group.address && !shippingAddressForPayments) shippingAddressForPayments = group.address;

    // Push all group surcharges to overall quotation surcharge array.
    // Currently, we do not save surcharges per group
    quotationSurcharges.push(...groupSurcharges);

    // Add the group total to the quotation total
    quotationTotal += group.invoice.total;

    return group;
  }));

  const payments = await createPayments({
    accountId,
    billingAddress,
    context,
    currencyCode,
    email,
    quotationTotal,
    paymentsInput,
    shippingAddress: shippingAddressForPayments,
    shop
  });

  // Create anonymousAccessToken if no account ID
  const fullToken = accountId ? null : getAnonymousAccessToken();

  const now = new Date();

  const quotation = {
    _id: quotationId,
    accountId,
    billingAddress,
    cartId,
    createdAt: now,
    currencyCode,
    discounts,
    email,
    quotationerPreferredLanguage: quotationerPreferredLanguage || null,
    payments,
    shipping: finalFulfillmentGroups,
    shopId,
    surcharges: quotationSurcharges,
    totalItemQuantity: finalFulfillmentGroups.reduce((sum, group) => sum + group.totalItemQuantity, 0),
    updatedAt: now,
    workflow: {
      status: "new",
      workflow: ["new"]
    }
  };

  if (fullToken) {
    const dbToken = { ...fullToken };
    // don't store the raw token in db, only the hash
    delete dbToken.token;
    quotation.anonymousAccessTokens = [dbToken];
  }

  let referenceId;
  const createReferenceIdFunctions = getFunctionsOfType("createQuotationReferenceId");
  if (!createReferenceIdFunctions || createReferenceIdFunctions.length === 0) {
    // if the cart has a reference Id, and no custom function is created use that
    if (_.get(cart, "referenceId")) { // we want the else to fallthrough if no cart to keep the if/else logic simple
      ({ referenceId } = cart);
    } else {
      referenceId = Random.id();
    }
  } else {
    referenceId = await createReferenceIdFunctions[0](context, quotation, cart);
    if (typeof referenceId !== "string") {
      throw new ReactionError("invalid-parameter", "createQuotationReferenceId function returned a non-string value");
    }
    if (createReferenceIdFunctions.length > 1) {
      Logger.warn("More than one createQuotationReferenceId function defined. Using first one defined");
    }
  }

  quotation.referenceId = referenceId;


  // Apply custom quotation data transformations from plugins
  const transformCustomQuotationFieldsFuncs = getFunctionsOfType("transformCustomQuotationFields");
  if (transformCustomQuotationFieldsFuncs.length > 0) {
    let customFields = { ...(customFieldsFromClient || {}) };
    // We need to run each of these functions in a series, rather than in parallel, because
    // each function expects to get the result of the previous. It is recommended to disable `no-await-in-loop`
    // eslint rules when the output of one iteration might be used as input in another iteration, such as this case here.
    // See https://eslint.org/docs/rules/no-await-in-loop#when-not-to-use-it
    for (const transformCustomQuotationFieldsFunc of transformCustomQuotationFieldsFuncs) {
      customFields = await transformCustomQuotationFieldsFunc({ context, customFields, quotation }); // eslint-disable-line no-await-in-loop
    }
    quotation.customFields = customFields;
  } else {
    quotation.customFields = customFieldsFromClient;
  }

  // Validate and save
  QuotationSchema.validate(quotation);
  await Quotations.insertOne(quotation);

  await appEvents.emit("afterQuotationCreate", { createdBy: userId, quotation });

  return {
    quotations: [quotation],
    // GraphQL response gets the raw token
    token: fullToken && fullToken.token
  };
}
