import { randomUUID } from 'node:crypto';
import { MastercardSource, type DonationStatus } from '@prisma/client';
import type { DonationInput } from '../../shared/dto.js';
import { createLogger } from '../logger.js';

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

export const processDonation = async (
    requestId: string,
    donationId: string,
    input: DonationInput,
): Promise<PaymentResult> => {
    const startedAt = Date.now();
    const status = outcomeStatus();
    const correlationId = randomUUID();
    const transactionId = status === 'succeeded' ? `mc_${randomUUID()}` : null;
    const source = input.paymentMethod === 'tap' ? MastercardSource.simulated_tap : MastercardSource.donate_api;
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
