import SimpleSchema from "simpl-schema";
import ReactionError from "@reactioncommerce/reaction-error";
import { Quotation as QuotationSchema } from "../simpleSchemas.js";
import updateGroupStatusFromItemStatus from "../util/updateGroupStatusFromItemStatus.js";
import updateGroupTotals from "../util/updateGroupTotals.js";

// These should eventually be configurable in settings
const itemStatusesThatQuotationerCanMove = ["new"];
const quotationStatusesThatQuotationerCanMove = ["new"];

const inputSchema = new SimpleSchema({
  "fromFulfillmentGroupId": String,
  "itemIds": {
    type: Array,
    minCount: 1
  },
  "itemIds.$": String,
  "quotationId": String,
  "toFulfillmentGroupId": String
});

/**
 * @method moveQuotationItems
 * @summary Use this mutation to move one or more items between existing quotation
 *   fulfillment groups.
 * @param {Object} context - an object containing the per-request state
 * @param {Object} input - Necessary input. See SimpleSchema
 * @returns {Promise<Object>} Object with `quotation` property containing the updated quotation
 */
export default async function moveQuotationItems(context, input) {
  inputSchema.validate(input);

  const {
    fromFulfillmentGroupId,
    itemIds,
    quotationId,
    toFulfillmentGroupId
  } = input;

  const {
    accountId: authAccountId,
    appEvents,
    collections,
    userId
  } = context;
  const { Quotations } = collections;

  // First verify that this quotation actually exists
  const quotation = await Quotations.findOne({ _id: quotationId });
  if (!quotation) throw new ReactionError("not-found", "Quotation not found");

  // Allow move if the account that placed the quotation is attempting to move
  await context.validatePermissions(`reaction:legacy:quotations:${quotation._id}`, "move:item", {
    shopId: quotation.shopId,
    owner: quotation.accountId
  });

  // Is the account calling this mutation also the account that placed the quotation?
  // We need this check in a couple places below, so we'll get it here.
  const accountIsQuotationer = (quotation.accountId && authAccountId === quotation.accountId);

  // The quotationer may only move items while the quotation status is still "new"
  if (accountIsQuotationer && !quotationStatusesThatQuotationerCanMove.includes(quotation.workflow.status)) {
    throw new ReactionError("invalid", `Quotation status (${quotation.workflow.status}) is not one of: ${quotationStatusesThatQuotationerCanMove.join(", ")}`);
  }

  // Find the two fulfillment groups we're modifying
  const fromGroup = quotation.shipping.find((group) => group._id === fromFulfillmentGroupId);
  if (!fromGroup) throw new ReactionError("not-found", "Quotation fulfillment group (from) not found");

  const toGroup = quotation.shipping.find((group) => group._id === toFulfillmentGroupId);
  if (!toGroup) throw new ReactionError("not-found", "Quotation fulfillment group (to) not found");

  // Pull out the item's we're moving
  const foundItemIds = [];
  const movedItems = fromGroup.items.reduce((list, item) => {
    if (itemIds.includes(item._id)) {
      // The quotationer may only move while the quotation item status is still "new"
      if (accountIsQuotationer && !itemStatusesThatQuotationerCanMove.includes(item.workflow.status)) {
        throw new ReactionError("invalid", `Item status (${item.workflow.status}) is not one of: ${itemStatusesThatQuotationerCanMove.join(", ")}`);
      }

      list.push(item);
      foundItemIds.push(item._id);
    }
    return list;
  }, []);

  if (!itemIds.every((id) => foundItemIds.includes(id))) {
    throw new ReactionError("not-found", "Some quotation items not found");
  }

  const { accountId, billingAddress, cartId, currencyCode } = quotation;

  // Find and move the items
  const quotationSurcharges = [];
  const updatedGroups = await Promise.all(quotation.shipping.map(async (group) => {
    if (group._id !== fromFulfillmentGroupId && group._id !== toFulfillmentGroupId) return group;

    let updatedItems;
    if (group._id === fromFulfillmentGroupId) {
      // Remove the moved items
      updatedItems = group.items.filter((item) => !itemIds.includes(item._id));
    } else {
      // Add the moved items
      updatedItems = [...group.items, ...movedItems];
    }

    if (updatedItems.length === 0) {
      throw new ReactionError("invalid-param", "move would result in group having no items");
    }

    // Create an updated group
    const updatedGroup = {
      ...group,
      // There is a convenience itemIds prop, so update that, too
      itemIds: updatedItems.map((item) => item._id),
      items: updatedItems,
      totalItemQuantity: updatedItems.reduce((sum, item) => sum + item.quantity, 0)
    };

    // Update group shipping, tax, totals, etc.
    const { groupSurcharges } = await updateGroupTotals(context, {
      accountId,
      billingAddress,
      cartId,
      currencyCode,
      discountTotal: updatedGroup.invoice.discounts,
      group: updatedGroup,
      quotationId,
      selectedFulfillmentMethodId: updatedGroup.shipmentMethod._id
    });

    // Push all group surcharges to overall quotation surcharge array.
    // Currently, we do not save surcharges per group
    quotationSurcharges.push(...groupSurcharges);

    // Ensure proper group status
    updateGroupStatusFromItemStatus(updatedGroup);

    return updatedGroup;
  }));

  // We're now ready to actually update the database and emit events
  const modifier = {
    $set: {
      shipping: updatedGroups,
      surcharges: quotationSurcharges,
      totalItemQuantity: updatedGroups.reduce((sum, group) => sum + group.totalItemQuantity, 0),
      updatedAt: new Date()
    }
  };

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
