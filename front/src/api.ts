import type {
  AuditRow,
  Campaign,
  Dashboard,
  Donation,
  ReconciliationRow,
  User,
} from "./types";

type Json = Record<string, unknown>;
type ApiCampaign = Json & {
  goalAmountCents: number;
  suggestedAmounts: number[];
};
type ApiDonation = Json & {
  amountCents: number;
  campaign?: { name?: string };
  receiptContactMasked?: string | null;
};
type ApiDashboard = Json & {
  totalRaisedEur: number;
  averageEurDonation: number;
  progress?: number;
  currencyBreakdown?: Record<string, number>;
};
type ApiReconciliationRow = Json & {
  campaign?: string;
  amountCents: number;
};
type ApiAuditRow = Json & {
  entity?: string;
  user?: { name?: string; email?: string };
};
type DonationFilters = Record<string, string>;
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

const apiUrl = (path: string) => `${apiBaseUrl}${path}`;

const parseJson = async <T>(response: Response): Promise<T> => {
  const body = (await response.json().catch(() => ({}))) as Json;
  if (!response.ok) {
    const message =
      typeof body.message === "string"
        ? body.message
        : typeof body.error === "string"
          ? body.error
          : `${response.status} ${response.statusText || "Request failed"}`;
    throw new Error(message);
  }
  return body as T;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    ...init,
    headers,
  });
  return parseJson<T>(response);
};

const fromCents = (amountCents: number) => amountCents / 100;

const toCents = (amount: unknown) => Math.round(Number(amount) * 100);

const mapCampaign = (campaign: ApiCampaign): Campaign => ({
  ...(campaign as unknown as Campaign),
  logoUrl: typeof campaign.logoUrl === "string" ? campaign.logoUrl : undefined,
  goalAmount: fromCents(campaign.goalAmountCents),
  suggestedAmounts: campaign.suggestedAmounts.map(fromCents),
});

const mapDonation = (donation: ApiDonation): Donation => ({
  ...(donation as unknown as Donation),
  campaignName:
    typeof donation.campaign?.name === "string"
      ? donation.campaign.name
      : undefined,
  amount: fromCents(donation.amountCents),
  maskedReceiptContact:
    typeof donation.receiptContactMasked === "string"
      ? donation.receiptContactMasked
      : undefined,
  receiptState: donation.receiptQueued ? "queued" : "not queued",
});

const mapDashboard = (dashboard: ApiDashboard): Dashboard => {
  const breakdown = dashboard.currencyBreakdown ?? {};
  return {
    totalRaisedEur: fromCents(dashboard.totalRaisedEur),
    successfulDonationCount: Number(dashboard.successfulDonationCount ?? 0),
    averageEurDonation: fromCents(dashboard.averageEurDonation),
    progressVsGoal: Math.round(Number(dashboard.progress ?? 0) * 100),
    currencyBreakdown: {
      EUR: fromCents(breakdown.EUR ?? 0),
      USD: fromCents(breakdown.USD ?? 0),
      GBP: fromCents(breakdown.GBP ?? 0),
    },
  };
};

const mapReconciliation = (row: ApiReconciliationRow): ReconciliationRow => ({
  ...(row as unknown as ReconciliationRow),
  id: String(row.id ?? row.donationId),
  campaignName: String(row.campaign ?? ""),
  amount: fromCents(row.amountCents),
});

const mapAudit = (row: ApiAuditRow): AuditRow => ({
  ...(row as unknown as AuditRow),
  actorName: row.user?.name ?? row.user?.email ?? "System",
  entityType: String(row.entity ?? ""),
});

const donationBody = (body: Json) => {
  const card = body.card as Json | null | undefined;
  const number = String(card?.number ?? "");
  return {
    ...body,
    amountCents: toCents(body.amount),
    amount: undefined,
    card:
      body.paymentMethod === "card"
        ? {
            holderName: String(card?.name ?? ""),
            token: `demo_${number.replace(/\D/g, "")}`,
            last4: number.replace(/\D/g, "").slice(-4),
          }
        : undefined,
  };
};

const campaignBody = (body: Json, withDefaults = false) => {
  const suggestedAmounts = Array.isArray(body.suggestedAmounts)
    ? body.suggestedAmounts.map(toCents)
    : [10, 25, 50].map(toCents);

  return {
    ...body,
    description: String(body.cause ?? body.name ?? "Campaign"),
    goalAmountCents: toCents(body.goalAmount),
    goalAmount: undefined,
    suggestedAmounts,
    startsAt: withDefaults ? new Date().toISOString() : undefined,
  };
};

const donationQuery = (filters: DonationFilters) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const amountKeys = [
    ["minAmount", "minAmountCents"],
    ["maxAmount", "maxAmountCents"],
  ];
  for (const pair of amountKeys) {
    const value = params.get(pair[0]);
    if (value) params.set(pair[1], String(toCents(value)));
    params.delete(pair[0]);
  }
  if (params.get("sort") === "amount") params.set("sort", "amountCents");
  if (params.has("direction")) {
    params.set("order", params.get("direction") ?? "desc");
    params.delete("direction");
  }
  for (const key of ["from", "to"]) {
    const value = params.get(key);
    if (value && !value.includes("T")) {
      params.set(key, new Date(`${value}T00:00:00`).toISOString());
    }
  }
  return params.toString();
};

export const api = {
  activeCampaigns: () =>
    request<ApiCampaign[]>("/api/campaigns/active").then((campaigns) =>
      campaigns.map(mapCampaign),
    ),
  createDonation: (body: Json) =>
    request<ApiDonation>("/api/donations", {
      method: "POST",
      body: JSON.stringify(donationBody(body)),
    }).then(mapDonation),
  donation: (id: string) =>
    request<ApiDonation>(`/api/donations/${id}`).then(mapDonation),
  login: (email: string, password: string) =>
    request<User>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () =>
    request<{ ok: boolean }>("/api/admin/logout", { method: "POST" }),
  me: () => request<User>("/api/admin/me"),
  dashboard: async (campaignId: string) => {
    const query = campaignId ? `?campaignId=${campaignId}` : "";
    const dashboard = await request<ApiDashboard>(
      `/api/admin/dashboard${query}`,
    );
    return mapDashboard(dashboard);
  },
  campaigns: () =>
    request<ApiCampaign[]>("/api/admin/campaigns").then((campaigns) =>
      campaigns.map(mapCampaign),
    ),
  createCampaign: (body: Json) =>
    request<ApiCampaign>("/api/admin/campaigns", {
      method: "POST",
      body: JSON.stringify(campaignBody(body, true)),
    }).then(mapCampaign),
  updateCampaign: (id: string, body: Json) =>
    request<ApiCampaign>(`/api/admin/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(campaignBody(body)),
    }).then(mapCampaign),
  archiveCampaign: (id: string) =>
    request<ApiCampaign>(`/api/admin/campaigns/${id}/archive`, {
      method: "POST",
    }).then(mapCampaign),
  deleteCampaign: (id: string) =>
    request<ApiCampaign>(`/api/admin/campaigns/${id}`, {
      method: "DELETE",
    }).then(mapCampaign),
  donations: (filters: DonationFilters) =>
    request<ApiDonation[]>(
      `/api/admin/donations?${donationQuery(filters)}`,
    ).then((donations) => donations.map(mapDonation)),
  exportUrl: (filters: DonationFilters) =>
    apiUrl(`/api/admin/donations/export.csv?${donationQuery(filters)}`),
  exportPdfUrl: (filters: DonationFilters) =>
    apiUrl(`/api/admin/donations/export.pdf?${donationQuery(filters)}`),
  reconciliation: () =>
    request<ApiReconciliationRow[]>("/api/admin/reconciliation").then((rows) =>
      rows.map(mapReconciliation),
    ),
  audit: () =>
    request<ApiAuditRow[]>("/api/admin/audit").then((rows) =>
      rows.map(mapAudit),
    ),
};
