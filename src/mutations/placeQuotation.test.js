import mockContext from "@reactioncommerce/api-utils/tests/mockContext.js";
import Factory from "../tests/factory.js";
import placeQuotation from "./placeQuotation.js";

beforeEach(() => {
  jest.resetAllMocks();
  mockContext.getFunctionsOfType.mockReturnValue([]);
});

test("throws if quotation isn't supplied", async () => {
  await expect(placeQuotation(mockContext, {})).rejects.toThrowErrorMatchingSnapshot();
});

test("places an anonymous $0 quotation with no cartId and no payments", async () => {
  mockContext.accountId = null;

  const selectedFulfillmentMethodId = "METHOD_ID";
  const selectedFulfillmentMethod = {
    _id: selectedFulfillmentMethodId,
    carrier: "CARRIER",
    label: "LABEL",
    name: "METHOD1"
  };
  const catalogProduct = Factory.CatalogProduct.makeOne();
  const catalogProductVariant = Factory.CatalogProductVariant.makeOne();

  mockContext.queries.findProductAndVariant = jest.fn().mockName("findProductAndVariant");
  mockContext.queries.findProductAndVariant.mockReturnValueOnce({
    catalogProduct,
    variant: catalogProductVariant
  });

  mockContext.queries.getVariantPrice = jest.fn().mockName("getVariantPrice");
  mockContext.queries.getVariantPrice.mockReturnValueOnce({
    price: 0
  });

  mockContext.queries.inventoryForProductConfiguration = jest.fn().mockName("inventoryForProductConfiguration");
  mockContext.queries.inventoryForProductConfiguration.mockReturnValueOnce({
    canBackquotation: true,
    inventoryAvailableToSell: 10
  });

  mockContext.queries.getFulfillmentMethodsWithQuotes = jest.fn().mockName("getFulfillmentMethodsWithQuotes");
  mockContext.queries.getFulfillmentMethodsWithQuotes.mockReturnValueOnce([{
    method: selectedFulfillmentMethod,
    handlingPrice: 0,
    shippingPrice: 0,
    rate: 0
  }]);

  mockContext.queries.shopById = jest.fn().mockName("shopById");
  mockContext.queries.shopById.mockReturnValueOnce([{
    availablePaymentMethods: ["PAYMENT1"]
  }]);

  const quotationInput = Factory.quotationInputSchema.makeOne({
    billingAddress: null,
    cartId: null,
    currencyCode: "USD",
    email: "valid@email.address",
    quotationerPreferredLanguage: "en",
    fulfillmentGroups: Factory.quotationFulfillmentGroupInputSchema.makeMany(1, {
      items: Factory.quotationItemInputSchema.makeMany(1, {
        quantity: 1,
        price: 0
      }),
      selectedFulfillmentMethodId,
      totalPrice: 0
    })
  });

  const { quotations, token } = await placeQuotation(mockContext, {
    quotation: quotationInput
  });

  const [quotation] = quotations;

  expect(quotation).toEqual({
    _id: jasmine.any(String),
    accountId: null,
    anonymousAccessTokens: [
      { hashedToken: jasmine.any(String), createdAt: jasmine.any(Date) }
    ],
    billingAddress: null,
    cartId: null,
    createdAt: jasmine.any(Date),
    currencyCode: quotationInput.currencyCode,
    customFields: {},
    discounts: [],
    email: quotationInput.email,
    quotationerPreferredLanguage: "en",
    payments: [],
    referenceId: jasmine.any(String),
    shipping: [
      {
        _id: jasmine.any(String),
        address: undefined,
        invoice: {
          currencyCode: quotationInput.currencyCode,
          discounts: 0,
          effectiveTaxRate: 0,
          shipping: 0,
          subtotal: 0,
          surcharges: 0,
          taxableAmount: 0,
          taxes: 0,
          total: 0
        },
        itemIds: [quotation.shipping[0].items[0]._id],
        items: [
          {
            _id: jasmine.any(String),
            addedAt: jasmine.any(Date),
            attributes: [
              {
                label: "mockAttributeLabel",
                value: "mockOptionTitle"
              }
            ],
            createdAt: jasmine.any(Date),
            optionTitle: catalogProductVariant.optionTitle,
            parcel: undefined,
            price: {
              amount: 0,
              currencyCode: quotationInput.currencyCode
            },
            productId: catalogProduct.productId,
            productSlug: catalogProduct.slug,
            productTagIds: catalogProduct.tagIds,
            productType: catalogProduct.type,
            productVendor: catalogProduct.vendor,
            quantity: 1,
            shopId: catalogProduct.shopId,
            subtotal: 0,
            title: catalogProduct.title,
            updatedAt: jasmine.any(Date),
            variantId: catalogProductVariant.variantId,
            variantTitle: catalogProductVariant.title,
            workflow: {
              status: "new",
              workflow: [
                "coreQuotationWorkflow/created",
                "coreItemWorkflow/removedFromInventoryAvailableToSell"
              ]
            }
          }
        ],
        shipmentMethod: {
          ...selectedFulfillmentMethod,
          group: undefined,
          currencyCode: quotationInput.currencyCode,
          handling: 0,
          rate: 0
        },
        shopId: quotationInput.shopId,
        totalItemQuantity: 1,
        type: "shipping",
        workflow: {
          status: "new",
          workflow: [
            "new"
          ]
        }
      }
    ],
    shopId: quotationInput.shopId,
    surcharges: [],
    totalItemQuantity: 1,
    updatedAt: jasmine.any(Date),
    workflow: {
      status: "new",
      workflow: ["new"]
    }
  });

  expect(token).toEqual(jasmine.any(String));
});
