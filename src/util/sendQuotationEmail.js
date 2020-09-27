import Logger from "@reactioncommerce/logger";

/**
 * @summary Sends an email about an quotation.
 * @param {Object} context App context
 * @param {Object} quotation - The quotation document
 * @param {String} [action] - The action triggering the email
 * @returns {Boolean} True if sent; else false
 */
export default async function sendQuotationEmail(context, quotation, action) {
  // anonymous account quotations without emails.
  const to = quotation.email;
  if (!to) {
    Logger.info("No quotation email found. No email sent.");
    return false;
  }

  const dataForEmail = {};
  const getDataForQuotationEmailFns = context.getFunctionsOfType("getDataForQuotationEmail");
  for (const getDataForQuotationEmailFn of getDataForQuotationEmailFns) {
    const someData = await getDataForQuotationEmailFn(context, { quotation }); // eslint-disable-line no-await-in-loop
    Object.assign(dataForEmail, someData);
  }

  const language = await getLanguageForQuotation(context, quotation);

  await context.mutations.sendQuotationEmail(context, {
    action,
    dataForEmail,
    fromShop: dataForEmail.shop,
    language,
    to
  });

  return true;
}

/**
 * @summary Returns language to be used for quotation emails.
 *          If cart is account based and has set language
 *          then returns that language, else quotation language.
 * @param {Object} context App context
 * @param {Object} quotation - The quotation document
 * @returns {String} i18n language code
 */
async function getLanguageForQuotation(context, { quotationerPreferredLanguage, accountId }) {
  const { collections: { Accounts } } = context;
  // if quotation is anonymous return quotation language
  if (!accountId) {
    return quotationerPreferredLanguage;
  }

  const account = await Accounts.findOne({ _id: accountId }, { "profile.language": 1 });
  return (account && account.profile && account.profile.language) || quotationerPreferredLanguage;
}
