import getConnectionTypeResolvers from "@reactioncommerce/api-utils/graphql/getConnectionTypeResolvers.js";
import { encodeQuotationFulfillmentGroupOpaqueId, encodeQuotationItemOpaqueId } from "../xforms/id.js";
import Mutation from "./Mutation/index.js";
import Quotation from "./Quotation/index.js";
import QuotationFulfillmentGroup from "./QuotationFulfillmentGroup/index.js";
import QuotationItem from "./QuotationItem/index.js";
import Query from "./Query/index.js";

export default {
  AddQuotationFulfillmentGroupPayload: {
    newFulfillmentGroupId: (node) => encodeQuotationFulfillmentGroupOpaqueId(node.newFulfillmentGroupId)
  },
  Mutation,
  Quotation,
  QuotationFulfillmentGroup,
  QuotationFulfillmentGroupData: {
    __resolveType(obj) {
      return obj.gqlType;
    }
  },
  QuotationItem,
  Query,
  SplitQuotationItemPayload: {
    newItemId: (node) => encodeQuotationItemOpaqueId(node.newItemId)
  },
  ...Quotation("getConnectionTypeResolvers"),
  ...getConnectionTypeResolvers("QuotationsByAccountId")
};
