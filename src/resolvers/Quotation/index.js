import resolveAccountFromAccountId from "@reactioncommerce/api-utils/graphql/resolveAccountFromAccountId.js";
import resolveShopFromShopId from "@reactioncommerce/api-utils/graphql/resolveShopFromShopId.js";
import { encodeCartOpaqueId, encodeQuotationOpaqueId } from "../../xforms/id.js";
import quotationDisplayStatus from "./quotationDisplayStatus.js";
import quotationSummary from "./quotationSummary.js";
import payments from "./payments.js";
import totalItemQuantity from "./totalItemQuantity.js";

export default {
  _id: (node) => encodeQuotationOpaqueId(node._id),
  account: resolveAccountFromAccountId,
  cartId: (node) => encodeCartOpaqueId(node._id),
  displayStatus: (node, { language }, context) => quotationDisplayStatus(context, node, language),
  fulfillmentGroups: (node) => node.shipping || [],
  notes: (node) => node.notes || [],
  payments: (node, _, context) => payments(context, node),
  shop: resolveShopFromShopId,
  status: (node) => node.workflow.status,
  summary: (node, _, context) => quotationSummary(context, node),
  totalItemQuantity
};
