export type Currency = 'EUR' | 'USD' | 'GBP';
export type DonationStatus =
  | 'pending'
  | 'succeeded'
  | 'declined'
  | 'cancelled'
  | 'failed';
export type CampaignStatus = 'draft' | 'active' | 'ended' | 'archived';
export type Role = 'auditor' | 'volunteer' | 'charity_admin';

export interface Campaign {
  id: string;
  name: string;
  cause: string;
  status: CampaignStatus;
  color: string;
  logoUrl?: string;
  goalAmount: number;
  currency: Currency;
  suggestedAmounts: number[];
  startsAt?: string;
  endsAt?: string;
}

export interface Donation {
  id: string;
  createdAt: string;
  campaignId: string;
  campaignName?: string;
  amount: number;
  currency: Currency;
  paymentMethod: 'card' | 'tap';
  status: DonationStatus;
  mastercardTransactionId?: string;
  receiptChannel?: 'email' | 'sms' | 'none';
  maskedReceiptContact?: string;
  receiptState?: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface Dashboard {
  totalRaisedEur: number;
  successfulDonationCount: number;
  averageEurDonation: number;
  progressVsGoal: number;
  currencyBreakdown: Record<Currency, number>;
}

export interface ReconciliationRow {
  id: string;
  donationId: string;
  campaignName: string;
  amount: number;
  currency: Currency;
  donationStatus: DonationStatus;
  mastercardTransactionId: string;
  mastercardStatus: string;
  matchState: string;
  source: string;
  createdAt: string;
}

export interface AuditRow {
  id: string;
  createdAt: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
}
