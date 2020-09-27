import sendQuotationEmail from "./util/sendQuotationEmail.js";

/**
 * @summary Called on startup
 * @param {Object} context Startup context
 * @param {Object} context.collections Map of MongoDB collections
 * @returns {undefined}
 */
export default function quotationsStartup(context) {
  const { appEvents } = context;

  appEvents.on("afterQuotationCreate", ({ quotation }) => sendQuotationEmail(context, quotation));
}
