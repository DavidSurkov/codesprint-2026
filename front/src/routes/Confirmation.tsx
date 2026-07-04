import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { t, type Lang } from '../i18n';
import type { Donation } from '../types';
import { enumLabel, formatDate, money } from '../utils';
import {
  Button,
  Card,
  IconAlert,
  IconCheckCircle,
  IconReceipt,
  linkButtonClass,
  Spinner,
  StatusBadge,
} from '../components/ui';

export const Confirmation = ({ lang }: { lang: Lang }) => {
  const { id = '' } = useParams();
  const [donation, setDonation] = useState<Donation | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .donation(id)
      .then(setDonation)
      .catch((requestError: Error) => setError(requestError.message));
  }, [id]);

  const details: [string, React.ReactNode][] = donation
    ? [
        [t(lang, 'donationId'), <span className="font-mono text-sm">{donation.id}</span>],
        [t(lang, 'status'), <StatusBadge lang={lang} status={donation.status} />],
        [t(lang, 'amount'), money(donation.amount, donation.currency)],
        [t(lang, 'campaign'), donation.campaignName || donation.campaignId],
        [t(lang, 'date'), formatDate(donation.createdAt)],
        [
          t(lang, 'payment'),
          <span>{enumLabel(lang, 'payment', donation.paymentMethod)}</span>,
        ],
        [
          t(lang, 'receipt'),
          <>
            {enumLabel(
              lang,
              donation.receiptState ? 'status' : 'channel',
              donation.receiptState || donation.receiptChannel || 'none',
            )}
            {donation.maskedReceiptContact
              ? ` · ${donation.maskedReceiptContact}`
              : ''}
          </>,
        ],
        ...(donation.mastercardTransactionId
          ? ([
              [
                t(lang, 'mastercardId'),
                <span className="font-mono text-sm">
                  {donation.mastercardTransactionId}
                </span>,
              ],
            ] as [string, React.ReactNode][])
          : []),
      ]
    : [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Card className="animate-scale-in overflow-hidden p-0">
        <div className="flex flex-col items-center border-b border-slate-100 bg-gradient-to-b from-brand-50 to-white px-6 py-8 text-center">
          {error ? (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
              <IconAlert className="h-7 w-7" />
            </span>
          ) : donation ? (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <IconCheckCircle className="h-8 w-8" />
            </span>
          ) : (
            <Spinner className="h-10 w-10 text-brand-600" />
          )}
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900">
            {t(lang, 'confirmation')}
          </h1>
          <p className="mt-1 text-slate-600" aria-live="polite">
            {error || (donation ? t(lang, 'donated') : t(lang, 'loading'))}
          </p>
        </div>

        {donation && (
          <dl className="grid gap-px bg-slate-100 sm:grid-cols-2">
            {details.map(([label, value], index) => (
              <div key={index} className="bg-white px-6 py-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </dt>
                <dd className="mt-1 text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="flex flex-wrap items-center gap-3 px-6 py-5">
          <Link className={linkButtonClass} to="/">
            {t(lang, 'makeAnotherDonation')}
          </Link>
          {donation?.receiptState === 'queued' && (
            <Button variant="secondary" onClick={() => window.print()}>
              <IconReceipt className="h-4 w-4" />
              {t(lang, 'printReceipt')}
            </Button>
          )}
        </div>
      </Card>
    </main>
  );
};
