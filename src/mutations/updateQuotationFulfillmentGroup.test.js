import mockContext from "@reactioncommerce/api-utils/tests/mockContext.js";
import ReactionError from "@reactioncommerce/reaction-error";
import Factory from "../tests/factory.js";
import updateQuotationFulfillmentGroup from "./updateQuotationFulfillmentGroup.js";

beforeEach(() => {
  jest.resetAllMocks();
});

test("throws if quotationId isn't supplied", async () => {
  await expect(updateQuotationFulfillmentGroup(mockContext, { quotationFulfillmentGroupId: "123" })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if quotationFulfillmentGroupId isn't supplied", async () => {
  await expect(updateQuotationFulfillmentGroup(mockContext, { quotationId: "123" })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if the quotation doesn't exist", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve(null));

  await expect(updateQuotationFulfillmentGroup(mockContext, {
    quotationId: "quotation1",
    quotationFulfillmentGroupId: "123"
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if the quotation fulfillment group doesn't exist", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    shipping: [
      {
        _id: "abc",
        items: []
      }
    ],
    shopId: "SHOP_ID"
  }));

  mockContext.validatePermissions.mockReturnValueOnce(Promise.resolve(null));

  await expect(updateQuotationFulfillmentGroup(mockContext, {
    quotationId: "quotation1",
    quotationFulfillmentGroupId: "123"
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if permission check fails", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    _id: "quotation1",
    shipping: [
      {
        _id: "123",
        items: []
      }
    ],
    shopId: "SHOP_ID"
  }));

  mockContext.validatePermissions.mockImplementation(() => {
    throw new ReactionError("access-denied", "Access Denied");
  });

  await expect(updateQuotationFulfillmentGroup(mockContext, {
    quotationId: "quotation1",
    quotationFulfillmentGroupId: "123"
  })).rejects.toThrowErrorMatchingSnapshot();

  expect(mockContext.validatePermissions).toHaveBeenCalledWith(
    "reaction:legacy:quotations:quotation1",
    "update",
    { shopId: "SHOP_ID" }
  );
});

test("skips update if one is not necessary", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    shipping: [
      Factory.QuotationFulfillmentGroup.makeOne({
        _id: "group1",
        items: Factory.QuotationItem.makeMany(2)
      })
    ],
    shopId: "SHOP_ID",
    workflow: {
      status: "new",
      workflow: ["new"]
    }
  }));

  mockContext.validatePermissions.mockReturnValueOnce(Promise.resolve(null));

  await updateQuotationFulfillmentGroup(mockContext, { quotationId: "quotation1", quotationFulfillmentGroupId: "group1" });

  expect(mockContext.collections.Quotations.findOneAndUpdate).not.toHaveBeenCalled();
});

test("updates an quotation fulfillment group", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    shipping: [
      Factory.QuotationFulfillmentGroup.makeOne({
        _id: "group1",
        items: Factory.QuotationItem.makeMany(2),
        workflow: {
          status: "new",
          workflow: ["new"]
        }
      })
    ],
    shopId: "SHOP_ID",
    workflow: {
      status: "new",
      workflow: ["new"]
    }
  }));

  mockContext.validatePermissions.mockReturnValueOnce(Promise.resolve(null));

  mockContext.collections.Quotations.findOneAndUpdate.mockReturnValueOnce(Promise.resolve({
    modifiedCount: 1,
    value: {}
  }));

  await updateQuotationFulfillmentGroup(mockContext, {
    quotationId: "quotation1",
    quotationFulfillmentGroupId: "group1",
    status: "NEW_STATUS",
    tracking: "TRACK_REF",
    trackingUrl: "http://track.me/TRACK_REF"
  });

  expect(mockContext.collections.Quotations.findOneAndUpdate).toHaveBeenCalledWith(
    {
      "_id": "quotation1",
      "shipping._id": "group1"
    },
    {
      $set: {
        "shipping.$[group].tracking": "TRACK_REF",
        "shipping.$[group].trackingUrl": "http://track.me/TRACK_REF",
        "shipping.$[group].updatedAt": jasmine.any(Date),
        "shipping.$[group].workflow.status": "NEW_STATUS",
        "updatedAt": jasmine.any(Date)
      },
      $push: {
        "shipping.$[group].workflow.workflow": "NEW_STATUS"
      }
    },
    {
      arrayFilters: [{ "group._id": "group1" }],
      returnOriginal: false
    }
  );
});
