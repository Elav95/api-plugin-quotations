import SimpleSchema from "simpl-schema";
import ReactionError from "@reactioncommerce/reaction-error";
import { Quotation as QuotationSchema } from "../simpleSchemas.js";

const inputSchema = new SimpleSchema({
  customFields: {
    type: Object,
    blackbox: true,
    optional: true
  },
  email: {
    type: String,
    optional: true
  },
  quotationId: String,
  status: {
    type: String,
    optional: true
  }
});

/**
 * @method updateQuotation
 * @summary Use this mutation to update quotation status, email, and other
 *   properties
 * @param {Object} context - an object containing the per-request state
 * @param {Object} input - Necessary input. See SimpleSchema
 * @returns {Promise<Object>} Object with `quotation` property containing the updated quotation
 */
export default async function updateQuotation(context, input) {
  inputSchema.validate(input);

  const {
    customFields,
    email,
    quotationId,
    status
  } = input;

  const { appEvents, collections, userId } = context;
  const { Quotations } = collections;

  // First verify that this quotation actually exists
  const quotation = await Quotations.findOne({ _id: quotationId });
  if (!quotation) throw new ReactionError("not-found", "Quotation not found");

  // At this point, this mutation only updates the workflow status, which should not be allowed
  // for the quotation creator. In the future, if this mutation does more, we should revisit these
  // permissions to see if quotation owner should be allowed.
  await context.validatePermissions(
    `reaction:legacy:quotations:${quotation._id}`,
    "update",
    { shopId: quotation.shopId }
  );

  const modifier = {
    $set: {
      updatedAt: new Date()
    }
  };

  if (email) modifier.$set.email = email;

  if (customFields) modifier.$set.customFields = customFields;

  if (status && quotation.workflow.status !== status) {
    modifier.$set["workflow.status"] = status;
    modifier.$push = {
      "workflow.workflow": status
    };
  }

  // Skip updating if we have no updates to make
  if (Object.keys(modifier.$set).length === 1) return { quotation };

  QuotationSchema.validate(modifier, { modifier: true });

  const { modifiedCount, value: updatedQuotation } = await Quotations.findOneAndUpdate(
    { _id: quotationId },
    modifier,
    { returnOriginal: false }
  );
  if (modifiedCount === 0 || !updatedQuotation) throw new ReactionError("server-error", "Unable to update quotation");

  await appEvents.emit("afterQuotationUpdate", {
    quotation: updatedQuotation,
    updatedBy: userId
  });

  return { quotation: updatedQuotation };
}
