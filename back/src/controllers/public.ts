import { donationInputSchema } from '../../shared/dto.js';
import { ok } from '../result.js';
import { listActiveCampaigns } from '../services/campaigns.js';
import { createDonation, dashboard, getDonation } from '../services/donations.js';
import { httpError, parseBody, type Context } from '../http.js';

export const health = () => ok({ ok: true });

export const activeCampaigns = async () => ok(await listActiveCampaigns());

export const campaignDashboard = async (id: string) => {
    const campaigns = await listActiveCampaigns();
    if (!campaigns.some((campaign) => campaign.id === id)) return httpError(404, 'Not found');
    return ok(await dashboard(id));
};

export const createDonationController = async (context: Context) => {
    const inputResult = await parseBody(context.request, donationInputSchema);
    if (!inputResult.ok) return inputResult;
    const input = inputResult.value;
    if (input.paymentMethod === 'card' && !input.card) {
        return httpError(400, 'Card payload is required');
    }

    const donation = await createDonation(context.requestId, input);
    return donation ? ok(donation) : httpError(400, 'Campaign is not active');
};

export const getDonationController = async (id: string) => {
    const donation = await getDonation(id);
    return donation ? ok(donation) : httpError(404, 'Not found');
};
