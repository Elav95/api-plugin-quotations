import mockContext from "@reactioncommerce/api-utils/tests/mockContext.js";
import ReactionError from "@reactioncommerce/reaction-error";
import Factory from "../tests/factory.js";
import {
  restore as restore$buildQuotationFulfillmentGroupFromInput,
  rewire as rewire$buildQuotationFulfillmentGroupFromInput
} from "../util/buildQuotationFulfillmentGroupFromInput.js";
import {
  restore as restore$updateGroupTotals,
  rewire as rewire$updateGroupTotals
} from "../util/updateGroupTotals.js";
import addQuotationFulfillmentGroup from "./addQuotationFulfillmentGroup.js";

beforeEach(() => {
  jest.resetAllMocks();
});

afterEach(() => {
  restore$buildQuotationFulfillmentGroupFromInput();
  restore$updateGroupTotals();
});

test("throws if quotationId isn't supplied", async () => {
  const fulfillmentGroup = Factory.quotationFulfillmentGroupInputSchema.makeOne({});

  // There is a bug where Factory always adds _id
  delete fulfillmentGroup._id;

  await expect(addQuotationFulfillmentGroup(mockContext, { fulfillmentGroup })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if fulfillmentGroup isn't supplied", async () => {
  await expect(addQuotationFulfillmentGroup(mockContext, { quotationId: "123" })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if the quotation doesn't exist", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve(null));

  const fulfillmentGroup = Factory.quotationFulfillmentGroupInputSchema.makeOne({});

  // There is a bug where Factory always adds _id
  delete fulfillmentGroup._id;

  await expect(addQuotationFulfillmentGroup(mockContext, {
    fulfillmentGroup,
    quotationId: "quotation1"
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

  const fulfillmentGroup = Factory.quotationFulfillmentGroupInputSchema.makeOne({});

  // There is a bug where Factory always adds _id
  delete fulfillmentGroup._id;

  await expect(addQuotationFulfillmentGroup(mockContext, {
    fulfillmentGroup,
    quotationId: "quotation1"
  })).rejects.toThrowErrorMatchingSnapshot();

  expect(mockContext.validatePermissions).toHaveBeenCalledWith(
    "reaction:legacy:quotations:quotation1",
    "update",
    { shopId: "SHOP_ID" }
  );
});

test("throws if an item ID being moved does not exist", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    shipping: [
      Factory.QuotationFulfillmentGroup.makeOne({
        _id: "123",
        items: Factory.QuotationItem.makeMany(2, {
          _id: (index) => `ITEM_1_${index}`
        })
      }),
      Factory.QuotationFulfillmentGroup.makeOne({
        _id: "345",
        items: Factory.QuotationItem.makeMany(2, {
          _id: (index) => `ITEM_2_${index}`
        })
      })
    ],
    shopId: "SHOP_ID",
    workflow: {
      status: "new",
      workflow: ["new"]
    }
  }));

  mockContext.validatePermissions.mockReturnValueOnce(Promise.resolve(null));

  const mockUpdateGroupTotals = jest.fn().mockName("updateGroupTotals").mockReturnValue(Promise.resolve({ groupSurcharges: [] }));
  rewire$updateGroupTotals(mockUpdateGroupTotals);

  const fulfillmentGroup = Factory.quotationFulfillmentGroupInputSchema.makeOne({});

  // There is a bug where Factory always adds _id
  delete fulfillmentGroup._id;

  await expect(addQuotationFulfillmentGroup(mockContext, {
    fulfillmentGroup,
    moveItemIds: ["xyz"],
    quotationId: "quotation1"
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("adds an quotation fulfillment group", async () => {
  const originalGroups = [
    Factory.QuotationFulfillmentGroup.makeOne({
      _id: "123",
      items: Factory.QuotationItem.makeMany(2, {
        quantity: 1,
        workflow: {
          status: "new",
          workflow: ["new"]
        }
      }),
      totalItemQuantity: 2
    }),
    Factory.QuotationFulfillmentGroup.makeOne({
      items: Factory.QuotationItem.makeMany(2, {
        _id: "345",
        quantity: 1,
        workflow: {
          status: "new",
          workflow: ["new"]
        }
      }),
      totalItemQuantity: 2
    })
  ];

  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    shipping: originalGroups,
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

  const newGroup = Factory.QuotationFulfillmentGroup.makeOne({
    items: [
      Factory.QuotationItem.makeOne({
        _id: "ITEM_1",
        quantity: 1,
        price: {
          amount: 1,
          currencyCode: "USD"
        },
        subtotal: 1,
        workflow: {
          status: "new",
          workflow: ["new"]
        }
      })
    ],
    totalItemQuantity: 1,
    workflow: {
      status: "new",
      workflow: ["new"]
    }
  });
  const mockBuildQuotationFulfillmentGroupFromInput = jest.fn().mockName("buildQuotationFulfillmentGroupFromInput");
  mockBuildQuotationFulfillmentGroupFromInput.mockReturnValueOnce(Promise.resolve({
    group: newGroup,
    groupSurcharges: []
  }));
  rewire$buildQuotationFulfillmentGroupFromInput(mockBuildQuotationFulfillmentGroupFromInput);

  const fulfillmentGroup = Factory.quotationFulfillmentGroupInputSchema.makeOne({});

  // There is a bug where Factory always adds _id
  delete fulfillmentGroup._id;

  await addQuotationFulfillmentGroup(mockContext, {
    fulfillmentGroup,
    quotationId: "quotation1"
  });

  expect(mockContext.collections.Quotations.findOneAndUpdate).toHaveBeenCalledWith(
    { _id: "quotation1" },
    {
      $set: {
        shipping: [
          ...originalGroups,
          newGroup
        ],
        surcharges: [],
        totalItemQuantity: 5,
        updatedAt: jasmine.any(Date)
      }
    },
    { returnOriginal: false }
  );
});
