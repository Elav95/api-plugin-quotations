import SimpleSchema from "simpl-schema";

const inputSchema = new SimpleSchema({
  action: {
    type: String,
    optional: true
  },
  fromShop: {
    type: Object,
    blackbox: true
  },
  to: {
    type: String
  },
  language: {
    type: String,
    optional: true
  },
  dataForEmail: {
    type: Object,
    blackbox: true
  }
});

/**
 * @name sendQuotationEmail
 * @summary A mutation that compiles and server-side renders the email template with quotation data, and sends the email
 * @param {Object} context GraphQL context
 * @param {Object} input Data for email: action, dataForEmail, fromShop, to
 * @returns {Undefined} no return
 */
export default async function sendQuotationEmail(context, input) {
  inputSchema.validate(input);

  const { action, dataForEmail, fromShop, language, to } = input;

  // Compile email
  let templateName;

  if (action === "shipped") {
    templateName = "quotations/shipped";
  } else if (action === "refunded") {
    templateName = "quotations/refunded";
  } else if (action === "itemRefund") {
    templateName = "quotations/itemRefund";
  } else {
    templateName = `quotations/${dataForEmail.quotation.workflow.status}`;
  }

  await context.mutations.sendEmail(context, {
    data: dataForEmail,
    fromShop,
    templateName,
    language,
    to
  });
}
