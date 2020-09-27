import mockContext from "@reactioncommerce/api-utils/tests/mockContext.js";
import ReactionError from "@reactioncommerce/reaction-error";
import Factory from "../tests/factory.js";
import {
  restore as restore$updateGroupTotals,
  rewire as rewire$updateGroupTotals
} from "../util/updateGroupTotals.js";
import moveQuotationItems from "./moveQuotationItems.js";

beforeEach(() => {
  jest.resetAllMocks();
});

afterEach(() => {
  restore$updateGroupTotals();
});

test("throws if quotationId isn't supplied", async () => {
  await expect(moveQuotationItems(mockContext, {
    fromFulfillmentGroupId: "group1",
    itemIds: ["item1"],
    toFulfillmentGroupId: "group2"
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if itemIds isn't supplied", async () => {
  await expect(moveQuotationItems(mockContext, {
    fromFulfillmentGroupId: "group1",
    quotationId: "quotation1",
    toFulfillmentGroupId: "group2"
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if itemIds is empty", async () => {
  await expect(moveQuotationItems(mockContext, {
    fromFulfillmentGroupId: "group1",
    itemIds: [],
    quotationId: "quotation1",
    toFulfillmentGroupId: "group2"
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if fromFulfillmentGroupId isn't supplied", async () => {
  await expect(moveQuotationItems(mockContext, {
    itemIds: ["item1"],
    quotationId: "quotation1",
    toFulfillmentGroupId: "group2"
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if toFulfillmentGroupId isn't supplied", async () => {
  await expect(moveQuotationItems(mockContext, {
    fromFulfillmentGroupId: "group1",
    itemIds: ["item1"],
    quotationId: "quotation1"
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if the quotation doesn't exist", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve(null));

  await expect(moveQuotationItems(mockContext, {
    fromFulfillmentGroupId: "group1",
    itemIds: ["item1"],
    quotationId: "quotation1",
    toFulfillmentGroupId: "group2"
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if the fromFulfillmentGroup doesn't exist", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    shipping: [
      {
        _id: "group200",
        items: [
          {
            _id: "xyz",
            workflow: {
              status: "new",
              workflow: ["new"]
            }
          }
        ],
        workflow: {
          status: "new",
          workflow: ["new"]
        }
      }
    ],
    shopId: "SHOP_ID",
    workflow: {
      status: "new",
      workflow: ["new"]
    }
  }));

  mockContext.validatePermissions.mockReturnValueOnce(Promise.resolve(null));

  await expect(moveQuotationItems(mockContext, {
    fromFulfillmentGroupId: "group1",
    itemIds: ["item1"],
    quotationId: "quotation1",
    toFulfillmentGroupId: "group2"
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if the toFulfillmentGroup doesn't exist", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    shipping: [
      {
        _id: "group1",
        items: [
          {
            _id: "xyz",
            workflow: {
              status: "new",
              workflow: ["new"]
            }
          }
        ],
        workflow: {
          status: "new",
          workflow: ["new"]
        }
      }
    ],
    shopId: "SHOP_ID",
    workflow: {
      status: "new",
      workflow: ["new"]
    }
  }));

  mockContext.validatePermissions.mockReturnValueOnce(Promise.resolve(null));

  await expect(moveQuotationItems(mockContext, {
    fromFulfillmentGroupId: "group1",
    itemIds: ["item1"],
    quotationId: "quotation1",
    toFulfillmentGroupId: "group2"
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if an quotation item doesn't exist", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    shipping: [
      {
        _id: "group1",
        items: [
          {
            _id: "xyz",
            workflow: {
              status: "new",
              workflow: ["new"]
            }
          }
        ],
        workflow: {
          status: "new",
          workflow: ["new"]
        }
      },
      {
        _id: "group2",
        items: [
          {
            _id: "xyz",
            workflow: {
              status: "new",
              workflow: ["new"]
            }
          }
        ],
        workflow: {
          status: "new",
          workflow: ["new"]
        }
      }
    ],
    shopId: "SHOP_ID",
    workflow: {
      status: "new",
      workflow: ["new"]
    }
  }));

  mockContext.validatePermissions.mockReturnValueOnce(Promise.resolve(null));

  await expect(moveQuotationItems(mockContext, {
    fromFulfillmentGroupId: "group1",
    itemIds: ["item1"],
    quotationId: "quotation1",
    toFulfillmentGroupId: "group2"
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

  await expect(moveQuotationItems(mockContext, {
    fromFulfillmentGroupId: "group1",
    itemIds: ["item1"],
    quotationId: "quotation1",
    toFulfillmentGroupId: "group2"
  })).rejects.toThrowErrorMatchingSnapshot();

  expect(mockContext.validatePermissions).toHaveBeenCalledWith(
    "reaction:legacy:quotations:quotation1",
    "move:item",
    { shopId: "SHOP_ID" }
  );
});

test("throws if user who placed quotation tries to move item at invalid current item status", async () => {
  const accountId = "ACCOUNT_ID";

  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    accountId,
    shipping: [
      Factory.QuotationFulfillmentGroup.makeOne({
        _id: "group1",
        items: [
          Factory.QuotationItem.makeOne({
            _id: "item1",
            quantity: 1,
            workflow: {
              status: "processing",
              workflow: ["new", "processing"]
            }
          })
        ],
        workflow: {
          status: "new",
          workflow: ["new"]
        }
      }),
      Factory.QuotationFulfillmentGroup.makeOne({
        _id: "group2",
        items: [
          Factory.QuotationItem.makeOne({
            _id: "item2",
            quantity: 1,
            workflow: {
              status: "processing",
              workflow: ["new", "processing"]
            }
          })
        ],
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

  mockContext.accountId = accountId;

  await expect(moveQuotationItems(mockContext, {
    fromFulfillmentGroupId: "group1",
    itemIds: ["item1"],
    quotationId: "quotation1",
    toFulfillmentGroupId: "group2"
  })).rejects.toThrowErrorMatchingSnapshot();

  mockContext.accountId = null;
});

test("throws if user who placed quotation tries to move item at invalid current quotation status", async () => {
  const accountId = "ACCOUNT_ID";

  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    accountId,
    shipping: [
      Factory.QuotationFulfillmentGroup.makeOne({
        _id: "group1",
        items: [
          Factory.QuotationItem.makeOne({
            _id: "item1",
            quantity: 1,
            workflow: {
              status: "new",
              workflow: ["new"]
            }
          })
        ],
        workflow: {
          status: "new",
          workflow: ["new"]
        }
      }),
      Factory.QuotationFulfillmentGroup.makeOne({
        _id: "group2",
        items: [
          Factory.QuotationItem.makeOne({
            _id: "item2",
            quantity: 1,
            workflow: {
              status: "new",
              workflow: ["new"]
            }
          })
        ],
        workflow: {
          status: "new",
          workflow: ["new"]
        }
      })
    ],
    shopId: "SHOP_ID",
    workflow: {
      status: "processing",
      workflow: ["new", "processing"]
    }
  }));

  mockContext.accountId = accountId;

  await expect(moveQuotationItems(mockContext, {
    fromFulfillmentGroupId: "group1",
    itemIds: ["item1"],
    quotationId: "quotation1",
    toFulfillmentGroupId: "group2"
  })).rejects.toThrowErrorMatchingSnapshot();

  mockContext.accountId = null;
});

test("throws if the from group would have no items remaining", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    shipping: [
      Factory.QuotationFulfillmentGroup.makeOne({
        _id: "group1",
        items: [
          Factory.QuotationItem.makeOne({
            _id: "item1",
            quantity: 1,
            workflow: {
              status: "new",
              workflow: ["new"]
            }
          })
        ],
        workflow: {
          status: "new",
          workflow: ["new"]
        }
      }),
      Factory.QuotationFulfillmentGroup.makeOne({
        _id: "group2",
        items: [
          Factory.QuotationItem.makeOne({
            _id: "item2",
            quantity: 1,
            workflow: {
              status: "new",
              workflow: ["new"]
            }
          })
        ],
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
    modifiedCount: 0
  }));

  await expect(moveQuotationItems(mockContext, {
    fromFulfillmentGroupId: "group1",
    itemIds: ["item1"],
    quotationId: "quotation1",
    toFulfillmentGroupId: "group2"
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if the database update fails", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    shipping: [
      Factory.QuotationFulfillmentGroup.makeOne({
        _id: "group1",
        items: [
          Factory.QuotationItem.makeOne({
            _id: "item1",
            quantity: 1,
            workflow: {
              status: "new",
              workflow: ["new"]
            }
          }),
          Factory.QuotationItem.makeOne({
            _id: "item10",
            quantity: 1,
            workflow: {
              status: "new",
              workflow: ["new"]
            }
          })
        ],
        workflow: {
          status: "new",
          workflow: ["new"]
        }
      }),
      Factory.QuotationFulfillmentGroup.makeOne({
        _id: "group2",
        items: [
          Factory.QuotationItem.makeOne({
            _id: "item2",
            quantity: 1,
            workflow: {
              status: "new",
              workflow: ["new"]
            }
          })
        ],
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
    modifiedCount: 0
  }));

  await expect(moveQuotationItems(mockContext, {
    fromFulfillmentGroupId: "group1",
    itemIds: ["item1"],
    quotationId: "quotation1",
    toFulfillmentGroupId: "group2"
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("moves items", async () => {
  const group1Items = Factory.QuotationItem.makeMany(3, {
    _id: (index) => `item_1_${index}`,
    quantity: 1,
    workflow: {
      status: "new",
      workflow: ["new"]
    }
  });

  const group2Items = Factory.QuotationItem.makeMany(2, {
    _id: (index) => `item_2_${index}`,
    quantity: 1,
    workflow: {
      status: "new",
      workflow: ["new"]
    }
  });

  const group1 = Factory.QuotationFulfillmentGroup.makeOne({
    _id: "group1",
    items: group1Items,
    totalItemQuantity: group1Items.reduce((sum, item) => sum + item.quantity, 0)
  });

  const group2 = Factory.QuotationFulfillmentGroup.makeOne({
    _id: "group2",
    items: group2Items,
    totalItemQuantity: group2Items.reduce((sum, item) => sum + item.quantity, 0)
  });

  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    _id: "quotation1",
    shipping: [group1, group2],
    shopId: "SHOP_ID",
    totalItemQuantity: [group1, group2].reduce((sum, group) => sum + group.totalItemQuantity, 0),
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

  const mockUpdateGroupTotals = jest.fn().mockName("updateGroupTotals").mockReturnValue(Promise.resolve({ groupSurcharges: [] }));
  rewire$updateGroupTotals(mockUpdateGroupTotals);

  await moveQuotationItems(mockContext, {
    fromFulfillmentGroupId: "group1",
    itemIds: ["item_1_0", "item_1_1"],
    quotationId: "quotation1",
    toFulfillmentGroupId: "group2"
  });

  const expectedGroup2Items = [...group2.items, group1.items[0], group1.items[1]];

  expect(mockContext.collections.Quotations.findOneAndUpdate).toHaveBeenCalledWith(
    { _id: "quotation1" },
    {
      $set: {
        shipping: [
          {
            ...group1,
            items: [group1.items[2]],
            itemIds: [group1.items[2]._id],
            totalItemQuantity: 1
          },
          {
            ...group2,
            items: expectedGroup2Items,
            itemIds: expectedGroup2Items.map((item) => item._id),
            totalItemQuantity: 4
          }
        ],
        surcharges: [],
        totalItemQuantity: 5,
        updatedAt: jasmine.any(Date)
      }
    },
    { returnOriginal: false }
  );
});
