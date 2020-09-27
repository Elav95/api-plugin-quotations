import mockContext from "@reactioncommerce/api-utils/tests/mockContext.js";
import ReactionError from "@reactioncommerce/reaction-error";
import Factory from "../tests/factory.js";
import cancelQuotationItem from "./cancelQuotationItem.js";


beforeEach(() => {
  jest.resetAllMocks();
});

test("throws if quotationId isn't supplied", async () => {
  await expect(cancelQuotationItem(mockContext, {
    itemId: "abc",
    cancelQuantity: 1
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if itemId isn't supplied", async () => {
  await expect(cancelQuotationItem(mockContext, {
    quotationId: "abc",
    cancelQuantity: 1
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if cancelQuantity isn't supplied", async () => {
  await expect(cancelQuotationItem(mockContext, {
    itemId: "abc",
    quotationId: "abc"
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if cancelQuantity is 0", async () => {
  await expect(cancelQuotationItem(mockContext, {
    itemId: "abc",
    quotationId: "abc",
    cancelQuantity: 0
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if cancelQuantity is negative", async () => {
  await expect(cancelQuotationItem(mockContext, {
    itemId: "abc",
    quotationId: "abc",
    cancelQuantity: -1
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if the quotation doesn't exist", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve(null));

  await expect(cancelQuotationItem(mockContext, {
    itemId: "abc",
    quotationId: "abc",
    cancelQuantity: 1
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if the quotation item doesn't exist", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    shipping: [
      {
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

  await expect(cancelQuotationItem(mockContext, {
    itemId: "abc",
    quotationId: "abc",
    cancelQuantity: 1
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if permission check fails", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    _id: "abc",
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

  await expect(cancelQuotationItem(mockContext, {
    itemId: "abc",
    quotationId: "abc",
    cancelQuantity: 1
  })).rejects.toThrowErrorMatchingSnapshot();

  expect(mockContext.validatePermissions).toHaveBeenCalledWith(
    "reaction:legacy:quotations:abc",
    "cancel:item",
    { shopId: "SHOP_ID" }
  );
});

test("throws if user who placed quotation tries to cancel at invalid current item status", async () => {
  const accountId = "ACCOUNT_ID";

  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    accountId,
    shipping: [
      Factory.QuotationFulfillmentGroup.makeOne({
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

  await expect(cancelQuotationItem(mockContext, {
    itemId: "ITEM_1",
    quotationId: "QUOTATION_1",
    cancelQuantity: 1
  })).rejects.toThrowErrorMatchingSnapshot();

  mockContext.accountId = null;
});

test("throws if user who placed quotation tries to cancel at invalid current quotation status", async () => {
  const accountId = "ACCOUNT_ID";

  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    accountId,
    shipping: [
      Factory.QuotationFulfillmentGroup.makeOne({
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

  await expect(cancelQuotationItem(mockContext, {
    itemId: "ITEM_1",
    quotationId: "QUOTATION_1",
    cancelQuantity: 1
  })).rejects.toThrowErrorMatchingSnapshot();

  mockContext.accountId = null;
});

test("throws if cancelQuantity is greater than item quantity", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    shipping: [
      {
        items: [
          { _id: "abc", quantity: 1 }
        ]
      }
    ],
    shopId: "SHOP_ID"
  }));

  mockContext.validatePermissions.mockReturnValueOnce(Promise.resolve(null));

  await expect(cancelQuotationItem(mockContext, {
    itemId: "abc",
    quotationId: "abc",
    cancelQuantity: 2
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("throws if the database update fails", async () => {
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    shipping: [
      Factory.QuotationFulfillmentGroup.makeOne({
        items: [
          Factory.QuotationItem.makeOne({
            _id: "abc",
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

  await expect(cancelQuotationItem(mockContext, {
    itemId: "abc",
    quotationId: "abc",
    cancelQuantity: 1
  })).rejects.toThrowErrorMatchingSnapshot();
});

test("cancels all of an item", async () => {
  const item1 = Factory.QuotationItem.makeOne({
    _id: "ITEM_1",
    cancelReason: null,
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
  });

  const item2 = Factory.QuotationItem.makeOne({
    _id: "ITEM_2",
    cancelReason: null,
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
  });

  const group = Factory.QuotationFulfillmentGroup.makeOne({
    items: [item1, item2]
  });

  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    _id: "QUOTATION_1",
    shipping: [group],
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

  await cancelQuotationItem(mockContext, {
    itemId: "ITEM_1",
    quotationId: "QUOTATION_1",
    cancelQuantity: 1,
    reason: "REASON"
  });

  expect(mockContext.collections.Quotations.findOneAndUpdate).toHaveBeenCalledWith(
    { _id: "QUOTATION_1" },
    {
      $set: {
        shipping: [
          {
            ...group,
            items: [
              {
                ...item1,
                cancelReason: "REASON",
                workflow: {
                  status: "coreQuotationItemWorkflow/canceled",
                  workflow: ["new", "coreQuotationItemWorkflow/canceled"]
                }
              },
              item2
            ]
          }
        ],
        updatedAt: jasmine.any(Date)
      }
    },
    { returnOriginal: false }
  );
});

test("cancels some of an item", async () => {
  const item1 = Factory.QuotationItem.makeOne({
    _id: "ITEM_1",
    cancelReason: null,
    price: {
      amount: 5,
      currencyCode: "USD"
    },
    quantity: 5,
    subtotal: 25,
    workflow: {
      status: "new",
      workflow: ["new"]
    }
  });

  const item2 = Factory.QuotationItem.makeOne({
    _id: "ITEM_2",
    cancelReason: null,
    price: {
      amount: 5,
      currencyCode: "USD"
    },
    quantity: 1,
    subtotal: 5,
    workflow: {
      status: "new",
      workflow: ["new"]
    }
  });

  const group = Factory.QuotationFulfillmentGroup.makeOne({
    items: [item1, item2],
    itemIds: [item1._id, item2._id]
  });

  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    _id: "QUOTATION_1",
    shipping: [group],
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

  await cancelQuotationItem(mockContext, {
    itemId: "ITEM_1",
    quotationId: "QUOTATION_1",
    cancelQuantity: 2,
    reason: "REASON"
  });

  expect(mockContext.collections.Quotations.findOneAndUpdate).toHaveBeenCalledWith(
    { _id: "QUOTATION_1" },
    {
      $set: {
        shipping: [
          {
            ...group,
            items: [
              {
                ...item1,
                cancelReason: "REASON",
                quantity: 2,
                subtotal: 10,
                workflow: {
                  status: "coreQuotationItemWorkflow/canceled",
                  workflow: ["new", "coreQuotationItemWorkflow/canceled"]
                }
              },
              item2,
              {
                ...item1,
                _id: jasmine.any(String),
                quantity: 3,
                subtotal: 15,
                workflow: {
                  status: "new",
                  workflow: ["new"]
                }
              }
            ],
            itemIds: [item1._id, item2._id, jasmine.any(String)]
          }
        ],
        updatedAt: jasmine.any(Date)
      }
    },
    { returnOriginal: false }
  );
});

test("cancels the group if all items are canceled", async () => {
  const item1 = Factory.QuotationItem.makeOne({
    _id: "ITEM_1",
    cancelReason: null,
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
  });

  const item2 = Factory.QuotationItem.makeOne({
    _id: "ITEM_2",
    cancelReason: null,
    quantity: 1,
    price: {
      amount: 1,
      currencyCode: "USD"
    },
    subtotal: 1,
    workflow: {
      status: "coreQuotationItemWorkflow/canceled",
      workflow: ["new", "coreQuotationItemWorkflow/canceled"]
    }
  });

  const group1 = Factory.QuotationFulfillmentGroup.makeOne({
    items: [item1, item2],
    workflow: {
      status: "new",
      workflow: ["new"]
    }
  });

  const group2 = Factory.QuotationFulfillmentGroup.makeOne({
    items: Factory.QuotationItem.makeMany(3, {
      price: {
        amount: 1,
        currencyCode: "USD"
      },
      quantity: 1,
      subtotal: 1,
      workflow: {
        status: "new",
        workflow: ["new"]
      }
    }),
    workflow: {
      status: "new",
      workflow: ["new"]
    }
  });

  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    _id: "QUOTATION_1",
    shipping: [group1, group2],
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

  await cancelQuotationItem(mockContext, {
    itemId: "ITEM_1",
    quotationId: "QUOTATION_1",
    cancelQuantity: 1
  });

  expect(mockContext.collections.Quotations.findOneAndUpdate).toHaveBeenCalledWith(
    { _id: "QUOTATION_1" },
    {
      $set: {
        shipping: [
          {
            ...group1,
            items: [
              {
                ...item1,
                cancelReason: null,
                workflow: {
                  status: "coreQuotationItemWorkflow/canceled",
                  workflow: ["new", "coreQuotationItemWorkflow/canceled"]
                }
              },
              item2
            ],
            workflow: {
              status: "coreQuotationWorkflow/canceled",
              workflow: ["new", "coreQuotationWorkflow/canceled"]
            }
          },
          group2
        ],
        updatedAt: jasmine.any(Date)
      }
    },
    { returnOriginal: false }
  );
});

test("cancels the quotation and emits afterQuotationCancel if all groups are canceled", async () => {
  const item1 = Factory.QuotationItem.makeOne({
    _id: "ITEM_1",
    cancelReason: null,
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
  });

  const item2 = Factory.QuotationItem.makeOne({
    _id: "ITEM_2",
    cancelReason: null,
    quantity: 1,
    price: {
      amount: 1,
      currencyCode: "USD"
    },
    subtotal: 1,
    workflow: {
      status: "coreQuotationItemWorkflow/canceled",
      workflow: ["new", "coreQuotationItemWorkflow/canceled"]
    }
  });

  const group1 = Factory.QuotationFulfillmentGroup.makeOne({
    items: [item1, item2],
    workflow: {
      status: "new",
      workflow: ["new"]
    }
  });

  const group2 = Factory.QuotationFulfillmentGroup.makeOne({
    items: Factory.QuotationItem.makeMany(3, {
      price: {
        amount: 1,
        currencyCode: "USD"
      },
      quantity: 1,
      subtotal: 1,
      workflow: {
        status: "coreQuotationItemWorkflow/canceled",
        workflow: ["new", "coreQuotationItemWorkflow/canceled"]
      }
    }),
    workflow: {
      status: "coreQuotationWorkflow/canceled",
      workflow: ["new", "coreQuotationWorkflow/canceled"]
    }
  });

  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    _id: "QUOTATION_1",
    shipping: [group1, group2],
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

  await cancelQuotationItem(mockContext, {
    itemId: "ITEM_1",
    quotationId: "QUOTATION_1",
    cancelQuantity: 1
  });

  expect(mockContext.collections.Quotations.findOneAndUpdate).toHaveBeenCalledWith(
    { _id: "QUOTATION_1" },
    {
      $set: {
        shipping: [
          {
            ...group1,
            items: [
              {
                ...item1,
                cancelReason: null,
                workflow: {
                  status: "coreQuotationItemWorkflow/canceled",
                  workflow: ["new", "coreQuotationItemWorkflow/canceled"]
                }
              },
              {
                ...item2,
                cancelReason: null,
                workflow: {
                  status: "coreQuotationItemWorkflow/canceled",
                  workflow: ["new", "coreQuotationItemWorkflow/canceled"]
                }
              }
            ],
            workflow: {
              status: "coreQuotationWorkflow/canceled",
              workflow: ["new", "coreQuotationWorkflow/canceled"]
            }
          },
          group2
        ],
        updatedAt: jasmine.any(Date),
        workflow: {
          status: "coreQuotationWorkflow/canceled",
          workflow: ["new", "coreQuotationWorkflow/canceled"]
        }
      }
    },
    { returnOriginal: false }
  );
});

test("succeeds if already canceled, but does not push canceled status again", async () => {
  const item1 = Factory.QuotationItem.makeOne({
    _id: "ITEM_1",
    cancelReason: null,
    quantity: 1,
    price: {
      amount: 1,
      currencyCode: "USD"
    },
    subtotal: 1,
    workflow: {
      status: "coreQuotationItemWorkflow/canceled",
      workflow: ["new", "coreQuotationItemWorkflow/canceled"]
    }
  });

  const item2 = Factory.QuotationItem.makeOne({
    _id: "ITEM_2",
    cancelReason: null,
    quantity: 1,
    price: {
      amount: 1,
      currencyCode: "USD"
    },
    subtotal: 1,
    workflow: {
      status: "coreQuotationItemWorkflow/canceled",
      workflow: ["new", "coreQuotationItemWorkflow/canceled"]
    }
  });

  const group = Factory.QuotationFulfillmentGroup.makeOne({
    items: [item1, item2],
    workflow: {
      status: "coreQuotationWorkflow/canceled",
      workflow: ["new", "coreQuotationWorkflow/canceled"]
    }
  });

  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve({
    _id: "QUOTATION_1",
    shipping: [group],
    shopId: "SHOP_ID",
    workflow: {
      status: "coreQuotationWorkflow/canceled",
      workflow: ["new", "coreQuotationWorkflow/canceled"]
    }
  }));

  mockContext.validatePermissions.mockReturnValueOnce(Promise.resolve(null));

  mockContext.collections.Quotations.findOneAndUpdate.mockReturnValueOnce(Promise.resolve({
    modifiedCount: 1,
    value: {}
  }));

  await cancelQuotationItem(mockContext, {
    itemId: "ITEM_1",
    quotationId: "QUOTATION_1",
    cancelQuantity: 1,
    reason: "REASON"
  });

  expect(mockContext.collections.Quotations.findOneAndUpdate).toHaveBeenCalledWith(
    { _id: "QUOTATION_1" },
    {
      $set: {
        shipping: [
          {
            ...group,
            items: [
              {
                ...item1,
                cancelReason: "REASON",
                workflow: {
                  status: "coreQuotationItemWorkflow/canceled",
                  workflow: ["new", "coreQuotationItemWorkflow/canceled"]
                }
              },
              item2
            ]
          }
        ],
        updatedAt: jasmine.any(Date)
      }
    },
    { returnOriginal: false }
  );
});
