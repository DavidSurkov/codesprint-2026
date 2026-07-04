import { useEffect, useMemo, useState } from 'react';
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

const useLocalBoolean = (key: string) => {
  const [value, setValue] = useState(() => localStorage.getItem(key) === '1');

  const update = (next: boolean) => {
    localStorage.setItem(key, next ? '1' : '0');
    setValue(next);
  };

  return [value, update] as const;
};

const FieldError = ({ id, error }: { id: string; error: string }) => (
  <p id={id} className="mt-1 text-sm text-red-700">
    {error}
  </p>
);

const Button = ({
  children,
  type = 'button',
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
}) => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    className="focus-ring rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
  >
    {children}
  </button>
);

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
    <div className="min-h-screen">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link className="focus-ring rounded text-xl font-bold" to="/">
            Tap For Good
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              {t(lang, 'language')}
              <select
                className="focus-ring rounded-md border border-slate-300 px-2 py-1"
                value={lang}
                onChange={(event) => setLang(event.target.value as Lang)}
              >
                <option value="en">English</option>
                <option value="mt">Malti</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isLargeText}
                onChange={(event) => setLargeText(event.target.checked)}
              />
              {t(lang, 'largeText')}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isHighContrast}
                onChange={(event) => setHighContrast(event.target.checked)}
              />
              {t(lang, 'highContrast')}
            </label>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
};

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
  const cardError =
    paymentMethod === 'tap' || (cardName && cardNumber && cardExpiry && cardCvc)
      ? ''
      : 'Card details needed.';
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
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_420px]">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Contactless giving
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-normal sm:text-5xl">
          Tap For Good
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-700">
          Choose a campaign, set an amount, and complete a demo card or tap
          donation.
        </p>
        {campaign ? (
          <article className="surface mt-8 rounded-lg border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-4">
              {campaign.logoUrl ? (
                <img
                  src={campaign.logoUrl}
                  alt=""
                  className="h-16 w-16 rounded-md object-cover"
                />
              ) : (
                <div
                  aria-hidden="true"
                  className="h-16 w-16 rounded-md"
                  style={{ backgroundColor: campaign.color }}
                />
              )}
              <div>
                <h2 className="text-2xl font-semibold">{campaign.name}</h2>
                <p className="text-slate-700">{campaign.cause}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-700">
              Goal: {money(campaign.goalAmount, campaign.currency)}
            </p>
          </article>
        ) : (
          <p className="mt-8 rounded-md border border-amber-300 bg-amber-50 p-4">
            No active campaigns are available.
          </p>
        )}
      </section>
      <form
        className="surface rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        onSubmit={submit}
      >
        <h2 className="text-2xl font-semibold">{t(lang, 'donate')}</h2>
        <div className="mt-4 grid gap-4">
          <label>
            <span className="font-medium">{t(lang, 'campaign')}</span>
            <select
              className="focus-ring mt-1 w-full rounded-md border border-slate-300 p-2"
              value={campaignId}
              onChange={(event) => setCampaignId(event.target.value)}
            >
              {campaigns.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="font-medium">{t(lang, 'currency')}</span>
            <select
              className="focus-ring mt-1 w-full rounded-md border border-slate-300 p-2"
              value={currency}
              onChange={(event) => setCurrency(event.target.value as Currency)}
            >
              {currencies.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="font-medium">{t(lang, 'amount')}</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(campaign?.suggestedAmounts || [10, 25, 50]).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={classNames(
                    'focus-ring rounded-md border px-3 py-2',
                    Number(amount) === item
                      ? 'border-emerald-700 bg-emerald-50'
                      : 'border-slate-300',
                  )}
                  onClick={() => setAmount(String(item))}
                >
                  {money(item, currency)}
                </button>
              ))}
            </div>
            <input
              className="focus-ring mt-2 w-full rounded-md border border-slate-300 p-2"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              aria-invalid={Boolean(amountError)}
              aria-describedby={amountError ? 'amount-error' : undefined}
              onChange={(event) => setAmount(event.target.value)}
            />
            {amountError && <FieldError id="amount-error" error={amountError} />}
          </fieldset>
          <fieldset>
            <legend className="font-medium">Payment</legend>
            <div className="mt-2 flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={paymentMethod === 'tap'}
                  onChange={() => setPaymentMethod('tap')}
                />
                {t(lang, 'tap')}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                />
                {t(lang, 'card')}
              </label>
            </div>
          </fieldset>
          {paymentMethod === 'card' && (
            <div className="grid gap-3" aria-describedby="card-error">
              <label>
                Name on card
                <input
                  className="focus-ring mt-1 w-full rounded-md border border-slate-300 p-2"
                  value={cardName}
                  onChange={(event) => setCardName(event.target.value)}
                />
              </label>
              <label>
                Card number
                <input
                  className="focus-ring mt-1 w-full rounded-md border border-slate-300 p-2"
                  inputMode="numeric"
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  Expiry
                  <input
                    className="focus-ring mt-1 w-full rounded-md border border-slate-300 p-2"
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(event) => setCardExpiry(event.target.value)}
                  />
                </label>
                <label>
                  CVC
                  <input
                    className="focus-ring mt-1 w-full rounded-md border border-slate-300 p-2"
                    inputMode="numeric"
                    value={cardCvc}
                    onChange={(event) => setCardCvc(event.target.value)}
                  />
                </label>
              </div>
              {cardError && <FieldError id="card-error" error={cardError} />}
            </div>
          )}
          <fieldset>
            <legend className="font-medium">{t(lang, 'receipt')}</legend>
            <div className="mt-2 flex gap-4">
              {(['email', 'sms', 'none'] as const).map((item) => (
                <label key={item} className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={receiptChannel === item}
                    onChange={() => setReceiptChannel(item)}
                  />
                  {item}
                </label>
              ))}
            </div>
            {receiptChannel !== 'none' && (
              <input
                className="focus-ring mt-2 w-full rounded-md border border-slate-300 p-2"
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
          <Button type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Sending...' : t(lang, 'submit')}
          </Button>
          <p className="min-h-6 text-sm text-red-700" aria-live="polite">
            {error}
          </p>
        </div>
      </form>
    </main>
  );
};

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

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <section className="surface rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-3xl font-bold">{t(lang, 'confirmation')}</h1>
        <p className="mt-4" aria-live="polite">
          {error || (donation ? t(lang, 'donated') : 'Loading...')}
        </p>
        {donation && (
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="font-medium">Donation ID</dt>
              <dd>{donation.id}</dd>
            </div>
            <div>
              <dt className="font-medium">Status</dt>
              <dd>{donation.status}</dd>
            </div>
            <div>
              <dt className="font-medium">{t(lang, 'amount')}</dt>
              <dd>{money(donation.amount, donation.currency)}</dd>
            </div>
            <div>
              <dt className="font-medium">{t(lang, 'receipt')}</dt>
              <dd>{donation.receiptState || donation.receiptChannel || 'none'}</dd>
            </div>
          </dl>
        )}
        <Link className="focus-ring mt-6 inline-block rounded text-emerald-800" to="/">
          Make another donation
        </Link>
      </section>
    </main>
  );
};

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
    <main className="mx-auto max-w-md px-4 py-10">
      <form
        className="surface rounded-lg border border-slate-200 bg-white p-6"
        onSubmit={submit}
      >
        <h1 className="text-3xl font-bold">{t(lang, 'login')}</h1>
        <label className="mt-5 block">
          {t(lang, 'email')}
          <input
            className="focus-ring mt-1 w-full rounded-md border border-slate-300 p-2"
            type="email"
            value={email}
            required
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="mt-4 block">
          {t(lang, 'password')}
          <input
            className="focus-ring mt-1 w-full rounded-md border border-slate-300 p-2"
            type="password"
            value={password}
            required
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <div className="mt-5">
          <Button type="submit">{t(lang, 'login')}</Button>
        </div>
        <p className="mt-4 min-h-6 text-sm text-red-700" aria-live="polite">
          {error}
        </p>
      </form>
    </main>
  );
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

  if (isLoading) return <main className="p-6">Loading...</main>;
  if (!user) return <Navigate to="/admin/login" replace />;

  const links = [
    ['/admin', t(lang, 'dashboard')],
    ['/admin/campaigns', t(lang, 'campaigns')],
    ['/admin/ledger', t(lang, 'ledger')],
    ['/admin/reconciliation', t(lang, 'reconciliation')],
    ['/admin/audit', t(lang, 'audit')],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{t(lang, 'admin')}</h1>
          <p className="text-sm text-slate-700">
            {user.name} · {user.role}
          </p>
        </div>
        <Button onClick={logout}>{t(lang, 'logout')}</Button>
      </div>
      <nav className="no-print mb-6 flex flex-wrap gap-2" aria-label="Admin">
        {links.map((link) => (
          <NavLink
            key={link[0]}
            to={link[0]}
            end={link[0] === '/admin'}
            className={({ isActive }) =>
              classNames(
                'focus-ring rounded-md border px-3 py-2',
                isActive
                  ? 'border-emerald-700 bg-emerald-50'
                  : 'border-slate-300 bg-white',
              )
            }
          >
            {link[1]}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route
          path="/campaigns"
          element={<CampaignsPage role={user.role} />}
        />
        <Route path="/ledger" element={<LedgerPage lang={lang} />} />
        <Route path="/reconciliation" element={<ReconciliationPage />} />
        <Route path="/audit" element={<AuditPage />} />
      </Routes>
    </div>
  );
};

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
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <label>
          Campaign
          <select
            className="focus-ring ml-2 rounded-md border border-slate-300 p-2"
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
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Raised EUR" value={money(dashboard.totalRaisedEur, 'EUR')} />
        <Metric label="Successful" value={dashboard.successfulDonationCount} />
        <Metric label="Average EUR" value={money(dashboard.averageEurDonation, 'EUR')} />
        <Metric label="Progress" value={`${dashboard.progressVsGoal}%`} />
      </div>
      <section className="surface mt-5 rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-xl font-semibold">Currency breakdown</h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3">
          {currencies.map((currency) => (
            <div key={currency}>
              <dt className="font-medium">{currency}</dt>
              <dd>{money(dashboard.currencyBreakdown[currency] || 0, currency)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <p className="mt-4 text-sm text-red-700" aria-live="polite">
        {error}
      </p>
    </main>
  );
};

const Metric = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <section className="surface rounded-lg border border-slate-200 bg-white p-5">
    <h3 className="text-sm font-medium text-slate-600">{label}</h3>
    <p className="mt-2 text-2xl font-bold">{value}</p>
  </section>
);

const CampaignsPage = ({ role }: { role: Role }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [error, setError] = useState('');

  const load = () => api.campaigns().then(setCampaigns);

  useEffect(() => {
    load().catch((requestError: Error) => setError(requestError.message));
  }, []);

  const archive = async (id: string) => {
    await api.archiveCampaign(id);
    await load();
  };

  return (
    <main>
      <h2 className="text-2xl font-semibold">Campaigns</h2>
      {canEditCampaigns(role) && (
        <CampaignForm
          campaign={editing}
          onSaved={() => {
            setEditing(null);
            load().catch((requestError: Error) => setError(requestError.message));
          }}
        />
      )}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full border-collapse bg-white text-left">
          <thead>
            <tr>
              {['Name', 'Cause', 'Status', 'Goal', 'Actions'].map((head) => (
                <th key={head} className="border-b border-slate-200 p-3">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td className="border-b border-slate-100 p-3">{campaign.name}</td>
                <td className="border-b border-slate-100 p-3">{campaign.cause}</td>
                <td className="border-b border-slate-100 p-3">{campaign.status}</td>
                <td className="border-b border-slate-100 p-3">
                  {money(campaign.goalAmount, campaign.currency)}
                </td>
                <td className="border-b border-slate-100 p-3">
                  <div className="flex flex-wrap gap-2">
                    {canEditCampaigns(role) && (
                      <Button onClick={() => setEditing(campaign)}>Edit</Button>
                    )}
                    {canArchiveCampaigns(role) && (
                      <Button onClick={() => archive(campaign.id)}>Archive</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-red-700" aria-live="polite">
        {error}
      </p>
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
    <form
      className="surface mt-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-3"
      onSubmit={submit}
    >
      <label>
        Name
        <input
          className="focus-ring mt-1 w-full rounded-md border border-slate-300 p-2"
          value={name}
          required
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label>
        Cause
        <input
          className="focus-ring mt-1 w-full rounded-md border border-slate-300 p-2"
          value={cause}
          required
          onChange={(event) => setCause(event.target.value)}
        />
      </label>
      <label>
        Goal
        <input
          className="focus-ring mt-1 w-full rounded-md border border-slate-300 p-2"
          type="number"
          min="1"
          value={goalAmount}
          onChange={(event) => setGoalAmount(event.target.value)}
        />
      </label>
      <label>
        Currency
        <select
          className="focus-ring mt-1 w-full rounded-md border border-slate-300 p-2"
          value={currency}
          onChange={(event) => setCurrency(event.target.value as Currency)}
        >
          {currencies.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label>
        Status
        <select
          className="focus-ring mt-1 w-full rounded-md border border-slate-300 p-2"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {['draft', 'active', 'ended', 'archived'].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label>
        Color
        <input
          className="focus-ring mt-1 h-11 w-full rounded-md border border-slate-300 p-1"
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        />
      </label>
      <div className="md:col-span-3">
        <Button type="submit">{campaign ? 'Save campaign' : 'Create campaign'}</Button>
        <p className="mt-2 text-sm text-red-700" aria-live="polite">
          {error}
        </p>
      </div>
    </form>
  );
};

const LedgerPage = ({ lang }: { lang: Lang }) => {
  const [donations, setDonations] = useState<Donation[]>([]);
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

  const query = useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    return params;
  }, [filters]);

  useEffect(() => {
    api
      .donations(query)
      .then(setDonations)
      .catch((requestError: Error) => setError(requestError.message));
  }, [query]);

  const totals = donations.reduce(
    (sum, donation) =>
      donation.status === 'succeeded' ? sum + donation.amount : sum,
    0,
  );

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <main>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">{t(lang, 'ledger')}</h2>
        <div className="no-print flex gap-2">
          <a
            className="focus-ring rounded-md bg-emerald-700 px-4 py-2 font-semibold text-white"
            href={api.exportUrl(query)}
          >
            {t(lang, 'exportCsv')}
          </a>
          <Button onClick={() => window.print()}>{t(lang, 'print')}</Button>
        </div>
      </div>
      <section className="mb-4">
        <h3 className="text-xl font-semibold">Donation ledger report</h3>
        <p>Generated: {formatDate(new Date().toISOString())}</p>
        <p>Total succeeded in filtered rows: {money(totals, 'EUR')}</p>
      </section>
      <div className="no-print grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
        <FilterInput label="From" type="date" value={filters.from} onChange={(value) => updateFilter('from', value)} />
        <FilterInput label="To" type="date" value={filters.to} onChange={(value) => updateFilter('to', value)} />
        <FilterInput label="Campaign ID" value={filters.campaignId} onChange={(value) => updateFilter('campaignId', value)} />
        <label>
          Status
          <select className="focus-ring mt-1 w-full rounded-md border border-slate-300 p-2" value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
            <option value="">Any</option>
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label>
          Currency
          <select className="focus-ring mt-1 w-full rounded-md border border-slate-300 p-2" value={filters.currency} onChange={(event) => updateFilter('currency', event.target.value)}>
            <option value="">Any</option>
            {currencies.map((currency) => <option key={currency}>{currency}</option>)}
          </select>
        </label>
        <FilterInput label="Min amount" type="number" value={filters.minAmount} onChange={(value) => updateFilter('minAmount', value)} />
        <FilterInput label="Max amount" type="number" value={filters.maxAmount} onChange={(value) => updateFilter('maxAmount', value)} />
        <label>
          Sort
          <select className="focus-ring mt-1 w-full rounded-md border border-slate-300 p-2" value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}>
            <option value="createdAt">Date</option>
            <option value="amount">Amount</option>
            <option value="status">Status</option>
          </select>
        </label>
      </div>
      <DonationTable donations={donations} />
      <p className="mt-4 text-sm text-red-700" aria-live="polite">
        {error}
      </p>
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
  <label>
    {label}
    <input
      className="focus-ring mt-1 w-full rounded-md border border-slate-300 p-2"
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  </label>
);

const DonationTable = ({ donations }: { donations: Donation[] }) => (
  <div className="mt-4 overflow-x-auto">
    <table className="w-full border-collapse bg-white text-left">
      <thead>
        <tr>
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
            <th key={head} className="border-b border-slate-200 p-3">
              {head}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {donations.map((donation) => (
          <tr key={donation.id}>
            <td className="border-b border-slate-100 p-3">
              {formatDate(donation.createdAt)}
            </td>
            <td className="border-b border-slate-100 p-3">{donation.id}</td>
            <td className="border-b border-slate-100 p-3">
              {donation.campaignName || donation.campaignId}
            </td>
            <td className="border-b border-slate-100 p-3">
              {money(donation.amount, donation.currency)}
            </td>
            <td className="border-b border-slate-100 p-3">
              {donation.paymentMethod}
            </td>
            <td className="border-b border-slate-100 p-3">{donation.status}</td>
            <td className="border-b border-slate-100 p-3">
              {donation.mastercardTransactionId || '-'}
            </td>
            <td className="border-b border-slate-100 p-3">
              {donation.receiptChannel || 'none'}{' '}
              {donation.maskedReceiptContact || ''}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

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
      rows={rows.map((row) => [
        row.donationId,
        row.campaignName,
        money(row.amount, row.currency),
        row.donationStatus,
        row.mastercardTransactionId,
        row.mastercardStatus,
        row.matchState,
        row.source,
        formatDate(row.createdAt),
      ])}
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
      rows={rows.map((row) => [
        formatDate(row.createdAt),
        row.actorName,
        row.action,
        row.entityType,
        row.entityId,
      ])}
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
  rows: string[][];
  error: string;
}) => (
  <main>
    <h2 className="text-2xl font-semibold">{title}</h2>
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse bg-white text-left">
        <thead>
          <tr>
            {heads.map((head) => (
              <th key={head} className="border-b border-slate-200 p-3">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join('|')}>
              {row.map((cell) => (
                <td key={cell} className="border-b border-slate-100 p-3">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="mt-4 text-sm text-red-700" aria-live="polite">
      {error}
    </p>
  </main>
);

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
