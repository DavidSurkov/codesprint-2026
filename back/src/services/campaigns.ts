import { CampaignStatus, Currency } from '@prisma/client';
import type { campaignInputSchema, campaignPatchSchema } from '../../shared/dto.js';
import type { z } from 'zod';
import { prisma } from '../db/index.js';

type CampaignInput = z.infer<typeof campaignInputSchema>;
type CampaignPatch = z.infer<typeof campaignPatchSchema>;

export const publicCampaign = (campaign: {
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

export const listActiveCampaigns = async () => {
    const now = new Date();
    const campaigns = await prisma.campaign.findMany({
        where: {
            status: 'active',
            startsAt: { lte: now },
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
        orderBy: { createdAt: 'desc' },
    });
    return campaigns.map(publicCampaign);
};

export const listCampaigns = () => prisma.campaign.findMany({ orderBy: { createdAt: 'desc' } });

export const createCampaign = (input: CampaignInput) =>
    prisma.campaign.create({
        data: {
            ...input,
            currency: (input.currency ?? Currency.EUR) as Currency,
            status: (input.status ?? CampaignStatus.draft) as CampaignStatus,
            startsAt: new Date(input.startsAt),
            endsAt: input.endsAt ? new Date(input.endsAt) : null,
        },
    });

export const updateCampaign = (id: string, input: CampaignPatch) =>
    prisma.campaign.update({
        where: { id },
        data: {
            ...input,
            currency: input.currency as Currency | undefined,
            status: input.status as CampaignStatus | undefined,
            startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
            endsAt: input.endsAt ? new Date(input.endsAt) : input.endsAt,
        },
    });

export const archiveCampaign = (id: string) => prisma.campaign.update({ where: { id }, data: { status: 'archived' } });

export const deleteEmptyCampaign = async (id: string) => {
    const donations = await prisma.donation.count({ where: { campaignId: id } });
    if (donations) return null;
    return prisma.campaign.delete({ where: { id } });
};
