import { donationQuerySchema } from '../../shared/dto.js';
import {
  httpError,
  type Context,
} from '../http.js';
import { buildCsv, buildPdf } from '../reporting.js';
import { ok } from '../result.js';
import { getRequestUser } from '../services/admin.js';
import { audit } from '../services/audit.js';
import { listDonations } from '../services/donations.js';

const auditedDonationExport = async (
  context: Context,
  successAction: string,
  failureAction: string,
) => {
  const user = await getRequestUser(context.request);
  if (!user) return httpError(401, 'Unauthorized');
  const parsed = donationQuerySchema.safeParse(
    Object.fromEntries(context.url.searchParams),
  );
  if (!parsed.success) return httpError(400, parsed.error.message);

  try {
    const donations = await listDonations(parsed.data);
    await audit(
      context.requestId,
      successAction,
      'donation',
      null,
      user.id,
      Object.fromEntries(context.url.searchParams),
    );
    return ok(donations);
  } catch (error) {
    await audit(context.requestId, failureAction, 'donation', null, user.id, {
      ...Object.fromEntries(context.url.searchParams),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

export const exportCsv = async (context: Context) => {
  const donationsResult = await auditedDonationExport(
    context,
    'donations_exported',
    'donations_export_failed',
  );
  if (!donationsResult.ok) return donationsResult;
  const donations = donationsResult.value;
  const rows = donations.map((donation) => [
    donation.id,
    donation.createdAt.toISOString(),
    donation.campaign.name,
    donation.amountCents,
    donation.currency,
    donation.paymentMethod,
    donation.status,
    donation.mastercardTransactionId,
    donation.receiptChannel,
    donation.receiptContactMasked,
  ]);
  const header = [
    'donation_id',
    'created_date',
    'campaign',
    'amount_cents',
    'currency',
    'payment_method',
    'status',
    'mastercard_transaction_id',
    'receipt_channel',
    'masked_receipt_contact',
  ];
  const csv = buildCsv(header, rows);
  context.response.writeHead(200, {
    'Content-Type': 'text/csv',
    'X-Request-Id': context.requestId,
    'Content-Disposition': 'attachment; filename="donations.csv"',
  });
  context.response.end(`${csv}\n`);
  return ok(undefined);
};

export const exportPdf = async (context: Context) => {
  const donationsResult = await auditedDonationExport(
    context,
    'donations_pdf_exported',
    'donations_pdf_export_failed',
  );
  if (!donationsResult.ok) return donationsResult;
  const donations = donationsResult.value;
  const lines = [
    'Tap For Good transaction ledger',
    `Generated: ${new Date().toISOString()}`,
    '',
    ...donations.map((donation) =>
      [
        donation.createdAt.toISOString(),
        donation.campaign.name,
        `${donation.currency} ${(donation.amountCents / 100).toFixed(2)}`,
        donation.paymentMethod,
        donation.status,
        donation.mastercardTransactionId ?? '-',
      ].join(' | '),
    ),
  ];
  const pdf = buildPdf(lines);
  context.response.writeHead(200, {
    'Content-Type': 'application/pdf',
    'X-Request-Id': context.requestId,
    'Content-Disposition': 'attachment; filename="donations.pdf"',
  });
  context.response.end(pdf);
  return ok(undefined);
};
