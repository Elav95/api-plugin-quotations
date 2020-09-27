import resolveShopFromShopId from "@reactioncommerce/api-utils/graphql/resolveShopFromShopId.js";
import { encodeQuotationItemOpaqueId } from "../../xforms/id.js";
import productTags from "./productTags.js";

export default {
  _id: (node) => encodeQuotationItemOpaqueId(node._id),
  productTags,
  shop: resolveShopFromShopId,
  status: (node) => node.workflow.status
};
