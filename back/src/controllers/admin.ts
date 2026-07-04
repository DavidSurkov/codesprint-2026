import {
  campaignInputSchema,
  campaignPatchSchema,
  donationQuerySchema,
  loginSchema,
} from '../../shared/dto.js';
import {
  clearSessionCookie,
  hasRole,
  verifyPassword,
} from '../auth.js';
import {
  httpError,
  parseBody,
  requireOrigin,
  type Context,
} from '../http.js';
import { ok } from '../result.js';
import {
  createAdminSession,
  deleteAdminSession,
  getRequestUser,
  getUserByEmail,
  listAuditLogs,
} from '../services/admin.js';
import { audit } from '../services/audit.js';
import {
  archiveCampaign,
  createCampaign,
  deleteEmptyCampaign,
  listCampaigns,
  updateCampaign,
} from '../services/campaigns.js';
import {
  dashboard,
  listDonations,
  reconciliation,
} from '../services/donations.js';

const requireUser = async (context: Context) => {
  const user = await getRequestUser(context.request);
  return user ? ok(user) : httpError(401, 'Unauthorized');
};

export const handleAdmin = async (context: Context) => {
  const originResult = requireOrigin(context);
  if (originResult && !originResult.ok) return originResult;
  const { pathname } = context.url;
  const method = context.request.method;

  if (method === 'POST' && pathname === '/api/admin/login') {
    const inputResult = await parseBody(context.request, loginSchema);
    if (!inputResult.ok) return inputResult;
    const input = inputResult.value;
    const user = await getUserByEmail(input.email);
    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      return httpError(401, 'Invalid email or password');
    }
    await createAdminSession(context.response, user.id);
    await audit(context.requestId, 'admin_login', 'user', user.id, user.id);
    return ok({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  }

  const userResult = await requireUser(context);
  if (!userResult.ok) return userResult;
  const user = userResult.value;

  if (method === 'POST' && pathname === '/api/admin/logout') {
    await deleteAdminSession(context.request);
    clearSessionCookie(context.response);
    await audit(context.requestId, 'admin_logout', 'user', user.id, user.id);
    return ok({ ok: true });
  }

  if (method === 'GET' && pathname === '/api/admin/me') {
    return ok({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  }

  if (method === 'GET' && pathname === '/api/admin/campaigns') {
    return ok(await listCampaigns());
  }

  if (method === 'POST' && pathname === '/api/admin/campaigns') {
    if (!hasRole(user, 'volunteer')) return httpError(403, 'Forbidden');
    const inputResult = await parseBody(context.request, campaignInputSchema);
    if (!inputResult.ok) return inputResult;
    const campaign = await createCampaign(inputResult.value);
    await audit(
      context.requestId,
      'campaign_created',
      'campaign',
      campaign.id,
      user.id,
    );
    return ok(campaign);
  }

  const campaignMatch = pathname.match(/^\/api\/admin\/campaigns\/([^/]+)$/);
  if (method === 'PATCH' && campaignMatch) {
    if (!hasRole(user, 'volunteer')) return httpError(403, 'Forbidden');
    const inputResult = await parseBody(context.request, campaignPatchSchema);
    if (!inputResult.ok) return inputResult;
    const campaign = await updateCampaign(campaignMatch[1], inputResult.value);
    await audit(
      context.requestId,
      'campaign_updated',
      'campaign',
      campaign.id,
      user.id,
    );
    return ok(campaign);
  }

  const archiveMatch = pathname.match(
    /^\/api\/admin\/campaigns\/([^/]+)\/archive$/,
  );
  if (method === 'POST' && archiveMatch) {
    if (!hasRole(user, 'charity_admin')) return httpError(403, 'Forbidden');
    const campaign = await archiveCampaign(archiveMatch[1]);
    await audit(
      context.requestId,
      'campaign_archived',
      'campaign',
      campaign.id,
      user.id,
    );
    return ok(campaign);
  }

  if (method === 'DELETE' && campaignMatch) {
    if (!hasRole(user, 'charity_admin')) return httpError(403, 'Forbidden');
    const campaign = await deleteEmptyCampaign(campaignMatch[1]);
    if (!campaign) {
      return httpError(409, 'Campaign has donations; archive it instead');
    }
    await audit(
      context.requestId,
      'campaign_deleted',
      'campaign',
      campaign.id,
      user.id,
    );
    return ok(campaign);
  }

  if (method === 'GET' && pathname === '/api/admin/dashboard') {
    const campaignId = context.url.searchParams.get('campaignId') ?? undefined;
    return ok(await dashboard(campaignId));
  }
  if (method === 'GET' && pathname === '/api/admin/donations') {
    const parsed = donationQuerySchema.safeParse(
      Object.fromEntries(context.url.searchParams),
    );
    if (!parsed.success) return httpError(400, parsed.error.message);
    return ok(await listDonations(parsed.data));
  }
  if (method === 'GET' && pathname === '/api/admin/reconciliation') {
    await audit(
      context.requestId,
      'reconciliation_viewed',
      'mastercard_event',
      null,
      user.id,
    );
    return ok(await reconciliation());
  }
  if (method === 'GET' && pathname === '/api/admin/audit') {
    return ok(await listAuditLogs());
  }

  return httpError(404, 'Not found');
};
