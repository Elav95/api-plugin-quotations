/**
 * @summary Transform a single quotation payment
 * @param {Object} payment A payment object
 * @returns {Object} Transformed payment
 */
function xformQuotationPayment(payment) {
  const {
    _id,
    address,
    amount,
    captureErrorMessage,
    cardBrand,
    createdAt,
    currencyCode,
    data,
    displayName,
    mode,
    name: methodName,
    processor,
    riskLevel,
    status,
    transactionId
  } = payment;

  return {
    _id,
    amount: {
      amount,
      currencyCode
    },
    billingAddress: address,
    captureErrorMessage,
    cardBrand,
    createdAt,
    currencyCode,
    data,
    displayName,
    isAuthorizationCanceled: (mode === "cancel"),
    isCaptured: (mode === "captured"),
    method: {
      displayName,
      name: methodName
    },
    mode,
    processor,
    riskLevel,
    status,
    transactionId
  };
}

/**
 * @name Quotation/payments
 * @method
 * @memberof Quotation/GraphQL
 * @summary Returns payments applied to an quotation
 * @param {Object} context - an object containing the per-request state
 * @param {Object} quotation quotation object refunds would be applied to
 * @returns {Promise<Object[]>} Promise that resolves with array of payment objects
 */
export default async function payments(context, quotation) {
  if (Array.isArray(quotation.payments)) {
    return quotation.payments.map(async (payment) => {
      const xformPayment = xformQuotationPayment(payment);

      const refunds = await context.queries.refundsByPaymentId(context, {
        quotationId: quotation._id,
        paymentId: payment._id,
        shopId: quotation.shopId,
        token: quotation.token || null
      }, quotation);


      if (Array.isArray(refunds)) {
        xformPayment.refunds = refunds;
      }

      return xformPayment;
    });
  }

  return null;
}
