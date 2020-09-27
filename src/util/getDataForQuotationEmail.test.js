/* eslint-disable require-jsdoc */
import mockContext from "@reactioncommerce/api-utils/tests/mockContext.js";
import Factory from "../tests/factory.js";
import getDataForQuotationEmail from "./getDataForQuotationEmail.js";

mockContext.queries.getPaymentMethodConfigByName = jest.fn().mockName("getPaymentMethodConfigByName").mockImplementation(() => ({
  functions: {
    listRefunds: async () => [{
      _id: "refundId",
      type: "refund",
      amount: 19.99,
      currency: "usd"
    }]
  }
}));

beforeEach(() => {
  jest.clearAllMocks();
});

function setupMocks(mockShop, mockCatalogItem) {
  mockContext.collections.Shops.findOne.mockReturnValueOnce(mockShop);
  mockContext.collections.Catalog.toArray.mockReturnValueOnce([mockCatalogItem]);

  mockContext.queries.findVariantInCatalogProduct = jest.fn().mockName("findVariantInCatalogProduct");
  mockContext.queries.findVariantInCatalogProduct.mockReturnValueOnce({
    catalogProduct: mockCatalogItem.product,
    variant: mockCatalogItem.product.variants[0]
  });
}

test("returns expected data structure (base case)", async () => {
  const mockCatalogItem = Factory.Catalog.makeOne({
    isDeleted: false,
    product: Factory.CatalogProduct.makeOne({
      isDeleted: false,
      isVisible: true,
      variants: Factory.CatalogProductVariant.makeMany(1, {
        media: [
          {
            priority: 1,
            productId: "mockProductId",
            variantId: "mockVariantId",
            URLs: {
              large: "large.jpg",
              medium: "medium.jpg",
              original: "original.jpg",
              small: "small.jpg",
              thumbnail: "thumbnail.jpg"
            }
          }
        ],
        options: null,
        price: 10
      })
    })
  });

  const mockQuotation = Factory.Quotation.makeOne({
    payments: Factory.Payment.makeMany(1, {
      name: "iou_example"
    })
  });

  const mockShop = Factory.Shop.makeOne({
    addressBook: [
      {
        address1: "mockAddress1",
        address2: "mockAddress2",
        city: "mockCity",
        company: "mockCompany",
        country: "mockCountry",
        fullName: "mockFullName",
        postal: "mockPostal",
        region: "mockRegion"
      }
    ],
    storefrontUrls: {
      storefrontHomeUrl: "http://example.com/storefrontHomeUrl",
      storefrontQuotationUrl: "http://example.com/storefrontQuotationUrl/:quotationId?token=:token"
    }
  });

  setupMocks(mockShop, mockCatalogItem);

  const data = await getDataForQuotationEmail(mockContext, { quotation: mockQuotation });

  expect(data).toEqual({
    billing: {
      address: {
        address: "mockAddress1 mockAddress2",
        city: "mockCity",
        fullName: "mockFullName",
        postal: "mockPostal",
        region: "mockRegion"
      },
      adjustedTotal: jasmine.any(String),
      discounts: jasmine.any(String),
      payments: [
        {
          displayAmount: jasmine.any(String),
          displayName: "mockDisplayName"
        }
      ],
      refunds: jasmine.any(String),
      shipping: jasmine.any(String),
      subtotal: jasmine.any(String),
      taxes: jasmine.any(String),
      total: jasmine.any(String)
    },
    combinedItems: [
      {
        ...mockQuotation.shipping[0].items[0],
        placeholderImage: "https://app.mock/resources/placeholder.gif",
        price: {
          amount: jasmine.any(Number),
          currencyCode: "mockCurrencyCode",
          displayAmount: jasmine.any(String)
        },
        productConfiguration: {
          productId: "mockProductId",
          productVariantId: "mockVariantId"
        },
        subtotal: {
          amount: jasmine.any(Number),
          currencyCode: "mockCurrencyCode",
          displayAmount: jasmine.any(String)
        }
      }
    ],
    contactEmail: jasmine.any(String),
    copyrightDate: jasmine.any(Number),
    homepage: "http://example.com/storefrontHomeUrl",
    legalName: "mockCompany",
    quotation: {
      ...mockQuotation,
      shipping: [
        {
          ...mockQuotation.shipping[0],
          items: [
            {
              ...mockQuotation.shipping[0].items[0],
              placeholderImage: "https://app.mock/resources/placeholder.gif",
              price: {
                amount: jasmine.any(Number),
                currencyCode: "mockCurrencyCode",
                displayAmount: jasmine.any(String)
              },
              productConfiguration: {
                productId: "mockProductId",
                productVariantId: "mockVariantId"
              },
              subtotal: {
                amount: jasmine.any(Number),
                currencyCode: "mockCurrencyCode",
                displayAmount: jasmine.any(String)
              }
            }
          ]
        }
      ]
    },
    quotationDate: jasmine.any(String),
    quotationUrl: "http://example.com/storefrontQuotationUrl/mockReferenceId?token=",
    physicalAddress: {
      address: "mockAddress1 mockAddress2",
      address1: "mockAddress1",
      address2: "mockAddress2",
      city: "mockCity",
      company: "mockCompany",
      country: "mockCountry",
      fullName: "mockFullName",
      postal: "mockPostal",
      region: "mockRegion"
    },
    shipping: {
      address: {
        address: "mockAddress1 mockAddress2",
        city: "mockCity",
        fullName: "mockFullName",
        postal: "mockPostal",
        region: "mockRegion"
      },
      carrier: "mockCarrier",
      tracking: "mockTracking"
    },
    shop: mockShop,
    shopName: "mockName",
    socialLinks: {
      display: false
    }
  });
});

test("storefrontUrls is optional", async () => {
  const mockCatalogItem = Factory.Catalog.makeOne({
    isDeleted: false,
    product: Factory.CatalogProduct.makeOne({
      isDeleted: false,
      isVisible: true,
      variants: Factory.CatalogProductVariant.makeMany(1, {
        media: [
          {
            priority: 1,
            productId: "mockProductId",
            variantId: "mockVariantId",
            URLs: {
              large: "large.jpg",
              medium: "medium.jpg",
              original: "original.jpg",
              small: "small.jpg",
              thumbnail: "thumbnail.jpg"
            }
          }
        ],
        options: null,
        price: 10
      })
    })
  });

  const mockQuotation = Factory.Quotation.makeOne({
    payments: Factory.Payment.makeMany(1, {
      name: "iou_example"
    })
  });

  const mockShop = Factory.Shop.makeOne({
    storefrontUrls: {}
  });

  setupMocks(mockShop, mockCatalogItem);

  const data = await getDataForQuotationEmail(mockContext, { quotation: mockQuotation });
  expect(data.homepage).toBeNull();
  expect(data.quotationUrl).toBeNull();
});

test("storefrontUrls does not use :token", async () => {
  const mockCatalogItem = Factory.Catalog.makeOne({
    isDeleted: false,
    product: Factory.CatalogProduct.makeOne({
      isDeleted: false,
      isVisible: true,
      variants: Factory.CatalogProductVariant.makeMany(1, {
        media: [
          {
            priority: 1,
            productId: "mockProductId",
            variantId: "mockVariantId",
            URLs: {
              large: "large.jpg",
              medium: "medium.jpg",
              original: "original.jpg",
              small: "small.jpg",
              thumbnail: "thumbnail.jpg"
            }
          }
        ],
        options: null,
        price: 10
      })
    })
  });

  const mockQuotation = Factory.Quotation.makeOne({
    payments: Factory.Payment.makeMany(1, {
      name: "iou_example"
    })
  });
  delete mockQuotation.accountId;
  const mockShop = Factory.Shop.makeOne({
    storefrontUrls: {
      storefrontHomeUrl: "http://example.com/storefrontHomeUrl",
      storefrontQuotationUrl: "http://example.com/storefrontQuotationUrl/:quotationId"
    }
  });

  setupMocks(mockShop, mockCatalogItem);

  const data = await getDataForQuotationEmail(mockContext, { quotation: mockQuotation });
  expect(data.homepage).toBe(mockShop.storefrontUrls.storefrontHomeUrl);
  expect(data.quotationUrl).toBe(`http://example.com/storefrontQuotationUrl/${mockQuotation.referenceId}`);
});
