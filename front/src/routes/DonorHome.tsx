import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { t, type Lang } from '../i18n';
import type { Campaign, Currency } from '../types';
import { classNames, currencies, enumLabel, money } from '../utils';
import {
  Button,
  Card,
  Field,
  FieldError,
  IconAlert,
  IconCoins,
  IconReceipt,
  IconShield,
  IconTap,
  IconTarget,
  Select,
  Spinner,
  StatusBadge,
  TextInput,
} from '../components/ui';

export const DonorHome = ({ lang }: { lang: Lang }) => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [amount, setAmount] = useState('25');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'tap'>('tap');
  const [receiptChannel, setReceiptChannel] = useState<'email' | 'sms' | 'none'>(
    'email',
  );
  const [receiptContact, setReceiptContact] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    api
      .activeCampaigns()
      .then((next) => {
        if (!isMounted) return;
        setCampaigns(next);
        setCampaignId(next[0]?.id || '');
        setCurrency(next[0]?.currency || 'EUR');
        setAmount(String(next[0]?.suggestedAmounts[0] || 25));
      })
      .catch((requestError: Error) => setError(requestError.message));
    return () => {
      isMounted = false;
    };
  }, []);

  const campaign = campaigns.find((item) => item.id === campaignId) || null;
  const amountError = Number(amount) > 0 ? '' : t(lang, 'amountAboveZero');
  const receiptError =
    receiptChannel === 'none' || receiptContact
      ? ''
      : t(lang, 'receiptContactError');
  const cardDigits = cardNumber.replace(/\D/g, '');
  const cardError =
    paymentMethod === 'tap'
      ? ''
      : !cardName.trim()
        ? t(lang, 'nameOnCardError')
        : !/^\d{12,19}$/.test(cardDigits)
          ? t(lang, 'cardNumberError')
          : !/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)
            ? t(lang, 'cardExpiryError')
            : !/^\d{3,4}$/.test(cardCvc)
              ? t(lang, 'cardCvcError')
              : '';
  const canSubmit = campaign && !amountError && !receiptError && !cardError;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const donation = await api.createDonation({
        campaignId,
        amount: Number(amount),
        currency,
        paymentMethod,
        receipt: { channel: receiptChannel, contact: receiptContact },
        card:
          paymentMethod === 'card'
            ? { name: cardName, number: cardNumber, expiry: cardExpiry, cvc: cardCvc }
            : null,
      });
      navigate(`/donate/confirmation/${donation.id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : t(lang, 'donationFailed'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-10 lg:grid-cols-[1fr_440px]">
      <section className="animate-fade-in">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700 ring-1 ring-inset ring-brand-600/20">
          <IconTap className="h-3.5 w-3.5" />
          {t(lang, 'contactlessGiving')}
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          {t(lang, 'giveHeadline')}
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-600">
          {t(lang, 'giveIntro')}
        </p>

        {campaign ? (
          <Card className="mt-8 overflow-hidden p-0">
            <div
              className="h-2 w-full"
              style={{ backgroundColor: campaign.color }}
              aria-hidden="true"
            />
            <div className="p-6">
              <div className="flex items-center gap-4">
                {campaign.logoUrl ? (
                  <img
                    src={campaign.logoUrl}
                    alt=""
                    className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="flex h-16 w-16 items-center justify-center rounded-xl text-white shadow-inner"
                    style={{ backgroundColor: campaign.color }}
                  >
                    <IconTap className="h-7 w-7" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">
                      {campaign.name}
                    </h2>
                    <StatusBadge lang={lang} status={campaign.status} />
                  </div>
                  <p className="mt-0.5 text-slate-600">{campaign.cause}</p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <IconTarget className="h-4 w-4" />
                  {t(lang, 'fundraisingGoal')}
                </span>
                <span className="text-lg font-bold text-slate-900">
                  {money(campaign.goalAmount, campaign.currency)}
                </span>
              </div>
            </div>
          </Card>
        ) : (
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
            <IconAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{t(lang, 'noActiveCampaigns')}</p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <IconShield className="h-4 w-4 text-brand-600" />
            {t(lang, 'secureDemoCheckout')}
          </span>
          <span className="inline-flex items-center gap-2">
            <IconReceipt className="h-4 w-4 text-brand-600" />
            {t(lang, 'instantReceipt')}
          </span>
        </div>
      </section>

      <Card className="animate-scale-in p-6">
        <h2 className="text-xl font-bold text-slate-900">{t(lang, 'donate')}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {t(lang, 'completeForm')}
        </p>
        <form className="mt-6 grid gap-5" onSubmit={submit}>
          <Field label={t(lang, 'campaign')} htmlFor="donate-campaign">
            <Select
              id="donate-campaign"
              value={campaignId}
              onChange={(event) => setCampaignId(event.target.value)}
            >
              {campaigns.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t(lang, 'currency')} htmlFor="donate-currency">
            <Select
              id="donate-currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value as Currency)}
            >
              {currencies.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>

          <fieldset>
            <legend className="field-label">{t(lang, 'amount')}</legend>
            <div className="grid grid-cols-3 gap-2">
              {(campaign?.suggestedAmounts || [10, 25, 50]).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={classNames(
                    'focus-ring rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                    Number(amount) === item
                      ? 'border-brand-600 bg-brand-50 text-brand-800 ring-1 ring-brand-600/30'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
                  )}
                  onClick={() => setAmount(String(item))}
                >
                  {money(item, currency)}
                </button>
              ))}
            </div>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-semibold text-slate-500">
                {currency}
              </span>
              <TextInput
                className="pl-14"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                aria-invalid={Boolean(amountError)}
                aria-describedby={amountError ? 'amount-error' : undefined}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            {amountError && <FieldError id="amount-error" error={amountError} />}
          </fieldset>

          <fieldset>
            <legend className="field-label">{t(lang, 'payment')}</legend>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['tap', t(lang, 'tap')],
                ['card', t(lang, 'card')],
              ] as const).map(([value, label]) => (
                <label
                  key={value}
                  className={classNames(
                    'focus-ring flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                    paymentMethod === value
                      ? 'border-brand-600 bg-brand-50 text-brand-800 ring-1 ring-brand-600/30'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
                  )}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={paymentMethod === value}
                    onChange={() => setPaymentMethod(value)}
                  />
                  {value === 'tap' ? (
                    <IconTap className="h-4 w-4" />
                  ) : (
                    <IconCoins className="h-4 w-4" />
                  )}
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {paymentMethod === 'card' && (
            <div className="grid gap-4 rounded-xl bg-slate-50 p-4" aria-describedby="card-error">
              <Field label={t(lang, 'nameOnCard')} htmlFor="card-name">
                <TextInput
                  id="card-name"
                  value={cardName}
                  onChange={(event) => setCardName(event.target.value)}
                />
              </Field>
              <Field label={t(lang, 'cardNumber')} htmlFor="card-number">
                <TextInput
                  id="card-number"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t(lang, 'expiry')} htmlFor="card-expiry">
                  <TextInput
                    id="card-expiry"
                    placeholder={t(lang, 'expiryPlaceholder')}
                    value={cardExpiry}
                    onChange={(event) => setCardExpiry(event.target.value)}
                  />
                </Field>
                <Field label={t(lang, 'cvc')} htmlFor="card-cvc">
                  <TextInput
                    id="card-cvc"
                    inputMode="numeric"
                    placeholder="123"
                    value={cardCvc}
                    onChange={(event) => setCardCvc(event.target.value)}
                  />
                </Field>
              </div>
              {cardError && <FieldError id="card-error" error={cardError} />}
            </div>
          )}

          <fieldset>
            <legend className="field-label">{t(lang, 'receipt')}</legend>
            <div className="grid grid-cols-3 gap-2">
              {(['email', 'sms', 'none'] as const).map((item) => (
                <label
                  key={item}
                  className={classNames(
                    'focus-ring flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition',
                    receiptChannel === item
                      ? 'border-brand-600 bg-brand-50 text-brand-800 ring-1 ring-brand-600/30'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
                  )}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={receiptChannel === item}
                    onChange={() => setReceiptChannel(item)}
                  />
                  {enumLabel(lang, 'channel', item)}
                </label>
              ))}
            </div>
            {receiptChannel !== 'none' && (
              <TextInput
                className="mt-2"
                placeholder={
                  receiptChannel === 'sms' ? t(lang, 'phone') : t(lang, 'email')
                }
                value={receiptContact}
                aria-invalid={Boolean(receiptError)}
                aria-describedby={receiptError ? 'receipt-error' : undefined}
                onChange={(event) => setReceiptContact(event.target.value)}
              />
            )}
            {receiptError && (
              <FieldError id="receipt-error" error={receiptError} />
            )}
          </fieldset>

          <Button type="submit" disabled={!canSubmit || isSubmitting} fullWidth>
            {isSubmitting ? (
              <>
                <Spinner className="h-4 w-4" />
                {t(lang, 'sending')}
              </>
            ) : (
              t(lang, 'submit')
            )}
          </Button>
          <p className="min-h-5 text-sm text-red-700" aria-live="polite">
            {error}
          </p>
        </form>
      </Card>
    </main>
  );
};
