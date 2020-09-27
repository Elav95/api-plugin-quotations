/* eslint-disable require-jsdoc */
import hashToken from "@reactioncommerce/api-utils/hashToken.js";
import mockContext from "@reactioncommerce/api-utils/tests/mockContext.js";
import { getQuotationQuery } from "./getQuotationQuery.js";

function makeContext() {
  return { accountId: "unit-test-account-id", userHasPermission: () => true };
}
mockContext.validatePermissions = jest.fn("validatePermissions");
mockContext.collections.Groups.insert = jest.fn("collections.Groups.insertOne");
mockContext.collections.Groups.findOne = jest.fn("collections.Groups.findOne");
mockContext.accountId = "unit-test-account-id";
mockContext.userHasPermission = () => true;

test("getQuotationQuery, user with `reaction:legacy:quotations/read` permissions", async () => {
  const result = {
    _id: "unit-test-quotation-id",
    shopId: "unit-test-shop-id"
  };
  const shopId = "unit-test-shop-id";
  const quotationId = "unit-test-quotation-id";
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve(result));
  mockContext.validatePermissions.mockReturnValueOnce(Promise.resolve(undefined));
  const query = await getQuotationQuery(mockContext, { _id: quotationId }, shopId, null);
  expect(query).toMatchObject(result);
  expect(query.accountId).toBeUndefined();
});

test("getQuotationQuery, user owns quotation", async () => {
  const result = {
    _id: "unit-test-quotation-id",
    accountId: "account-id",
    shopId: "unit-test-shop-id"
  };
  const shopId = "unit-test-shop-id";
  const quotationId = "unit-test-quotation-id";
  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve(result));
  mockContext.validatePermissions.mockReturnValueOnce(Promise.resolve(undefined));
  const query = await getQuotationQuery(mockContext, { _id: quotationId }, shopId, null);
  expect(query).toMatchObject(result);
  expect(query.accountId).toEqual(result.accountId);
});

test("getQuotationQuery anonymous with token", async () => {
  const result = {
    referenceId: "unit-test-quotation-reference-id",
    accountId: "account-id",
    shopId: "unit-test-shop-id",
    anonymousAccessTokens: [{ hashedToken: hashToken("unit-test-token") }]
  };

  mockContext.collections.Quotations.findOne.mockReturnValueOnce(Promise.resolve(result));
  mockContext.validatePermissions.mockReturnValueOnce(Promise.resolve(undefined));
  const token = "unit-test-token";
  const query = await getQuotationQuery(mockContext, { referenceId: result.referenceId }, result.shopId, token);
  expect(query).toMatchObject(result);
  expect(query.anonymousAccessTokens[0].hashedToken).toBe(hashToken(token));
});

test("getQuotationQuery access denied", async () => {
  const shopId = "unit-test-shop-id";
  const referenceId = "unit-test-quotation-reference-id";
  const context = makeContext();
  context.userHasPermission = () => false;
  delete context.accountId;
  const query = getQuotationQuery(mockContext, { referenceId }, shopId, null);
  expect(query).rejects.toThrow();
});
