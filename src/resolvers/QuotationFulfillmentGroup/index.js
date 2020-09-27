import resolveShopFromShopId from "@reactioncommerce/api-utils/graphql/resolveShopFromShopId.js";
import { encodeQuotationFulfillmentGroupOpaqueId } from "../../xforms/id.js";
import xformQuotationFulfillmentGroupSelectedOption from "../../xforms/xformQuotationFulfillmentGroupSelectedOption.js";
import fulfillmentGroupDisplayStatus from "./fulfillmentGroupDisplayStatus.js";
import items from "./items.js";
import summary from "./summary.js";

export default {
  _id: (node) => encodeQuotationFulfillmentGroupOpaqueId(node._id),
  data(node) {
    if (node.type === "shipping") {
      return { gqlType: "ShippingQuotationFulfillmentGroupData", shippingAddress: node.address };
    }
    return null;
  },
  displayStatus: (node, { language }, context) => fulfillmentGroupDisplayStatus(context, node, language),
  items,
  selectedFulfillmentOption: (node) => xformQuotationFulfillmentGroupSelectedOption(node.shipmentMethod, node),
  shop: resolveShopFromShopId,
  status: (node) => node.workflow.status,
  summary
};
