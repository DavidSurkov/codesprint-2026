import { useEffect, useState } from 'react';
import {
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { api } from './api';
import { getInitialLang, t, type Lang } from './i18n';
import type {
  AuditRow,
  Campaign,
  Currency,
  Dashboard,
  Donation,
  DonationStatus,
  ReconciliationRow,
  Role,
  User,
} from './types';

const currencies: Currency[] = ['EUR', 'USD', 'GBP'];
const statuses: DonationStatus[] = [
  'pending',
  'succeeded',
  'declined',
  'cancelled',
  'failed',
];

const emptyDashboard: Dashboard = {
  totalRaisedEur: 0,
  successfulDonationCount: 0,
  averageEurDonation: 0,
  progressVsGoal: 0,
  currencyBreakdown: { EUR: 0, USD: 0, GBP: 0 },
};

const classNames = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(' ');

const money = (amount: number, currency: Currency) =>
  new Intl.NumberFormat('en-MT', {
    style: 'currency',
    currency,
  }).format(amount);

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-MT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));

const canEditCampaigns = (role: Role) =>
  role === 'volunteer' || role === 'charity_admin';

const canArchiveCampaigns = (role: Role) => role === 'charity_admin';

const canViewCampaigns = (role: Role) => role !== 'auditor';

const canViewControls = (role: Role) => role !== 'volunteer';

const roleLabel = (role: Role) =>
  role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const useLocalBoolean = (key: string) => {
  const [value, setValue] = useState(() => localStorage.getItem(key) === '1');

  const update = (next: boolean) => {
    localStorage.setItem(key, next ? '1' : '0');
    setValue(next);
  };

  return [value, update] as const;
};

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

type IconProps = { className?: string };

const Svg = ({
  className,
  children,
}: IconProps & { children: React.ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    {children}
  </svg>
);

const IconTap = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M8 11V6a2 2 0 1 1 4 0v5" />
    <path d="M12 11V4.5a2 2 0 1 1 4 0V11" />
    <path d="M16 11V7a2 2 0 1 1 4 0v7a6 6 0 0 1-6 6h-2.5a6 6 0 0 1-4.9-2.5l-2.2-3.1a2 2 0 0 1 3.2-2.4L8 12" />
  </Svg>
);

const IconAlert = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Svg>
);

const IconCheckCircle = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
    <path d="m9 11 3 3L22 4" />
  </Svg>
);

const IconGlobe = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z" />
  </Svg>
);

const IconCoins = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="8" cy="8" r="5" />
    <path d="M18.1 5.3a5 5 0 0 1 0 13.4" />
    <path d="M7 15.3A5 5 0 0 0 16 19" />
  </Svg>
);

const IconReceipt = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z" />
    <path d="M8 8h8" />
    <path d="M8 12h8" />
  </Svg>
);

const IconTrend = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M3 3v18h18" />
    <path d="m7 14 3-3 3 3 4-5" />
  </Svg>
);

const IconTarget = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </Svg>
);

const IconChart = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M3 3v18h18" />
    <rect x="7" y="11" width="3" height="6" rx="1" />
    <rect x="13" y="7" width="3" height="10" rx="1" />
  </Svg>
);

const IconList = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M8 6h13" />
    <path d="M8 12h13" />
    <path d="M8 18h13" />
    <path d="M3 6h.01M3 12h.01M3 18h.01" />
  </Svg>
);

const IconScale = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 3v18" />
    <path d="M7 21h10" />
    <path d="M5 7h14" />
    <path d="m5 7-2.5 5a3 3 0 0 0 5 0Z" />
    <path d="m19 7-2.5 5a3 3 0 0 0 5 0Z" />
  </Svg>
);

const IconShield = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 3 5 6v6c0 4.4 3 7.5 7 9 4-1.5 7-4.6 7-9V6Z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);

const Spinner = ({ className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    className={classNames('animate-spin', className)}
    style={{ animation: 'spin 0.7s linear infinite' }}
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="3"
      className="opacity-25"
    />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Presentational primitives                                           */
/* ------------------------------------------------------------------ */

const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={classNames('surface', className)}>{children}</div>;

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-700 text-white shadow-sm hover:bg-brand-800 active:bg-brand-900',
  secondary:
    'border border-slate-300 bg-white text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  danger:
    'border border-red-200 bg-white text-red-700 shadow-sm hover:border-red-300 hover:bg-red-50',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
};

const Button = ({
  children,
  type = 'button',
  disabled = false,
  onClick,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: {
  children: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}) => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    className={classNames(
      'focus-ring inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
      buttonSizes[size],
      buttonVariants[variant],
      fullWidth && 'w-full',
      className,
    )}
  >
    {children}
  </button>
);

const linkButtonClass =
  'focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800';

type Tone = 'brand' | 'green' | 'amber' | 'red' | 'slate' | 'blue';

const toneStyles: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
};

const Badge = ({
  tone = 'slate',
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) => (
  <span
    className={classNames(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
      toneStyles[tone],
    )}
  >
    {children}
  </span>
);

const statusTone = (status: string): Tone => {
  switch (status) {
    case 'succeeded':
    case 'active':
    case 'matched':
      return 'green';
    case 'pending':
    case 'draft':
      return 'amber';
    case 'declined':
    case 'failed':
      return 'red';
    default:
      return 'slate';
  }
};

const StatusBadge = ({ status }: { status: string }) => (
  <Badge tone={statusTone(status)}>
    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
    {status}
  </Badge>
);

const ErrorAlert = ({ error }: { error: string }) => (
  <div aria-live="polite">
    {error && (
      <div
        role="alert"
        className="animate-fade-in mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    )}
  </div>
);

const FieldError = ({ id, error }: { id: string; error: string }) => (
  <p id={id} className="mt-1.5 flex items-center gap-1.5 text-sm text-red-700">
    <IconAlert className="h-3.5 w-3.5 shrink-0" />
    {error}
  </p>
);

const Field = ({
  label,
  htmlFor,
  children,
}: {
  label: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
}) => (
  <div>
    <label htmlFor={htmlFor} className="field-label">
      {label}
    </label>
    {children}
  </div>
);

const Toggle = ({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) => (
  <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm font-medium text-slate-600">
    <span className="relative inline-flex h-5 w-9 shrink-0 items-center">
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="absolute inset-0 rounded-full bg-slate-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-700 peer-focus-visible:ring-offset-2" />
      <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
    </span>
    {label}
  </label>
);

const PageHeading = ({
  title,
  actions,
}: {
  title: React.ReactNode;
  actions?: React.ReactNode;
}) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
    {actions}
  </div>
);

const EmptyRow = ({ colSpan, label }: { colSpan: number; label: string }) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-slate-500">
      {label}
    </td>
  </tr>
);

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

const Shell = ({
  children,
  lang,
  setLang,
}: {
  children: React.ReactNode;
  lang: Lang;
  setLang: (lang: Lang) => void;
}) => {
  const [isLargeText, setLargeText] = useLocalBoolean('tap_large_text');
  const [isHighContrast, setHighContrast] = useLocalBoolean(
    'tap_high_contrast',
  );

  useEffect(() => {
    document.documentElement.lang = lang;
    document.body.classList.toggle('large-text', isLargeText);
    document.body.classList.toggle('high-contrast', isHighContrast);
  }, [isHighContrast, isLargeText, lang]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
          <Link
            className="focus-ring group flex items-center gap-2.5 rounded-xl"
            to="/"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm transition group-hover:bg-brand-800">
              <IconTap className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              Tap For Good
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <IconGlobe className="h-4 w-4 text-slate-400" />
              <span className="sr-only sm:not-sr-only">{t(lang, 'language')}</span>
              <select
                className="focus-ring rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium shadow-sm hover:border-slate-400"
                value={lang}
                onChange={(event) => setLang(event.target.value as Lang)}
              >
                <option value="en">English</option>
                <option value="mt">Malti</option>
              </select>
            </label>
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            <Toggle
              checked={isLargeText}
              onChange={setLargeText}
              label={t(lang, 'largeText')}
            />
            <Toggle
              checked={isHighContrast}
              onChange={setHighContrast}
              label={t(lang, 'highContrast')}
            />
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            <Link
              to="/admin"
              className="focus-ring rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              {t(lang, 'admin')}
            </Link>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="no-print mt-auto border-t border-slate-200/80 py-6 text-center text-sm text-slate-500">
        Tap For Good · Contactless giving demo
      </footer>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Donor home                                                          */
/* ------------------------------------------------------------------ */

const DonorHome = ({ lang }: { lang: Lang }) => {
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
  const amountError = Number(amount) > 0 ? '' : 'Enter an amount above zero.';
  const receiptError =
    receiptChannel === 'none' || receiptContact ? '' : 'Receipt contact needed.';
  const cardDigits = cardNumber.replace(/\D/g, '');
  const cardError =
    paymentMethod === 'tap'
      ? ''
      : !cardName.trim()
        ? 'Name on card needed.'
        : !/^\d{12,19}$/.test(cardDigits)
          ? 'Card number must be 12 to 19 digits.'
          : !/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)
            ? 'Expiry must use MM/YY.'
            : !/^\d{3,4}$/.test(cardCvc)
              ? 'CVC must be 3 or 4 digits.'
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
        requestError instanceof Error ? requestError.message : 'Donation failed.',
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
          Contactless giving
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          Give in a single tap.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-600">
          Choose a campaign, set an amount, and complete a demo card or tap
          donation in seconds.
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
                    <StatusBadge status={campaign.status} />
                  </div>
                  <p className="mt-0.5 text-slate-600">{campaign.cause}</p>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-500">
                  <IconTarget className="h-4 w-4" />
                  Fundraising goal
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
            <p>No active campaigns are available.</p>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <IconShield className="h-4 w-4 text-brand-600" />
            Secure demo checkout
          </span>
          <span className="inline-flex items-center gap-2">
            <IconReceipt className="h-4 w-4 text-brand-600" />
            Instant receipt
          </span>
        </div>
      </section>

      <Card className="animate-scale-in p-6">
        <h2 className="text-xl font-bold text-slate-900">{t(lang, 'donate')}</h2>
        <p className="mt-1 text-sm text-slate-500">
          Complete the form below to give.
        </p>
        <form className="mt-6 grid gap-5" onSubmit={submit}>
          <Field label={t(lang, 'campaign')} htmlFor="donate-campaign">
            <select
              id="donate-campaign"
              className="field-input"
              value={campaignId}
              onChange={(event) => setCampaignId(event.target.value)}
            >
              {campaigns.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t(lang, 'currency')} htmlFor="donate-currency">
            <select
              id="donate-currency"
              className="field-input"
              value={currency}
              onChange={(event) => setCurrency(event.target.value as Currency)}
            >
              {currencies.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
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
              <input
                className="field-input pl-14"
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
            <legend className="field-label">Payment</legend>
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
              <Field label="Name on card" htmlFor="card-name">
                <input
                  id="card-name"
                  className="field-input"
                  value={cardName}
                  onChange={(event) => setCardName(event.target.value)}
                />
              </Field>
              <Field label="Card number" htmlFor="card-number">
                <input
                  id="card-number"
                  className="field-input"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Expiry" htmlFor="card-expiry">
                  <input
                    id="card-expiry"
                    className="field-input"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(event) => setCardExpiry(event.target.value)}
                  />
                </Field>
                <Field label="CVC" htmlFor="card-cvc">
                  <input
                    id="card-cvc"
                    className="field-input"
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
                  {item}
                </label>
              ))}
            </div>
            {receiptChannel !== 'none' && (
              <input
                className="field-input mt-2"
                placeholder={receiptChannel === 'sms' ? t(lang, 'phone') : t(lang, 'email')}
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
                Sending...
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

/* ------------------------------------------------------------------ */
/* Confirmation                                                        */
/* ------------------------------------------------------------------ */

const Confirmation = ({ lang }: { lang: Lang }) => {
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
        ['Donation ID', <span className="font-mono text-sm">{donation.id}</span>],
        ['Status', <StatusBadge status={donation.status} />],
        [t(lang, 'amount'), money(donation.amount, donation.currency)],
        [t(lang, 'campaign'), donation.campaignName || donation.campaignId],
        ['Date', formatDate(donation.createdAt)],
        ['Payment', <span className="capitalize">{donation.paymentMethod}</span>],
        [
          t(lang, 'receipt'),
          `${donation.receiptState || donation.receiptChannel || 'none'}${
            donation.maskedReceiptContact
              ? ` · ${donation.maskedReceiptContact}`
              : ''
          }`,
        ],
        ...(donation.mastercardTransactionId
          ? ([
              [
                'Mastercard ID',
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
            {error || (donation ? t(lang, 'donated') : 'Loading...')}
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
            Make another donation
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

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

const Login = ({ lang }: { lang: Lang }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    try {
      await api.login(email, password);
      navigate('/admin');
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Login failed.',
      );
    }
  };

  return (
    <main className="mx-auto flex max-w-md flex-col px-4 py-14">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-sm">
          <IconTap className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900">
          {t(lang, 'login')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Sign in to the {t(lang, 'admin').toLowerCase()} console.
        </p>
      </div>
      <Card className="animate-scale-in p-6">
        <form className="grid gap-4" onSubmit={submit}>
          <Field label={t(lang, 'email')} htmlFor="login-email">
            <input
              id="login-email"
              className="field-input"
              type="email"
              value={email}
              required
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
          <Field label={t(lang, 'password')} htmlFor="login-password">
            <input
              id="login-password"
              className="field-input"
              type="password"
              value={password}
              required
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
          <Button type="submit" fullWidth>
            {t(lang, 'login')}
          </Button>
          <p className="min-h-5 text-center text-sm text-red-700" aria-live="polite">
            {error}
          </p>
        </form>
      </Card>
    </main>
  );
};

/* ------------------------------------------------------------------ */
/* Admin shell                                                         */
/* ------------------------------------------------------------------ */

const navIcons: Record<string, (props: IconProps) => JSX.Element> = {
  '/admin': IconChart,
  '/admin/campaigns': IconTarget,
  '/admin/ledger': IconList,
  '/admin/reconciliation': IconScale,
  '/admin/audit': IconShield,
};

const AdminShell = ({ lang }: { lang: Lang }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = async () => {
    await api.logout().catch(() => ({ ok: false }));
    navigate('/admin/login');
  };

  if (isLoading)
    return (
      <main className="flex items-center justify-center gap-3 p-16 text-slate-500">
        <Spinner className="h-5 w-5" />
        Loading...
      </main>
    );
  if (!user) return <Navigate to="/admin/login" replace />;

  const links = [
    ['/admin', t(lang, 'dashboard')],
    canViewCampaigns(user.role) && ['/admin/campaigns', t(lang, 'campaigns')],
    ['/admin/ledger', t(lang, 'ledger')],
    canViewControls(user.role) && [
      '/admin/reconciliation',
      t(lang, 'reconciliation'),
    ],
    canViewControls(user.role) && ['/admin/audit', t(lang, 'audit')],
  ].filter(Boolean) as [string, string][];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/20">
            {user.name.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">
              {t(lang, 'admin')}
            </h1>
            <p className="text-sm text-slate-500">
              {user.name} · {roleLabel(user.role)}
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={logout}>
          {t(lang, 'logout')}
        </Button>
      </div>
      <nav
        className="no-print mb-6 flex flex-wrap gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-card"
        aria-label="Admin"
      >
        {links.map((link) => {
          const NavIcon = navIcons[link[0]];
          return (
            <NavLink
              key={link[0]}
              to={link[0]}
              end={link[0] === '/admin'}
              className={({ isActive }) =>
                classNames(
                  'focus-ring inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition',
                  isActive
                    ? 'bg-brand-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              {NavIcon && <NavIcon className="h-4 w-4" />}
              {link[1]}
            </NavLink>
          );
        })}
      </nav>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route
          path="/campaigns"
          element={
            canViewCampaigns(user.role) ? (
              <CampaignsPage role={user.role} />
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />
        <Route path="/ledger" element={<LedgerPage lang={lang} />} />
        <Route
          path="/reconciliation"
          element={
            canViewControls(user.role) ? (
              <ReconciliationPage />
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />
        <Route
          path="/audit"
          element={
            canViewControls(user.role) ? (
              <AuditPage />
            ) : (
              <Navigate to="/admin" replace />
            )
          }
        />
      </Routes>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

const DashboardPage = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState('');
  const [dashboard, setDashboard] = useState<Dashboard>(emptyDashboard);
  const [error, setError] = useState('');

  useEffect(() => {
    api.campaigns().then(setCampaigns).catch(() => setCampaigns([]));
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = () => {
      api
        .dashboard(campaignId)
        .then((next) => {
          if (isMounted) setDashboard(next);
        })
        .catch((requestError: Error) => setError(requestError.message));
    };
    load();
    const interval = window.setInterval(load, 3000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [campaignId]);

  return (
    <main>
      <PageHeading
        title="Dashboard"
        actions={
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            Campaign
            <select
              className="focus-ring rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm hover:border-slate-400"
              value={campaignId}
              onChange={(event) => setCampaignId(event.target.value)}
            >
              <option value="">All campaigns</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </label>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Raised EUR"
          value={money(dashboard.totalRaisedEur, 'EUR')}
          icon={<IconCoins className="h-5 w-5" />}
          tone="brand"
        />
        <Metric
          label="Successful"
          value={dashboard.successfulDonationCount}
          icon={<IconCheckCircle className="h-5 w-5" />}
          tone="green"
        />
        <Metric
          label="Average EUR"
          value={money(dashboard.averageEurDonation, 'EUR')}
          icon={<IconTrend className="h-5 w-5" />}
          tone="blue"
        />
        <Metric
          label="Progress"
          value={`${dashboard.progressVsGoal}%`}
          icon={<IconTarget className="h-5 w-5" />}
          tone="amber"
          progress={dashboard.progressVsGoal}
        />
      </div>
      <Card className="mt-5 p-6">
        <h3 className="text-lg font-bold text-slate-900">Currency breakdown</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          {currencies.map((currency) => (
            <div
              key={currency}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <dt className="text-sm font-medium text-slate-500">{currency}</dt>
              <dd className="mt-1 text-lg font-bold text-slate-900">
                {money(dashboard.currencyBreakdown[currency] || 0, currency)}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
      <ErrorAlert error={error} />
    </main>
  );
};

const metricTones: Record<Tone, string> = toneStyles;

const Metric = ({
  label,
  value,
  icon,
  tone = 'brand',
  progress,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  progress?: number;
}) => (
  <Card className="p-5">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-medium text-slate-500">{label}</h3>
      {icon && (
        <span
          className={classNames(
            'flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-inset',
            metricTones[tone],
          )}
        >
          {icon}
        </span>
      )}
    </div>
    <p className="mt-3 text-2xl font-extrabold text-slate-900">{value}</p>
    {typeof progress === 'number' && (
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-600 transition-all"
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>
    )}
  </Card>
);

/* ------------------------------------------------------------------ */
/* Campaigns                                                           */
/* ------------------------------------------------------------------ */

const CampaignsPage = ({ role }: { role: Role }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [error, setError] = useState('');

  const load = () => api.campaigns().then(setCampaigns);

  useEffect(() => {
    load().catch((requestError: Error) => setError(requestError.message));
  }, []);

  const archive = async (id: string) => {
    try {
      await api.archiveCampaign(id);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Archive failed.',
      );
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!window.confirm('Delete this campaign? Campaigns with donations cannot be deleted.')) {
      return;
    }
    try {
      await api.deleteCampaign(id);
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Delete failed.',
      );
    }
  };

  return (
    <main>
      <PageHeading title="Campaigns" />
      {canEditCampaigns(role) && (
        <CampaignForm
          campaign={editing}
          onSaved={() => {
            setEditing(null);
            load().catch((requestError: Error) => setError(requestError.message));
          }}
        />
      )}
      <Card className="mt-5 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {['Name', 'Cause', 'Status', 'Goal', 'Actions'].map((head) => (
                  <th
                    key={head}
                    className="px-4 py-3 font-semibold text-slate-500"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 && (
                <EmptyRow colSpan={5} label="No campaigns yet." />
              )}
              {campaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                        style={{ backgroundColor: campaign.color }}
                        aria-hidden="true"
                      />
                      <span className="font-medium text-slate-900">
                        {campaign.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{campaign.cause}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={campaign.status} />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {money(campaign.goalAmount, campaign.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {canEditCampaigns(role) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditing(campaign)}
                        >
                          Edit
                        </Button>
                      )}
                      {canArchiveCampaigns(role) && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => archive(campaign.id)}
                          >
                            Archive
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => deleteCampaign(campaign.id)}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <ErrorAlert error={error} />
    </main>
  );
};

const CampaignForm = ({
  campaign,
  onSaved,
}: {
  campaign: Campaign | null;
  onSaved: () => void;
}) => {
  const [name, setName] = useState('');
  const [cause, setCause] = useState('');
  const [goalAmount, setGoalAmount] = useState('1000');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [status, setStatus] = useState('draft');
  const [color, setColor] = useState('#047857');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(campaign?.name || '');
    setCause(campaign?.cause || '');
    setGoalAmount(String(campaign?.goalAmount || 1000));
    setCurrency(campaign?.currency || 'EUR');
    setStatus(campaign?.status || 'draft');
    setColor(campaign?.color || '#047857');
  }, [campaign]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = {
      name,
      cause,
      goalAmount: Number(goalAmount),
      currency,
      status,
      color,
      suggestedAmounts: [10, 25, 50],
    };
    try {
      if (campaign) await api.updateCampaign(campaign.id, body);
      else await api.createCampaign(body);
      onSaved();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Save failed.',
      );
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold text-slate-900">
        {campaign ? 'Edit campaign' : 'New campaign'}
      </h3>
      <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={submit}>
        <Field label="Name" htmlFor="campaign-name">
          <input
            id="campaign-name"
            className="field-input"
            value={name}
            required
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Cause" htmlFor="campaign-cause">
          <input
            id="campaign-cause"
            className="field-input"
            value={cause}
            required
            onChange={(event) => setCause(event.target.value)}
          />
        </Field>
        <Field label="Goal" htmlFor="campaign-goal">
          <input
            id="campaign-goal"
            className="field-input"
            type="number"
            min="1"
            value={goalAmount}
            onChange={(event) => setGoalAmount(event.target.value)}
          />
        </Field>
        <Field label="Currency" htmlFor="campaign-currency">
          <select
            id="campaign-currency"
            className="field-input"
            value={currency}
            onChange={(event) => setCurrency(event.target.value as Currency)}
          >
            {currencies.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="Status" htmlFor="campaign-status">
          <select
            id="campaign-status"
            className="field-input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {['draft', 'active', 'ended', 'archived'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="Color" htmlFor="campaign-color">
          <input
            id="campaign-color"
            className="focus-ring h-[46px] w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-1 shadow-sm"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
        </Field>
        <div className="md:col-span-3">
          <Button type="submit">
            {campaign ? 'Save campaign' : 'Create campaign'}
          </Button>
          <p className="mt-2 text-sm text-red-700" aria-live="polite">
            {error}
          </p>
        </div>
      </form>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/* Ledger                                                              */
/* ------------------------------------------------------------------ */

const LedgerPage = ({ lang }: { lang: Lang }) => {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filters, setFilters] = useState({
    from: '',
    to: '',
    campaignId: '',
    status: '',
    currency: '',
    minAmount: '',
    maxAmount: '',
    sort: 'createdAt',
    direction: 'desc',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    api.campaigns().then(setCampaigns).catch(() => setCampaigns([]));
  }, []);

  useEffect(() => {
    api
      .donations(filters)
      .then(setDonations)
      .catch((requestError: Error) => setError(requestError.message));
  }, [filters]);

  const totals = donations.reduce<Record<Currency, number>>(
    (sum, donation) => {
      if (donation.status === 'succeeded') {
        sum[donation.currency] += donation.amount;
      }
      return sum;
    },
    { EUR: 0, USD: 0, GBP: 0 },
  );

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <main>
      <PageHeading
        title={t(lang, 'ledger')}
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <a className={linkButtonClass} href={api.exportUrl(filters)}>
              {t(lang, 'exportCsv')}
            </a>
            <a className={linkButtonClass} href={api.exportPdfUrl(filters)}>
              {t(lang, 'exportPdf')}
            </a>
            <Button variant="secondary" onClick={() => window.print()}>
              {t(lang, 'print')}
            </Button>
          </div>
        }
      />
      <Card className="mb-4 p-5">
        <h3 className="text-base font-bold text-slate-900">
          Donation ledger report
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Generated: {formatDate(new Date().toISOString())}
        </p>
        <p className="mt-2 text-sm text-slate-700">
          <span className="font-medium">Total succeeded in filtered rows:</span>{' '}
          {currencies
            .filter((currency) => totals[currency])
            .map((currency) => money(totals[currency], currency))
            .join(' · ') || money(0, 'EUR')}
        </p>
      </Card>
      <div className="no-print mb-4 grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card md:grid-cols-4">
        <FilterInput label="From" type="date" value={filters.from} onChange={(value) => updateFilter('from', value)} />
        <FilterInput label="To" type="date" value={filters.to} onChange={(value) => updateFilter('to', value)} />
        {campaigns.length ? (
          <Field label="Campaign">
            <select className="field-input" value={filters.campaignId} onChange={(event) => updateFilter('campaignId', event.target.value)}>
              <option value="">Any</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <FilterInput label="Campaign ID" value={filters.campaignId} onChange={(value) => updateFilter('campaignId', value)} />
        )}
        <Field label="Status">
          <select className="field-input" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
            <option value="">Any</option>
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Currency">
          <select className="field-input" value={filters.currency} onChange={(event) => updateFilter('currency', event.target.value)}>
            <option value="">Any</option>
            {currencies.map((currency) => <option key={currency}>{currency}</option>)}
          </select>
        </Field>
        <FilterInput label="Min amount" type="number" value={filters.minAmount} onChange={(value) => updateFilter('minAmount', value)} />
        <FilterInput label="Max amount" type="number" value={filters.maxAmount} onChange={(value) => updateFilter('maxAmount', value)} />
        <Field label="Sort">
          <select className="field-input" value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}>
            <option value="createdAt">Date</option>
            <option value="amount">Amount</option>
            <option value="status">Status</option>
          </select>
        </Field>
      </div>
      <DonationTable donations={donations} />
      <ErrorAlert error={error} />
    </main>
  );
};

const FilterInput = ({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) => (
  <Field label={label}>
    <input
      className="field-input"
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </Field>
);

const DonationTable = ({ donations }: { donations: Donation[] }) => (
  <Card className="overflow-hidden p-0">
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {[
              'Date',
              'Donation ID',
              'Campaign',
              'Amount',
              'Method',
              'Status',
              'Mastercard ID',
              'Receipt',
            ].map((head) => (
              <th key={head} className="px-4 py-3 font-semibold text-slate-500">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {donations.length === 0 && (
            <EmptyRow colSpan={8} label="No donations match these filters." />
          )}
          {donations.map((donation) => (
            <tr
              key={donation.id}
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
            >
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {formatDate(donation.createdAt)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-500">
                {donation.id}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {donation.campaignName || donation.campaignId}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                {money(donation.amount, donation.currency)}
              </td>
              <td className="px-4 py-3 capitalize text-slate-600">
                {donation.paymentMethod}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={donation.status} />
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-500">
                {donation.mastercardTransactionId || '-'}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {donation.receiptChannel || 'none'}{' '}
                {donation.maskedReceiptContact || ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Card>
);

/* ------------------------------------------------------------------ */
/* Reconciliation & Audit                                              */
/* ------------------------------------------------------------------ */

const ReconciliationPage = () => {
  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .reconciliation()
      .then(setRows)
      .catch((requestError: Error) => setError(requestError.message));
  }, []);

  return (
    <AdminTable
      title="Reconciliation"
      heads={[
        'Donation',
        'Campaign',
        'Amount',
        'Donation status',
        'Mastercard ID',
        'Mastercard status',
        'Match',
        'Source',
        'Created',
      ]}
      rows={rows.map((row) => ({
        id: row.id,
        cells: [
          <span className="font-mono text-xs text-slate-500">{row.donationId}</span>,
          row.campaignName,
          <span className="font-medium text-slate-900">
            {money(row.amount, row.currency)}
          </span>,
          <StatusBadge status={row.donationStatus} />,
          <span className="font-mono text-xs text-slate-500">
            {row.mastercardTransactionId}
          </span>,
          row.mastercardStatus,
          <StatusBadge status={row.matchState} />,
          row.source,
          formatDate(row.createdAt),
        ],
      }))}
      error={error}
    />
  );
};

const AuditPage = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .audit()
      .then(setRows)
      .catch((requestError: Error) => setError(requestError.message));
  }, []);

  return (
    <AdminTable
      title="Audit"
      heads={['Created', 'Actor', 'Action', 'Entity type', 'Entity ID']}
      rows={rows.map((row) => ({
        id: row.id,
        cells: [
          formatDate(row.createdAt),
          row.actorName,
          <Badge tone="blue">{row.action}</Badge>,
          row.entityType,
          <span className="font-mono text-xs text-slate-500">{row.entityId}</span>,
        ],
      }))}
      error={error}
    />
  );
};

const AdminTable = ({
  title,
  heads,
  rows,
  error,
}: {
  title: string;
  heads: string[];
  rows: { id: string; cells: React.ReactNode[] }[];
  error: string;
}) => (
  <main>
    <PageHeading title={title} />
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {heads.map((head) => (
                <th
                  key={head}
                  className="whitespace-nowrap px-4 py-3 font-semibold text-slate-500"
                >
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <EmptyRow colSpan={heads.length} label="Nothing to show yet." />
            )}
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
              >
                {row.cells.map((cell, index) => (
                  <td key={index} className="px-4 py-3 text-slate-600">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
    <ErrorAlert error={error} />
  </main>
);

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

const App = () => {
  const [lang, setLangState] = useState<Lang>(getInitialLang);

  const setLang = (next: Lang) => {
    localStorage.setItem('tap_lang', next);
    setLangState(next);
  };

  return (
    <Shell lang={lang} setLang={setLang}>
      <Routes>
        <Route path="/" element={<DonorHome lang={lang} />} />
        <Route
          path="/donate/confirmation/:id"
          element={<Confirmation lang={lang} />}
        />
        <Route path="/admin/login" element={<Login lang={lang} />} />
        <Route path="/admin/*" element={<AdminShell lang={lang} />} />
      </Routes>
    </Shell>
  );
};

export default App;
