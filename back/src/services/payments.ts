import { randomUUID } from 'node:crypto';
import { MastercardSource, type DonationStatus } from '@prisma/client';
import type { DonationInput } from '../../shared/dto.js';
import { createLogger } from '../logger.js';
import { MastercardDonateApiError, createMastercardDonateServiceFromEnv } from './mastercard-donate.api.js';

const logger = createLogger('payments');

export type PaymentResult = {
    source: MastercardSource;
    status: DonationStatus;
    transactionId: string | null;
    correlationId: string;
    donorReference: string | null;
    enrollmentReference: string | null;
    errorCode: string | null;
    errorMessage: string | null;
};

const outcomeStatus = (): DonationStatus => {
    const outcome = process.env.DEMO_PAYMENT_OUTCOME;
    if (outcome === 'declined') return 'declined';
    if (outcome === 'cancelled') return 'cancelled';
    if (outcome === 'offline') return 'failed';
    return 'succeeded';
};

const findString = (value: unknown, keys: string[]): string | null => {
    if (!value || typeof value !== 'object') return null;

    for (const key of keys) {
        const found = (value as Record<string, unknown>)[key];
        if (typeof found === 'string') return found;
    }

    for (const found of Object.values(value)) {
        const nested = findString(found, keys);
        if (nested) return nested;
    }

    return null;
};

const mastercardDonationBody = (donationId: string, input: DonationInput) => ({
    externalDonationId: donationId,
    donation: {
        charityId: process.env.MASTERCARD_DONATE_CHARITY_ID,
        campaignId: input.campaignId,
        amount: input.amountCents / 100,
        currency: input.currency,
        donationType: 'ONE-TIME',
    },
    card: input.card && {
        token: input.card.token,
        last4: input.card.last4,
        cardholderName: input.card.holderName,
    },
});

const processCardDonation = async (
    requestId: string,
    donationId: string,
    input: DonationInput,
): Promise<PaymentResult> => {
    const startedAt = Date.now();
    const source = MastercardSource.donate_api;

    try {
        const mastercardDonate = createMastercardDonateServiceFromEnv();
        const response = await mastercardDonate.createGuestDonation(mastercardDonationBody(donationId, input));
        const transactionId = findString(response.data, ['transactionId', 'paymentId', 'id']);
        const donorReference = findString(response.data, ['donorId', 'donorReference']);

        logger.info('processed mastercard donation', {
            requestId,
            action: 'processDonation',
            correlationId: response.correlationId,
            donationId,
            status: 'succeeded',
            durationMs: Date.now() - startedAt,
        });

        return {
            source,
            status: 'succeeded',
            transactionId,
            correlationId: response.correlationId,
            donorReference,
            enrollmentReference: null,
            errorCode: null,
            errorMessage: null,
        };
    } catch (error) {
        const correlationId = error instanceof MastercardDonateApiError ? error.correlationId : randomUUID();
        const errorCode =
            error instanceof MastercardDonateApiError ? `MASTERCARD_${error.status}` : 'MASTERCARD_DONATE_UNAVAILABLE';
        const errorMessage = error instanceof Error ? error.message : 'Mastercard Donate failed';

        logger.warn('mastercard donation failed', {
            requestId,
            action: 'processDonation',
            correlationId,
            donationId,
            status: 'failed',
            durationMs: Date.now() - startedAt,
            errorCode,
        });

        return {
            source,
            status: 'failed',
            transactionId: null,
            correlationId,
            donorReference: null,
            enrollmentReference: null,
            errorCode,
            errorMessage,
        };
    }
};

export const processDonation = async (
    requestId: string,
    donationId: string,
    input: DonationInput,
): Promise<PaymentResult> => {
    if (input.paymentMethod === 'card') {
        return processCardDonation(requestId, donationId, input);
    }

    const startedAt = Date.now();
    const status = outcomeStatus();
    const correlationId = randomUUID();
    const transactionId = status === 'succeeded' ? `mc_${randomUUID()}` : null;
    const source = MastercardSource.simulated_tap;
    const errorCode = status === 'succeeded' ? null : status.toUpperCase();
    const errorMessage = status === 'succeeded' ? null : 'Demo payment outcome';

    const result = {
        source,
        status,
        transactionId,
        correlationId,
        donorReference: input.card ? `donor_${randomUUID()}` : null,
        enrollmentReference: input.card ? `enroll_${randomUUID()}` : null,
        errorCode,
        errorMessage,
    };

    logger.info('processed donation', {
        requestId,
        action: 'processDonation',
        correlationId,
        donationId,
        status,
        durationMs: Date.now() - startedAt,
        errorCode,
    });

    return result;
};
