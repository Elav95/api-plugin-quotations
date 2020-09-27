import SimpleSchema from "simpl-schema";
import ReactionError from "@reactioncommerce/reaction-error";
import Random from "@reactioncommerce/random";
import updateGroupStatusFromItemStatus from "../util/updateGroupStatusFromItemStatus.js";
import { Quotation as QuotationSchema } from "../simpleSchemas.js";

const canceledStatus = "coreQuotationWorkflow/canceled";
const itemCanceledStatus = "coreQuotationItemWorkflow/canceled";

// These should eventually be configurable in settings
const itemStatusesThatQuotationerCanCancel = ["new"];
const quotationStatusesThatQuotationerCanCancel = ["new"];

const inputSchema = new SimpleSchema({
  cancelQuantity: {
    type: SimpleSchema.Integer,
    min: 1
  },
  itemId: String,
  quotationId: String,
  reason: {
    type: String,
    optional: true
  }
});

/**
 * @method cancelQuotationItem
 * @summary Use this mutation to cancel one item of an quotation, either for the
 *   full quotationed quantity or for a partial quantity. If partial, the item will be
 *   split into two items and the original item will have a lower quantity and will
 *   be canceled.
 *
 *   If this results in all items in a fulfillment group being canceled, the group
 *   will also be canceled. If this results in all fulfillment groups being canceled,
 *   the full quotation will also be canceled.
 * @param {Object} context - an object containing the per-request state
 * @param {Object} input - Necessary input. See SimpleSchema
 * @returns {Promise<Object>} Object with `quotation` property containing the created quotation
 */
export default async function cancelQuotationItem(context, input) {
  inputSchema.validate(input);

  const {
    quotationId,
    itemId,
    cancelQuantity,
    reason = null
  } = input;

  const { accountId, appEvents, collections, userId } = context;
  const { Quotations } = collections;

  // First verify that this quotation actually exists
  const quotation = await Quotations.findOne({ _id: quotationId });
  if (!quotation) throw new ReactionError("not-found", "Quotation not found");

  await context.validatePermissions(`reaction:legacy:quotations:${quotation._id}`, "cancel:item", {
    shopId: quotation.shopId,
    owner: quotation.accountId
  });

  // Is the account calling this mutation also the account that placed the quotation?
  // We need this check in a couple places below, so we'll get it here.
  const accountIsQuotationer = (quotation.accountId && accountId === quotation.accountId);

  // The quotationer may only cancel while the quotation status is still "new"
  if (accountIsQuotationer && !quotationStatusesThatQuotationerCanCancel.includes(quotation.workflow.status)) {
    throw new ReactionError("invalid", `Quotation status (${quotation.workflow.status}) is not one of: ${quotationStatusesThatQuotationerCanCancel.join(", ")}`);
  }

  // Find and cancel the item
  let foundItem = false;
  const updatedGroups = quotation.shipping.map((group) => {
    let itemToAdd;
    const updatedItems = group.items.map((item) => {
      if (item._id !== itemId) return item;
      foundItem = true;

      // The quotationer may only cancel while the quotation item status is still "new"
      if (accountIsQuotationer && !itemStatusesThatQuotationerCanCancel.includes(item.workflow.status)) {
        throw new ReactionError("invalid", `Item status (${item.workflow.status}) is not one of: ${itemStatusesThatQuotationerCanCancel.join(", ")}`);
      }

      // If they are requesting to cancel fewer than the total quantity of items
      // that were quotationed, we'll create a new item here with the remaining quantity.
      // It will have the same status as this item has before we cancel it.
      // Later, after we exit this loop, we'll append it to the `group.items` list.
      if (item.quantity > cancelQuantity) {
        const newItemQuantity = item.quantity - cancelQuantity;
        itemToAdd = {
          ...item,
          _id: Random.id(),
          quantity: newItemQuantity
        };

        // Update the subtotal since it is related to the quantity
        itemToAdd.subtotal = item.price.amount * newItemQuantity;
      } else if (item.quantity < cancelQuantity) {
        throw new ReactionError("invalid-param", "cancelQuantity may not be greater than item quantity");
      }

      const updatedItem = {
        ...item,
        cancelReason: reason,
        quantity: cancelQuantity
      };

      // Update the subtotal since it is related to the quantity
      updatedItem.subtotal = item.price.amount * cancelQuantity;

      if (item.workflow.status !== itemCanceledStatus) {
        updatedItem.workflow = {
          status: itemCanceledStatus,
          workflow: [...item.workflow.workflow, itemCanceledStatus]
        };
      }

      // If we make it this far, then we've found the item that they want to cancel.
      // We set the status and the cancel reason if one was provided.
      // This will also decrement the quantity to match the quantity that is being
      // canceled, which will be offset by pushing `itemToAdd` into the array later.
      return updatedItem;
    });

    // If they canceled fewer than the full quantity of the item, add a new
    // non-canceled item to make up the difference.
    if (itemToAdd) {
      updatedItems.push(itemToAdd);
    }

    const updatedGroup = { ...group, items: updatedItems };

    // Ensure proper group status
    updateGroupStatusFromItemStatus(updatedGroup);

    // There is a convenience itemIds prop, so update that, too
    if (itemToAdd) {
      updatedGroup.itemIds.push(itemToAdd._id);
    }

    // Return the group, with items and workflow potentially updated.
    return updatedGroup;
  });

  // If we did not find any matching item ID while looping, something is wrong
  if (!foundItem) throw new ReactionError("not-found", "Quotation item not found");

  // If all groups are canceled, set the quotation status to canceled
  let updatedQuotationWorkflow;
  let fullQuotationWasCanceled = false;
  const allGroupsAreCanceled = updatedGroups.every((group) => group.workflow.status === canceledStatus);
  if (allGroupsAreCanceled && quotation.workflow.status !== canceledStatus) {
    updatedQuotationWorkflow = {
      status: canceledStatus,
      workflow: [...quotation.workflow.workflow, canceledStatus]
    };
    fullQuotationWasCanceled = true;
  }

  // We're now ready to actually update the database and emit events
  const modifier = {
    $set: {
      shipping: updatedGroups,
      updatedAt: new Date()
    }
  };

  if (updatedQuotationWorkflow) {
    modifier.$set.workflow = updatedQuotationWorkflow;
  }

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

  if (fullQuotationWasCanceled) {
    await appEvents.emit("afterQuotationCancel", {
      canceledBy: userId,
      quotation: updatedQuotation
    });
  }

  return { quotation: updatedQuotation };
}
