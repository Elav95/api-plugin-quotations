import mockContext from "@reactioncommerce/api-utils/tests/mockContext.js";
import ReactionError from "@reactioncommerce/reaction-error";
import Factory from "../tests/factory.js";
import updateQuotation from "./updateQuotation.js";

beforeEach(() => {
  jest.resetAllMocks();
});

const quotationId = "quotation1";

test("throws if quotationId isn't supplied", async () => {
  await expect(updateQuotation(mockContext, {})).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if the quotation doesn't exist", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve(null));

  await expect(updateQuotation(mockContext, {
    quotationId
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if permission check fails", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    _id: "quotation1",
    shipping: [
      {
        items: []
      }
    ],
    shopId: "SHOP_ID"
  }));

  mockContext.validatePermissions.mockImplementation(() => {
    throw new ReactionError("access-denied", "Access Denied");
  });

  await expect(updateQuotation(mockContext, {
    quotationId
  })).rejects.toThrowErrorMatchingSnapshot();

  expect(mockContext.validatePermissions).toHaveBeenCalledWith(
    `reaction:legacy:quotations:${quotationId}`,
    "update",
    { shopId: "SHOP_ID" }
  );
});

test("skips update if one is not necessary", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    customFields: {
      foo: "boo"
    },
    email: "old@email.com",
    shipping: [
      Factory.QuotationFulfillmentGroup.makeOne({
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

  await updateQuotation(mockContext, { quotationId });

  expect(mockContext.collections.Quotations.findOneAndUpdate).not.toHaveBeenCalled();
});

test("updates an quotation", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    customFields: {
      foo: "boo"
    },
    email: "old@email.com",
    shipping: [
      Factory.QuotationFulfillmentGroup.makeOne({
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

  mockContext.collections.Quotations.findOneAndUpdate.mockReturnValueOnce(Promise.resolve({
    modifiedCount: 1,
    value: {}
  }));

  await updateQuotation(mockContext, {
    customFields: {
      foo: "bar"
    },
    email: "new@email.com",
    quotationId,
    status: "NEW_STATUS"
  });

  expect(mockContext.collections.Quotations.findOneAndUpdate).toHaveBeenCalledWith(
    { _id: quotationId },
    {
      $set: {
        "customFields": {
          foo: "bar"
        },
        "email": "new@email.com",
        "updatedAt": jasmine.any(Date),
        "workflow.status": "NEW_STATUS"
      },
      $push: {
        "workflow.workflow": "NEW_STATUS"
      }
    },
    { returnOriginal: false }
  );
});
