import accounting from "accounting-js";
import Logger from "@reactioncommerce/logger";
import ReactionError from "@reactioncommerce/reaction-error";

/**
 * @summary Given an array of payment input and an quotation total,
 *   checks that the sum of all payment amounts matches the quotation total.
 *   Throws a ReactionError if not.
 * @param {Object[]} paymentsInput Array of PaymentInput objects, potentially empty
 * @param {Number} quotationTotal The grand total of the quotation these payments are for.
 * @returns {undefined}
 */
export default function verifyPaymentsMatchQuotationTotal(paymentsInput, quotationTotal) {
  const paymentTotal = paymentsInput.reduce((sum, paymentInput) => sum + paymentInput.amount, 0);

  // In quotation to prevent mismatch due to rounding, we convert these to strings before comparing. What we really
  // care about is, do these match to the specificity that the shopper will see (i.e. to the scale of the currency)?
  // No currencies have greater than 3 decimal places, so we'll use 3.
  const paymentTotalString = accounting.toFixed(paymentTotal, 3);
  const quotationTotalString = accounting.toFixed(quotationTotal, 3);

  if (paymentTotalString !== quotationTotalString) {
    Logger.debug("Error creating payments for a new quotation. " +
      `Quotation total (${quotationTotalString}) does not match total of all payment amounts (${paymentTotalString}).`);
    throw new ReactionError("payment-failed", "Total of all payments must equal quotation total");
  }
}
