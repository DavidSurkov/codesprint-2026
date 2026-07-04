import type { IncomingMessage, ServerResponse } from "node:http";
import type { URL } from "node:url";
import { Prisma, PrismaClient, type DonationStatus } from "@prisma/client";
import { type ZodSchema } from "zod";
import {
  campaignInputSchema,
  campaignPatchSchema,
  donationInputSchema,
  donationQuerySchema,
  loginSchema,
} from "../shared/dto.js";
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  getUserFromRequest,
  hasRole,
  verifyPassword,
} from "./auth.js";
import { processDonation } from "./payments.js";
import { buildCsv, buildPdf } from "./reporting.js";

const prisma = new PrismaClient();
const port = Number(process.env.PORT ?? 3000);
// demo rates, replace with provider-backed rates if real finance accuracy matters.
const eurRate: Record<string, number> = {
  EUR: 1,
  USD: 0.92,
  GBP: 1.17,
};

export type Context = {
  request: IncomingMessage;
  response: ServerResponse;
  requestId: string;
  url: URL;
};

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const parseBody = async <T>(request: IncomingMessage, schema: ZodSchema<T>) => {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  let json: unknown = {};
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
  return schema.parse(json);
};

const requireOrigin = (context: Context) => {
  if (
    !["POST", "PATCH", "PUT", "DELETE"].includes(context.request.method ?? "")
  ) {
    return;
  }
  const origin = context.request.headers.origin;
  if (!origin) return;
  const allowed = process.env.CLIENT_ORIGIN ?? `http://localhost:${port}`;
  if (origin !== allowed) throw new HttpError(403, "Invalid origin");
};

const requireUser = async (context: Context) => {
  const user = await getUserFromRequest(prisma, context.request);
  if (!user) throw new HttpError(401, "Unauthorized");
  return user;
};

const audit = async (
  requestId: string,
  action: string,
  entity: string,
  entityId: string | null,
  userId: string | null,
  metadata: Record<string, unknown> = {},
) => {
  await prisma.auditLog.create({
    data: {
      action,
      entity,
      entityId,
      userId,
      requestId,
      metadata: metadata as Prisma.InputJsonValue,
    },
  });
};

const publicCampaign = (campaign: {
  id: string;
  name: string;
  cause: string;
  description: string;
  logoUrl: string | null;
  color: string;
  goalAmountCents: number;
  currency: string;
  suggestedAmounts: number[];
  startsAt: Date;
  endsAt: Date | null;
}) => campaign;

const receiptMask = (contact: string | undefined, channel: string) => {
  if (!contact || channel === "none") return null;
  if (channel === "email") {
    const [name, domain] = contact.split("@");
    if (!domain) return "***";
    return `${name.slice(0, 2)}***@${domain}`;
  }
  return `${contact.slice(0, 2)}***${contact.slice(-2)}`;
};

const toEurCents = (amountCents: number, currency: string) =>
  Math.round(amountCents * (eurRate[currency] ?? 1));

type DonationQuery = ReturnType<typeof donationQuerySchema.parse>;

const createDonation = async (context: Context) => {
  const input = await parseBody(context.request, donationInputSchema);
  if (input.paymentMethod === "card" && !input.card) {
    throw new HttpError(400, "Card payload is required");
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
  });
  const now = new Date();
  if (
    !campaign ||
    campaign.status !== "active" ||
    campaign.startsAt > now ||
    (campaign.endsAt && campaign.endsAt < now)
  ) {
    throw new HttpError(400, "Campaign is not active");
  }

  const donation = await prisma.donation.create({
    data: {
      campaignId: input.campaignId,
      amountCents: input.amountCents,
      currency: input.currency,
      paymentMethod: input.paymentMethod,
      receiptChannel: input.receipt.channel,
      receiptContactMasked: receiptMask(
        input.receipt.contact,
        input.receipt.channel,
      ),
      receiptQueued: input.receipt.channel !== "none",
    },
  });
  const payment = await processDonation(context.requestId, donation.id, input);

  const updated = await prisma.donation.update({
    where: { id: donation.id },
    data: {
      status: payment.status,
      mastercardDonorReference: payment.donorReference,
      mastercardEnrollmentRef: payment.enrollmentReference,
      mastercardTransactionId: payment.transactionId,
      mastercardCorrelationId: payment.correlationId,
      mastercardEvents: {
        create: {
          source: payment.source,
          transactionId: payment.transactionId,
          status: payment.status,
          amountCents: input.amountCents,
          currency: input.currency,
          correlationId: payment.correlationId,
          processedAt: new Date(),
          errorCode: payment.errorCode,
          errorMessage: payment.errorMessage,
        },
      },
    },
  });
  await audit(
    context.requestId,
    "donation_created",
    "donation",
    updated.id,
    null,
    {
      campaignId: updated.campaignId,
      amountCents: updated.amountCents,
      currency: updated.currency,
      status: updated.status,
    },
  );

  return updated;
};

const donationWhere = (query: DonationQuery): Prisma.DonationWhereInput => ({
  campaignId: query.campaignId,
  status: query.status,
  currency: query.currency,
  amountCents: { gte: query.minAmountCents, lte: query.maxAmountCents },
  createdAt: {
    gte: query.from ? new Date(query.from) : undefined,
    lte: query.to ? new Date(query.to) : undefined,
  },
});

const listDonations = async (context: Context) => {
  const query = donationQuerySchema.parse(
    Object.fromEntries(context.url.searchParams),
  );
  return prisma.donation.findMany({
    where: donationWhere(query),
    orderBy: { [query.sort]: query.order },
    include: { campaign: true, mastercardEvents: true },
  });
};

const auditedDonationExport = async (
  context: Context,
  successAction: string,
  failureAction: string,
) => {
  const user = await requireUser(context);
  try {
    const donations = await listDonations(context);
    await audit(
      context.requestId,
      successAction,
      "donation",
      null,
      user.id,
      Object.fromEntries(context.url.searchParams),
    );
    return donations;
  } catch (error) {
    await audit(
      context.requestId,
      failureAction,
      "donation",
      null,
      user.id,
      {
        ...Object.fromEntries(context.url.searchParams),
        error: error instanceof Error ? error.message : String(error),
      },
    );
    throw error;
  }
};

const exportCsv = async (context: Context) => {
  const donations = await auditedDonationExport(
    context,
    "donations_exported",
    "donations_export_failed",
  );
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
    "donation_id",
    "created_date",
    "campaign",
    "amount_cents",
    "currency",
    "payment_method",
    "status",
    "mastercard_transaction_id",
    "receipt_channel",
    "masked_receipt_contact",
  ];
  const csv = buildCsv(header, rows);
  context.response.writeHead(200, {
    "Content-Type": "text/csv",
    "X-Request-Id": context.requestId,
    "Content-Disposition": 'attachment; filename="donations.csv"',
  });
  context.response.end(`${csv}\n`);
};

const exportPdf = async (context: Context) => {
  const donations = await auditedDonationExport(
    context,
    "donations_pdf_exported",
    "donations_pdf_export_failed",
  );
  const lines = [
    "Tap For Good transaction ledger",
    `Generated: ${new Date().toISOString()}`,
    "",
    ...donations.map((donation) =>
      [
        donation.createdAt.toISOString(),
        donation.campaign.name,
        `${donation.currency} ${(donation.amountCents / 100).toFixed(2)}`,
        donation.paymentMethod,
        donation.status,
        donation.mastercardTransactionId ?? "-",
      ].join(" | "),
    ),
  ];
  const pdf = buildPdf(lines);
  context.response.writeHead(200, {
    "Content-Type": "application/pdf",
    "X-Request-Id": context.requestId,
    "Content-Disposition": 'attachment; filename="donations.pdf"',
  });
  context.response.end(pdf);
};

const dashboard = async (context: Context) => {
  const campaignId = context.url.searchParams.get("campaignId") ?? undefined;
  const where = { status: "succeeded" as DonationStatus, campaignId };
  const donations = await prisma.donation.findMany({
    where,
    include: { campaign: true },
  });
  const totalRaisedEur = donations.reduce(
    (sum, donation) =>
      sum + toEurCents(donation.amountCents, donation.currency),
    0,
  );
  const currencyBreakdown = donations.reduce<Record<string, number>>(
    (sum, donation) => {
      sum[donation.currency] =
        (sum[donation.currency] ?? 0) + donation.amountCents;
      return sum;
    },
    {},
  );
  const campaigns = new Map(
    donations.map((donation) => [donation.campaign.id, donation.campaign]),
  );
  const goalAmountCents = [...campaigns.values()].reduce(
    (sum, campaign) =>
      sum + toEurCents(campaign.goalAmountCents, campaign.currency),
    0,
  );

  return {
    totalRaisedEur,
    successfulDonationCount: donations.length,
    averageEurDonation: donations.length
      ? Math.round(totalRaisedEur / donations.length)
      : 0,
    goalAmountCents,
    progress: goalAmountCents ? totalRaisedEur / goalAmountCents : 0,
    currencyBreakdown,
  };
};

const reconciliation = async () => {
  const donations = await prisma.donation.findMany({
    include: {
      campaign: true,
      mastercardEvents: { orderBy: { processedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
  return donations.map((donation) => {
    const event = donation.mastercardEvents[0] ?? null;
    return {
      donationId: donation.id,
      campaign: donation.campaign.name,
      amountCents: donation.amountCents,
      currency: donation.currency,
      donationStatus: donation.status,
      mastercardTransactionId: event?.transactionId ?? null,
      mastercardStatus: event?.status ?? null,
      matchState:
        event?.status === donation.status ? "matched" : "needs_review",
      source: event?.source ?? null,
      createdAt: donation.createdAt,
    };
  });
};

const handleAdmin = async (context: Context) => {
  requireOrigin(context);
  const { pathname } = context.url;
  const method = context.request.method;

  if (method === "POST" && pathname === "/api/admin/login") {
    const input = await parseBody(context.request, loginSchema);
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new HttpError(401, "Invalid email or password");
    }
    await createSession(prisma, context.response, user.id);
    await audit(context.requestId, "admin_login", "user", user.id, user.id);
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  const user = await requireUser(context);

  if (method === "POST" && pathname === "/api/admin/logout") {
    await deleteSession(prisma, context.request);
    clearSessionCookie(context.response);
    await audit(context.requestId, "admin_logout", "user", user.id, user.id);
    return { ok: true };
  }

  if (method === "GET" && pathname === "/api/admin/me") {
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  if (method === "GET" && pathname === "/api/admin/campaigns") {
    return prisma.campaign.findMany({ orderBy: { createdAt: "desc" } });
  }

  if (method === "POST" && pathname === "/api/admin/campaigns") {
    if (!hasRole(user, "volunteer")) throw new HttpError(403, "Forbidden");
    const input = await parseBody(context.request, campaignInputSchema);
    const campaign = await prisma.campaign.create({
      data: {
        ...input,
        startsAt: new Date(input.startsAt),
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
      },
    });
    await audit(
      context.requestId,
      "campaign_created",
      "campaign",
      campaign.id,
      user.id,
    );
    return campaign;
  }

  const campaignMatch = pathname.match(/^\/api\/admin\/campaigns\/([^/]+)$/);
  if (method === "PATCH" && campaignMatch) {
    if (!hasRole(user, "volunteer")) throw new HttpError(403, "Forbidden");
    const input = await parseBody(context.request, campaignPatchSchema);
    const campaign = await prisma.campaign.update({
      where: { id: campaignMatch[1] },
      data: {
        ...input,
        startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
        endsAt: input.endsAt ? new Date(input.endsAt) : input.endsAt,
      },
    });
    await audit(
      context.requestId,
      "campaign_updated",
      "campaign",
      campaign.id,
      user.id,
    );
    return campaign;
  }

  const archiveMatch = pathname.match(
    /^\/api\/admin\/campaigns\/([^/]+)\/archive$/,
  );
  if (method === "POST" && archiveMatch) {
    if (!hasRole(user, "charity_admin")) throw new HttpError(403, "Forbidden");
    const campaign = await prisma.campaign.update({
      where: { id: archiveMatch[1] },
      data: { status: "archived" },
    });
    await audit(
      context.requestId,
      "campaign_archived",
      "campaign",
      campaign.id,
      user.id,
    );
    return campaign;
  }

  if (method === "DELETE" && campaignMatch) {
    if (!hasRole(user, "charity_admin")) throw new HttpError(403, "Forbidden");
    const donations = await prisma.donation.count({
      where: { campaignId: campaignMatch[1] },
    });
    if (donations) {
      throw new HttpError(409, "Campaign has donations; archive it instead");
    }
    const campaign = await prisma.campaign.delete({
      where: { id: campaignMatch[1] },
    });
    await audit(
      context.requestId,
      "campaign_deleted",
      "campaign",
      campaign.id,
      user.id,
    );
    return campaign;
  }

  if (method === "GET" && pathname === "/api/admin/dashboard")
    return dashboard(context);
  if (method === "GET" && pathname === "/api/admin/donations")
    return listDonations(context);
  if (method === "GET" && pathname === "/api/admin/reconciliation") {
    await audit(
      context.requestId,
      "reconciliation_viewed",
      "mastercard_event",
      null,
      user.id,
    );
    return reconciliation();
  }
  if (method === "GET" && pathname === "/api/admin/audit") {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { email: true, name: true, role: true } } },
    });
  }

  throw new HttpError(404, "Not found");
};

export const handle = async (context: Context) => {
  const { pathname } = context.url;
  const method = context.request.method;

  if (method === "GET" && pathname === "/health") return { ok: true };
  if (method === "GET" && pathname === "/api/campaigns/active") {
    const now = new Date();
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: "active",
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { createdAt: "desc" },
    });
    return campaigns.map(publicCampaign);
  }
  if (method === "POST" && pathname === "/api/donations")
    return createDonation(context);

  const donationMatch = pathname.match(/^\/api\/donations\/([^/]+)$/);
  if (method === "GET" && donationMatch) {
    return prisma.donation.findUniqueOrThrow({
      where: { id: donationMatch[1] },
      include: { campaign: true },
    });
  }

  if (pathname === "/api/admin/donations/export.csv") return exportCsv(context);
  if (pathname === "/api/admin/donations/export.pdf") return exportPdf(context);
  if (pathname.startsWith("/api/admin")) return handleAdmin(context);
  throw new HttpError(404, "Not found");
};
