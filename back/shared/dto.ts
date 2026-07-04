import { z } from 'zod';

export const roles = ['auditor', 'volunteer', 'charity_admin'] as const;
export const currencies = ['EUR', 'USD', 'GBP'] as const;
export const campaignStatuses = ['draft', 'active', 'ended', 'archived'] as const;
export const donationStatuses = ['pending', 'succeeded', 'declined', 'cancelled', 'failed'] as const;
export const paymentMethods = ['card', 'tap'] as const;
export const receiptChannels = ['email', 'sms', 'none'] as const;

export const roleSchema = z.enum(roles);
export const currencySchema = z.enum(currencies);
export const campaignStatusSchema = z.enum(campaignStatuses);
export const donationStatusSchema = z.enum(donationStatuses);
export const paymentMethodSchema = z.enum(paymentMethods);
export const receiptChannelSchema = z.enum(receiptChannels);

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
});

export const campaignInputSchema = z.object({
    name: z.string().min(2).max(120),
    cause: z.string().min(2).max(160),
    description: z.string().min(2).max(2000),
    logoUrl: z.string().url().nullable().optional(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    goalAmountCents: z.number().int().positive(),
    currency: currencySchema.default('EUR'),
    suggestedAmounts: z.array(z.number().int().positive()).min(1).max(8),
    status: campaignStatusSchema.default('draft'),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime().nullable().optional(),
});

export const campaignPatchSchema = campaignInputSchema.partial();

export const donationInputSchema = z.object({
    campaignId: z.string().uuid(),
    amountCents: z.number().int().min(100).max(1000000),
    currency: currencySchema,
    paymentMethod: paymentMethodSchema,
    receipt: z.object({
        channel: receiptChannelSchema,
        contact: z.string().max(200).optional(),
    }),
    card: z
        .object({
            holderName: z.string().min(2).max(120),
            token: z.string().min(6).max(200),
            last4: z.string().regex(/^[0-9]{4}$/),
        })
        .optional(),
});

export const donationQuerySchema = z.object({
    campaignId: z.string().uuid().optional(),
    status: donationStatusSchema.optional(),
    currency: currencySchema.optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    minAmountCents: z.coerce.number().int().positive().optional(),
    maxAmountCents: z.coerce.number().int().positive().optional(),
    sort: z.enum(['createdAt', 'amountCents', 'status']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
});

export type Role = (typeof roles)[number];
export type DonationInput = z.infer<typeof donationInputSchema>;
