import SimpleSchema from "simpl-schema";
import ReactionError from "@reactioncommerce/reaction-error";
import Random from "@reactioncommerce/random";
import updateGroupStatusFromItemStatus from "../util/updateGroupStatusFromItemStatus.js";
import updateGroupTotals from "../util/updateGroupTotals.js";
import { Quotation as QuotationSchema } from "../simpleSchemas.js";

/**
 * @name inputSchema
 * @private
 * @type {SimpleSchema}
 * @property {String} itemId The quotation item ID to split into two items
 * @property {Number} newItemQuantity The quantity that will be transferred to a new
 *   quotation item on the same fulfillment group.
 * @property {String} quotationId The quotation ID
 */
const inputSchema = new SimpleSchema({
  itemId: String,
  newItemQuantity: {
    type: SimpleSchema.Integer,
    min: 1
  },
  quotationId: String
});

/**
 * @method splitQuotationItem
 * @summary Use this mutation to reduce the quantity of one item of an quotation and create
 *   a new item for the remaining quantity in the same fulfillment group, and with the
 *   same item status. You may want to do this if you are only able to partially fulfill
 *   the item quotation right now.
 * @param {Object} context - an object containing the per-request state
 * @param {Object} input - Necessary input. See SimpleSchema
 * @returns {Promise<Object>} Object with `quotation` property containing the created quotation
 *   and `newItemId` property set to the ID of the new item
 */
export default async function splitQuotationItem(context, input) {
  inputSchema.validate(input);

  const {
    itemId,
    quotationId,
    newItemQuantity
  } = input;

  const { appEvents, collections, userId } = context;
  const { Quotations } = collections;

  // First verify that this quotation actually exists
  const quotation = await Quotations.findOne({ _id: quotationId });
  if (!quotation) throw new ReactionError("not-found", "Quotation not found");

  // Allow split if the account has "quotations" permission
  await context.validatePermissions(
    `reaction:legacy:quotations:${quotation._id}`,
    "move:item",
    { shopId: quotation.shopId }
  );

  const { accountId, billingAddress, cartId, currencyCode } = quotation;

  // Find and split the item
  let foundItem = false;
  const newItemId = Random.id();
  const quotationSurcharges = [];
  const updatedGroups = await Promise.all(quotation.shipping.map(async (group) => {
    let itemToAdd;
    const updatedItems = group.items.map((item) => {
      if (item._id !== itemId) return item;

      if (item.quantity <= newItemQuantity) {
        throw new ReactionError("invalid-param", "quantity must be less than current item quantity");
      }

      foundItem = true;

      // The modified item to be created
      itemToAdd = {
        ...item,
        _id: newItemId,
        quantity: newItemQuantity,
        subtotal: item.price.amount * newItemQuantity
      };

      const updatedItemQuantity = item.quantity - newItemQuantity;
      const updatedItemSubtotal = item.price.amount * updatedItemQuantity;

      // The modified original item being split
      return {
        ...item,
        quantity: updatedItemQuantity,
        subtotal: updatedItemSubtotal
      };
    });

    if (!itemToAdd) return group;

    updatedItems.push(itemToAdd);

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

  // If we did not find any matching item ID while looping, something is wrong
  if (!foundItem) throw new ReactionError("not-found", "Quotation item not found");

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

  return { newItemId, quotation: updatedQuotation };
}
