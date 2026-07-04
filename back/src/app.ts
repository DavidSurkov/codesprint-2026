import {
    activeCampaigns,
    campaignDashboard,
    campaignTopDonations,
    createDonationController,
    getDonationController,
    health,
} from './controllers/public.js';
import { exportCsv, exportPdf } from './controllers/exports.js';
import { handleAdmin } from './controllers/admin.js';
import { httpError, type Context } from './http.js';

export const handle = async (context: Context) => {
    const { pathname } = context.url;
    const method = context.request.method;

    if (method === 'GET' && pathname === '/health') return health();
    if (method === 'GET' && pathname === '/api/campaigns/active') {
        return activeCampaigns();
    }
    const campaignDashboardMatch = pathname.match(/^\/api\/campaigns\/([^/]+)\/dashboard$/);
    if (method === 'GET' && campaignDashboardMatch) {
        return campaignDashboard(campaignDashboardMatch[1]);
    }
    const topDonationsMatch = pathname.match(/^\/api\/campaigns\/([^/]+)\/top-donations$/);
    if (method === 'GET' && topDonationsMatch) {
        return campaignTopDonations(topDonationsMatch[1]);
    }
    if (method === 'POST' && pathname === '/api/donations') {
        return createDonationController(context);
    }

    const donationMatch = pathname.match(/^\/api\/donations\/([^/]+)$/);
    if (method === 'GET' && donationMatch) {
        return getDonationController(donationMatch[1]);
    }

    if (pathname === '/api/admin/donations/export.csv') return exportCsv(context);
    if (pathname === '/api/admin/donations/export.pdf') return exportPdf(context);
    if (pathname.startsWith('/api/admin')) return handleAdmin(context);
    return httpError(404, 'Not found');
};
