import { tx, type Lang } from './i18n';
import type { Currency, DonationStatus, Role } from './types';

export const currencies: Currency[] = ['EUR', 'USD', 'GBP'];

export const statuses: DonationStatus[] = ['pending', 'succeeded', 'declined', 'cancelled', 'failed'];

export const classNames = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(' ');

export const money = (amount: number, currency: Currency) =>
    new Intl.NumberFormat('en-MT', {
        style: 'currency',
        currency,
    }).format(amount);

export const formatDate = (date: string) =>
    new Intl.DateTimeFormat('en-MT', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(date));

export const canEditCampaigns = (role: Role) => role === 'volunteer' || role === 'charity_admin';

export const canArchiveCampaigns = (role: Role) => role === 'charity_admin';

export const canViewCampaigns = (role: Role) => role !== 'auditor';

export const canViewControls = (role: Role) => role !== 'volunteer';

export const enumLabel = (lang: Lang, group: string, value: string) => tx(lang, `${group}.${value}`, value);

export const roleLabel = (lang: Lang, role: Role) => enumLabel(lang, 'role', role);
