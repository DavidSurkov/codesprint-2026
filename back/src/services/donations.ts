import type { DonationStatus, Prisma } from '@prisma/client';
import type { DonationInput } from '../../shared/dto.js';
import type { donationQuerySchema } from '../../shared/dto.js';
import { prisma } from '../db/index.js';
import { processDonation } from './payments.js';
import { audit } from './audit.js';

const eurRate: Record<string, number> = {
    EUR: 1,
    USD: 0.92,
    GBP: 1.17,
};

type DonationQuery = ReturnType<typeof donationQuerySchema.parse>;

const receiptMask = (contact: string | undefined, channel: string) => {
    if (!contact || channel === 'none') return null;
    if (channel === 'email') {
        const [name, domain] = contact.split('@');
        if (!domain) return '***';
        return `${name.slice(0, 2)}***@${domain}`;
    }
    return `${contact.slice(0, 2)}***${contact.slice(-2)}`;
};

const toEurCents = (amountCents: number, currency: string) => Math.round(amountCents * (eurRate[currency] ?? 1));

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

export const createDonation = async (requestId: string, input: DonationInput) => {
    const campaign = await prisma.campaign.findUnique({
        where: { id: input.campaignId },
    });
    const now = new Date();
    if (
        !campaign ||
        campaign.status !== 'active' ||
        campaign.startsAt > now ||
        (campaign.endsAt && campaign.endsAt < now)
    ) {
        return null;
    }

    const donation = await prisma.donation.create({
        data: {
            campaignId: input.campaignId,
            amountCents: input.amountCents,
            currency: input.currency,
            paymentMethod: input.paymentMethod,
            receiptChannel: input.receipt.channel,
            receiptContactMasked: receiptMask(input.receipt.contact, input.receipt.channel),
            receiptQueued: input.receipt.channel !== 'none',
        },
    });
    const payment = await processDonation(requestId, donation.id, input);

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
    await audit(requestId, 'donation_created', 'donation', updated.id, null, {
        campaignId: updated.campaignId,
        amountCents: updated.amountCents,
        currency: updated.currency,
        status: updated.status,
    });

    return updated;
};

export const listDonations = (query: DonationQuery) =>
    prisma.donation.findMany({
        where: donationWhere(query),
        orderBy: { [query.sort]: query.order },
        include: { campaign: true, mastercardEvents: true },
    });

export const getDonation = (id: string) =>
    prisma.donation.findUnique({
        where: { id },
        include: { campaign: true },
    });

export const dashboard = async (campaignId?: string) => {
    const where = { status: 'succeeded' as DonationStatus, campaignId };
    const donations = await prisma.donation.findMany({
        where,
        include: { campaign: true },
    });
    const totalRaisedEur = donations.reduce(
        (sum, donation) => sum + toEurCents(donation.amountCents, donation.currency),
        0,
    );
    const currencyBreakdown = donations.reduce<Record<string, number>>((sum, donation) => {
        sum[donation.currency] = (sum[donation.currency] ?? 0) + donation.amountCents;
        return sum;
    }, {});
    const campaigns = new Map(donations.map((donation) => [donation.campaign.id, donation.campaign]));
    const goalAmountCents = [...campaigns.values()].reduce(
        (sum, campaign) => sum + toEurCents(campaign.goalAmountCents, campaign.currency),
        0,
    );

    return {
        totalRaisedEur,
        successfulDonationCount: donations.length,
        averageEurDonation: donations.length ? Math.round(totalRaisedEur / donations.length) : 0,
        goalAmountCents,
        progress: goalAmountCents ? totalRaisedEur / goalAmountCents : 0,
        currencyBreakdown,
    };
};

export const reconciliation = async () => {
    const donations = await prisma.donation.findMany({
        include: {
            campaign: true,
            mastercardEvents: { orderBy: { processedAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
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
            matchState: event?.status === donation.status ? 'matched' : 'needs_review',
            source: event?.source ?? null,
            createdAt: donation.createdAt,
        };
    });
};
