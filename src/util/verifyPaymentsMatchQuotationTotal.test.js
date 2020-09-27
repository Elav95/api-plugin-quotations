import verifyPaymentsMatchQuotationTotal from "./verifyPaymentsMatchQuotationTotal.js";

test("throws if does not match", () => {
  const payments = [
    { amount: 5 }
  ];

  expect(() => verifyPaymentsMatchQuotationTotal(payments, 6)).toThrowErrorMatchingSnapshot();
});

test("does not throw if matches", () => {
  const payments = [
    { amount: 5 }
  ];

  expect(() => verifyPaymentsMatchQuotationTotal(payments, 5)).not.toThrow();
});

test("is not confused by JavaScript floating point math errors", () => {
  // Do 9.99+50+40 in JS console. Result is 99.99000000000001 due to inaccuracy
  // of JS floating point math.
  const payments = [
    { amount: 9.99 },
    { amount: 50 },
    { amount: 40 }
  ];

  expect(() => verifyPaymentsMatchQuotationTotal(payments, 99.99)).not.toThrow();
});
