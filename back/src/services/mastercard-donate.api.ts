import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const oauth = require('mastercard-oauth1-signer') as typeof import('mastercard-oauth1-signer');

type Query = Record<string, string | number | boolean | null | undefined>;
type Headers = Record<string, string>;

type TransformRequestBody = (args: { path: string; method: string; body: unknown }) => unknown | Promise<unknown>;

type TransformResponseBody = (args: { path: string; status: number; body: unknown }) => unknown | Promise<unknown>;

export type MastercardDonateServiceOptions = {
    consumerKey: string;
    signingKeyPem: string;
    baseUrl?: string;
    locale?: string;
    transformRequestBody?: TransformRequestBody;
    transformResponseBody?: TransformResponseBody;
};

export type MastercardDonateResponse<T = unknown> = {
    status: number;
    correlationId: string;
    headers: Headers;
    data: T;
};

export class MastercardDonateApiError extends Error {
    status: number;
    statusText: string;
    method: string;
    url: string;
    correlationId: string;
    body: unknown;

    constructor(args: {
        status: number;
        statusText: string;
        method: string;
        url: string;
        correlationId: string;
        body: unknown;
    }) {
        super(
            `Mastercard Donate API request failed: ${args.method} ${args.url} returned ${args.status} ${args.statusText}`,
        );
        this.name = 'MastercardDonateApiError';
        this.status = args.status;
        this.statusText = args.statusText;
        this.method = args.method;
        this.url = args.url;
        this.correlationId = args.correlationId;
        this.body = args.body;
    }
}

export class MastercardDonateConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MastercardDonateConfigError';
    }
}

export class MastercardDonateService {
    private readonly consumerKey: string;
    private readonly signingKeyPem: string;
    private readonly baseUrl: string;
    private readonly locale: string;
    private readonly transformRequestBody?: TransformRequestBody;
    private readonly transformResponseBody?: TransformResponseBody;

    constructor({
        consumerKey,
        signingKeyPem,
        baseUrl = 'https://sandbox.api.mastercard.com',
        locale = 'en-US',
        transformRequestBody,
        transformResponseBody,
    }: MastercardDonateServiceOptions) {
        if (!consumerKey) {
            throw new MastercardDonateConfigError('Mastercard Donate: consumerKey is required.');
        }
        if (!signingKeyPem) {
            throw new MastercardDonateConfigError('Mastercard Donate: signingKeyPem is required.');
        }

        this.consumerKey = consumerKey;
        this.signingKeyPem = signingKeyPem;
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.locale = locale;
        this.transformRequestBody = transformRequestBody;
        this.transformResponseBody = transformResponseBody;
    }

    createDonor(donor: object) {
        return this.request({
            method: 'POST',
            path: '/donations/donors',
            body: donor,
        });
    }

    getDonor(donorId: string) {
        return this.request({
            method: 'GET',
            path: `/donations/donors/${encodeURIComponent(donorId)}`,
        });
    }

    updateDonor(donorId: string, donor: object) {
        return this.request({
            method: 'PUT',
            path: `/donations/donors/${encodeURIComponent(donorId)}`,
            body: donor,
        });
    }

    deleteDonor(donorId: string) {
        return this.request({
            method: 'DELETE',
            path: `/donations/donors/${encodeURIComponent(donorId)}`,
        });
    }

    addCard(donorId: string, card: object) {
        return this.request({
            method: 'POST',
            path: `/donations/donors/${encodeURIComponent(donorId)}/cards`,
            body: card,
        });
    }

    listCards(donorId: string, pagination: Query = {}) {
        return this.request({
            method: 'GET',
            path: `/donations/donors/${encodeURIComponent(donorId)}/cards`,
            query: pagination,
        });
    }

    getCard(donorId: string, cardId: string) {
        return this.request({
            method: 'GET',
            path: `/donations/donors/${encodeURIComponent(donorId)}/cards/${encodeURIComponent(cardId)}`,
        });
    }

    deleteCard(donorId: string, cardId: string) {
        return this.request({
            method: 'DELETE',
            path: `/donations/donors/${encodeURIComponent(donorId)}/cards/${encodeURIComponent(cardId)}`,
        });
    }

    createGuestDonation(donation: object) {
        return this.request({
            method: 'POST',
            path: '/donations/guest-payments',
            body: donation,
        });
    }

    createOneTimeDonation(donation: object) {
        return this.request({
            method: 'POST',
            path: '/donations/payments',
            body: donation,
        });
    }

    createDonationSetup(donorId: string, setup: object) {
        return this.request({
            method: 'POST',
            path: `/donations/donors/${encodeURIComponent(donorId)}/donation-setups`,
            body: setup,
        });
    }

    listDonationSetups(donorId: string, pagination: Query = {}) {
        return this.request({
            method: 'GET',
            path: `/donations/donors/${encodeURIComponent(donorId)}/donation-setups`,
            query: pagination,
        });
    }

    getDonationSetup(donorId: string, donationSetupId: string) {
        return this.request({
            method: 'GET',
            path: `/donations/donors/${encodeURIComponent(donorId)}/donation-setups/${encodeURIComponent(donationSetupId)}`,
        });
    }

    updateDonationSetup(donorId: string, donationSetupId: string, setup: object) {
        return this.request({
            method: 'PUT',
            path: `/donations/donors/${encodeURIComponent(donorId)}/donation-setups/${encodeURIComponent(donationSetupId)}`,
            body: setup,
        });
    }

    deleteDonationSetup(donorId: string, donationSetupId: string) {
        return this.request({
            method: 'DELETE',
            path: `/donations/donors/${encodeURIComponent(donorId)}/donation-setups/${encodeURIComponent(donationSetupId)}`,
        });
    }

    getTransactionStatus(transactionId: string) {
        return this.request({
            method: 'GET',
            path: `/donations/transactions/${encodeURIComponent(transactionId)}/status`,
        });
    }

    getDonationHistory(donorId: string, query: Query = {}) {
        return this.request({
            method: 'GET',
            path: `/donations/donors/${encodeURIComponent(donorId)}/transactions`,
            query,
        });
    }

    getProgramHistory(programId: string, query: Query = {}) {
        return this.request({
            method: 'GET',
            path: `/donations/programs/${encodeURIComponent(programId)}/transactions`,
            query,
        });
    }

    async request({
        method,
        path,
        query,
        body,
        headers = {},
    }: {
        method: string;
        path: string;
        query?: Query;
        body?: unknown;
        headers?: Headers;
    }): Promise<MastercardDonateResponse> {
        const normalizedMethod = method.toUpperCase();
        const url = this.buildUrl(path, query);
        const transformedBody =
            body === undefined
                ? undefined
                : await this.transformRequest({
                      path,
                      method: normalizedMethod,
                      body,
                  });
        const payload = transformedBody === undefined ? null : JSON.stringify(transformedBody);
        const authorization = oauth.getAuthorizationHeader(
            url.toString(),
            normalizedMethod,
            payload,
            this.consumerKey,
            this.signingKeyPem,
        );
        const correlationId = randomUUID();
        const response = await fetch(url, {
            method: normalizedMethod,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Openapi-Locale': this.locale,
                'X-Correlation-Id': correlationId,
                Authorization: authorization,
                ...headers,
            },
            body: payload ?? undefined,
        });
        const rawBody = await this.readResponse(response);
        const responseBody = await this.transformResponse({
            path,
            status: response.status,
            body: rawBody,
        });
        const responseCorrelationId = response.headers.get('x-correlation-id') ?? correlationId;

        if (!response.ok) {
            throw new MastercardDonateApiError({
                status: response.status,
                statusText: response.statusText,
                method: normalizedMethod,
                url: url.toString(),
                correlationId: responseCorrelationId,
                body: responseBody,
            });
        }

        return {
            status: response.status,
            correlationId: responseCorrelationId,
            headers: Object.fromEntries(response.headers.entries()),
            data: responseBody,
        };
    }

    private buildUrl(path: string, query: Query = {}) {
        const url = new URL(path, `${this.baseUrl}/`);

        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && value !== null) {
                url.searchParams.set(key, String(value));
            }
        }

        return url;
    }

    private async readResponse(response: Response) {
        if (response.status === 204) return null;
        const text = await response.text();
        if (!text) return null;

        try {
            return JSON.parse(text) as unknown;
        } catch {
            return text;
        }
    }

    private transformRequest(args: { path: string; method: string; body: unknown }) {
        return this.transformRequestBody ? this.transformRequestBody(args) : args.body;
    }

    private transformResponse(args: { path: string; status: number; body: unknown }) {
        return this.transformResponseBody ? this.transformResponseBody(args) : args.body;
    }
}

export const createMastercardDonateServiceFromEnv = () => {
    const consumerKey = process.env.MASTERCARD_CONSUMER_KEY;
    const signingKeyPath = process.env.MASTERCARD_SIGNING_KEY_PATH;
    const signingKeyPem = process.env.MASTERCARD_SIGNING_KEY_PEM;

    if (!consumerKey) {
        throw new MastercardDonateConfigError('MASTERCARD_CONSUMER_KEY is required.');
    }
    if (!signingKeyPem && !signingKeyPath) {
        throw new MastercardDonateConfigError('MASTERCARD_SIGNING_KEY_PEM or MASTERCARD_SIGNING_KEY_PATH is required.');
    }

    return new MastercardDonateService({
        consumerKey,
        signingKeyPem: signingKeyPem ?? readFileSync(signingKeyPath as string, 'utf8'),
        baseUrl: process.env.MASTERCARD_DONATE_BASE_URL,
        locale: process.env.MASTERCARD_DONATE_LOCALE,
    });
};
