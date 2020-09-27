import SimpleSchema from "simpl-schema";
import ReactionError from "@reactioncommerce/reaction-error";

const inputSchema = new SimpleSchema({
  tracking: {
    type: String,
    optional: true
  },
  trackingUrl: {
    type: String,
    optional: true
  },
  quotationFulfillmentGroupId: String,
  quotationId: String,
  status: {
    type: String,
    optional: true
  }
});

/**
 * @method updateQuotationFulfillmentGroup
 * @summary Use this mutation to update an quotation fulfillment group status and tracking information
 * @param {Object} context - an object containing the per-request state
 * @param {Object} input - Necessary input. See SimpleSchema
 * @returns {Promise<Object>} Object with `quotation` property containing the updated quotation
 */
export default async function updateQuotationFulfillmentGroup(context, input) {
  inputSchema.validate(input);

  const {
    tracking,
    trackingUrl,
    quotationFulfillmentGroupId,
    quotationId,
    status
  } = input;

  const { appEvents, collections, userId } = context;
  const { Quotations } = collections;

  // First verify that this quotation actually exists
  const quotation = await Quotations.findOne({ _id: quotationId });
  if (!quotation) throw new ReactionError("not-found", "Quotation not found");

  // Allow update if the account has "quotations" permission
  await context.validatePermissions(
    `reaction:legacy:quotations:${quotation._id}`,
    "update",
    { shopId: quotation.shopId }
  );

  // Verify that there is a group with the ID
  const quotationFulfillmentGroup = quotation.shipping.find((group) => group._id === quotationFulfillmentGroupId);
  if (!quotationFulfillmentGroup) throw new ReactionError("not-found", "Quotation fulfillment group not found");

  const modifier = {
    $set: {
      "shipping.$[group].updatedAt": new Date(),
      "updatedAt": new Date()
    }
  };

  if (tracking) modifier.$set["shipping.$[group].tracking"] = tracking;
  if (trackingUrl) modifier.$set["shipping.$[group].trackingUrl"] = trackingUrl;

  if (status && quotationFulfillmentGroup.workflow.status !== status) {
    modifier.$set["shipping.$[group].workflow.status"] = status;
    modifier.$push = {
      "shipping.$[group].workflow.workflow": status
    };
  }

  // Skip updating if we have no updates to make
  if (Object.keys(modifier.$set).length === 2) return { quotation };

  const { modifiedCount, value: updatedQuotation } = await Quotations.findOneAndUpdate(
    {
      "_id": quotationId,
      "shipping._id": quotationFulfillmentGroupId
    },
    modifier,
    {
      arrayFilters: [{ "group._id": quotationFulfillmentGroupId }],
      returnOriginal: false
    }
  );
  if (modifiedCount === 0 || !updatedQuotation) throw new ReactionError("server-error", "Unable to update quotation");

  await appEvents.emit("afterQuotationUpdate", {
    quotation: updatedQuotation,
    updatedBy: userId
  });

  return { quotation: updatedQuotation };
}
