import SimpleSchema from "simpl-schema";
import ReactionError from "@reactioncommerce/reaction-error";
import { Quotation as QuotationSchema, quotationFulfillmentGroupInputSchema, quotationItemInputSchema } from "../simpleSchemas.js";
import buildQuotationFulfillmentGroupFromInput from "../util/buildQuotationFulfillmentGroupFromInput.js";
import updateGroupStatusFromItemStatus from "../util/updateGroupStatusFromItemStatus.js";
import updateGroupTotals from "../util/updateGroupTotals.js";

const groupInputSchema = quotationFulfillmentGroupInputSchema.clone().extend({
  // Make items optional since we have the option of moving items
  // from another group
  "items": {
    type: Array,
    optional: true,
    minCount: 1
  },
  "items.$": quotationItemInputSchema
});

const inputSchema = new SimpleSchema({
  "fulfillmentGroup": groupInputSchema,
  "moveItemIds": {
    type: Array,
    optional: true,
    minCount: 1
  },
  "moveItemIds.$": String,
  "quotationId": String
});

/**
 * @method addQuotationFulfillmentGroup
 * @summary Use this mutation to add a new quotation fulfillment group to an quotation. It must have at least one
 *   item, which can be provided or moved from another existing group.
 * @param {Object} context - an object containing the per-request state
 * @param {Object} input - Necessary input. See SimpleSchema
 * @returns {Promise<Object>} Object with `quotation` property containing the updated quotation and a
 *   `newFulfillmentGroupId` property set to the ID of the added group
 */
export default async function addQuotationFulfillmentGroup(context, input) {
  inputSchema.validate(input);

  const {
    fulfillmentGroup: inputGroup,
    moveItemIds,
    quotationId
  } = input;

  const { appEvents, collections, userId } = context;
  const { Quotations } = collections;

  // First verify that this quotation actually exists
  const quotation = await Quotations.findOne({ _id: quotationId });
  if (!quotation) throw new ReactionError("not-found", "Quotation not found");

  // Allow update if the account has "quotations" permission
  await context.validatePermissions(`reaction:legacy:quotations:${quotation._id}`, "update", { shopId: quotation.shopId });

  const { accountId, billingAddress, cartId, currencyCode } = quotation;

  // If there are moveItemIds, find and pull them from their current groups
  let updatedGroups;
  const quotationSurcharges = [];
  const movingItems = [];
  if (moveItemIds) {
    await context.validatePermissions(
      `reaction:legacy:quotations:${quotation._id}`,
      "move:item",
      { shopId: quotation.shopId }
    );

    updatedGroups = await Promise.all(quotation.shipping.map(async (group) => {
      let movedSomeItems = false;
      const updatedItems = group.items.reduce((list, item) => {
        if (moveItemIds.includes(item._id)) {
          movingItems.push(item);
          movedSomeItems = true;
        } else {
          list.push(item);
        }
        return list;
      }, []);

      if (!movedSomeItems) return group;

      if (updatedItems.length === 0) {
        throw new ReactionError("invalid-param", "moveItemIds would result in group having no items");
      }

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

      // Return the group, with items and workflow potentially updated.
      return updatedGroup;
    }));

    if (moveItemIds.length !== movingItems.length) {
      throw new ReactionError("invalid-param", "Some moveItemIds did not match any item IDs on the quotation");
    }
  } else {
    updatedGroups = [...quotation.shipping];
    if (Array.isArray(quotation.surcharges)) quotationSurcharges.push(...quotation.surcharges);
  }

  // Now build the new group we are adding
  const { group: newGroup, groupSurcharges } = await buildQuotationFulfillmentGroupFromInput(context, {
    accountId,
    // If we are moving any items from existing groups to this new group, push those into
    // the newGroup items array.
    additionalItems: movingItems,
    billingAddress,
    cartId,
    currencyCode,
    // No support for discounts for now. Pending future promotions revamp.
    discountTotal: 0,
    inputGroup,
    quotationId
  });

  // Add the new group to the quotation groups list
  updatedGroups.push(newGroup);

  // Push all group surcharges to overall quotation surcharge array.
  // Currently, we do not save surcharges per group
  quotationSurcharges.push(...groupSurcharges);

  // Now we're ready to update the database
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

  return { newFulfillmentGroupId: newGroup._id, quotation: updatedQuotation };
}
