import { useEffect, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { t, type Lang } from '../i18n';
import type { AuditRow, Campaign, Currency, Dashboard, Donation, ReconciliationRow, Role, User } from '../types';
import {
    canArchiveCampaigns,
    canEditCampaigns,
    canViewCampaigns,
    canViewControls,
    classNames,
    currencies,
    enumLabel,
    formatDate,
    money,
    roleLabel,
    statuses,
} from '../utils';
import {
    Badge,
    Button,
    Card,
    EmptyRow,
    ErrorAlert,
    Field,
    IconChart,
    IconCheckCircle,
    IconCoins,
    IconList,
    IconScale,
    IconShield,
    IconTarget,
    IconTrend,
    linkButtonClass,
    PageHeading,
    Select,
    Spinner,
    StatusBadge,
    Table,
    TextInput,
    toneStyles,
    type Tone,
} from '../components/ui';

const emptyDashboard: Dashboard = {
    totalRaisedEur: 0,
    successfulDonationCount: 0,
    averageEurDonation: 0,
    progressVsGoal: 0,
    currencyBreakdown: { EUR: 0, USD: 0, GBP: 0 },
};

const navIcons = {
    '/admin': IconChart,
    '/admin/campaigns': IconTarget,
    '/admin/ledger': IconList,
    '/admin/reconciliation': IconScale,
    '/admin/audit': IconShield,
};

export const AdminShell = ({ lang }: { lang: Lang }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setLoading] = useState(true);

    useEffect(() => {
        api.me()
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
                {t(lang, 'loading')}
            </main>
        );
    if (!user) return <Navigate to="/admin/login" replace />;

    const links = [
        ['/admin', t(lang, 'dashboard')],
        canViewCampaigns(user.role) && ['/admin/campaigns', t(lang, 'campaigns')],
        ['/admin/ledger', t(lang, 'ledger')],
        canViewControls(user.role) && ['/admin/reconciliation', t(lang, 'reconciliation')],
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
                        <h1 className="text-xl font-extrabold text-slate-900">{t(lang, 'admin')}</h1>
                        <p className="text-sm text-slate-500">
                            {user.name} · {roleLabel(lang, user.role)}
                        </p>
                    </div>
                </div>
                <Button variant="secondary" onClick={logout}>
                    {t(lang, 'logout')}
                </Button>
            </div>
            <nav
                className="no-print mb-6 flex flex-wrap gap-1.5 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-card"
                aria-label={t(lang, 'admin')}
            >
                {links.map((link) => {
                    const NavIcon = navIcons[link[0] as keyof typeof navIcons];
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
                <Route path="/" element={<DashboardPage lang={lang} />} />
                <Route
                    path="/campaigns"
                    element={
                        canViewCampaigns(user.role) ? (
                            <CampaignsPage lang={lang} role={user.role} />
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
                            <ReconciliationPage lang={lang} />
                        ) : (
                            <Navigate to="/admin" replace />
                        )
                    }
                />
                <Route
                    path="/audit"
                    element={canViewControls(user.role) ? <AuditPage lang={lang} /> : <Navigate to="/admin" replace />}
                />
            </Routes>
        </div>
    );
};

const DashboardPage = ({ lang }: { lang: Lang }) => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [campaignId, setCampaignId] = useState('');
    const [dashboard, setDashboard] = useState<Dashboard>(emptyDashboard);
    const [error, setError] = useState('');

    useEffect(() => {
        api.campaigns()
            .then(setCampaigns)
            .catch(() => setCampaigns([]));
    }, []);

    useEffect(() => {
        let isMounted = true;
        const load = () => {
            api.dashboard(campaignId)
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
                title={t(lang, 'dashboard')}
                actions={
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                        {t(lang, 'campaign')}
                        <select
                            className="focus-ring rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm hover:border-slate-400"
                            value={campaignId}
                            onChange={(event) => setCampaignId(event.target.value)}
                        >
                            <option value="">{t(lang, 'allCampaigns')}</option>
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
                    label={t(lang, 'raisedEur')}
                    value={money(dashboard.totalRaisedEur, 'EUR')}
                    icon={<IconCoins className="h-5 w-5" />}
                    tone="brand"
                />
                <Metric
                    label={t(lang, 'successful')}
                    value={dashboard.successfulDonationCount}
                    icon={<IconCheckCircle className="h-5 w-5" />}
                    tone="green"
                />
                <Metric
                    label={t(lang, 'averageEur')}
                    value={money(dashboard.averageEurDonation, 'EUR')}
                    icon={<IconTrend className="h-5 w-5" />}
                    tone="blue"
                />
                <Metric
                    label={t(lang, 'progress')}
                    value={`${dashboard.progressVsGoal}%`}
                    icon={<IconTarget className="h-5 w-5" />}
                    tone="amber"
                    progress={dashboard.progressVsGoal}
                />
            </div>
            <Card className="mt-5 p-6">
                <h3 className="text-lg font-bold text-slate-900">{t(lang, 'currencyBreakdown')}</h3>
                <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                    {currencies.map((currency) => (
                        <div key={currency} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
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

const CampaignsPage = ({ lang, role }: { lang: Lang; role: Role }) => {
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
            setError(requestError instanceof Error ? requestError.message : t(lang, 'archiveFailed'));
        }
    };

    const deleteCampaign = async (id: string) => {
        if (!window.confirm(t(lang, 'deleteCampaignConfirm'))) return;
        try {
            await api.deleteCampaign(id);
            await load();
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : t(lang, 'deleteFailed'));
        }
    };

    return (
        <main>
            <PageHeading title={t(lang, 'campaigns')} />
            {canEditCampaigns(role) && (
                <CampaignForm
                    campaign={editing}
                    lang={lang}
                    onSaved={() => {
                        setEditing(null);
                        load().catch((requestError: Error) => setError(requestError.message));
                    }}
                />
            )}
            <Table heads={[t(lang, 'name'), t(lang, 'cause'), t(lang, 'status'), t(lang, 'goal'), t(lang, 'actions')]}>
                {campaigns.length === 0 && <EmptyRow colSpan={5} label={t(lang, 'noCampaigns')} />}
                {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                                <span
                                    className="h-3 w-3 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                                    style={{ backgroundColor: campaign.color }}
                                    aria-hidden="true"
                                />
                                <span className="font-medium text-slate-900">{campaign.name}</span>
                            </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{campaign.cause}</td>
                        <td className="px-4 py-3">
                            <StatusBadge lang={lang} status={campaign.status} />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                            {money(campaign.goalAmount, campaign.currency)}
                        </td>
                        <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                                {canEditCampaigns(role) && (
                                    <Button variant="secondary" size="sm" onClick={() => setEditing(campaign)}>
                                        {t(lang, 'edit')}
                                    </Button>
                                )}
                                {canArchiveCampaigns(role) && (
                                    <>
                                        <Button variant="secondary" size="sm" onClick={() => archive(campaign.id)}>
                                            {t(lang, 'archive')}
                                        </Button>
                                        <Button variant="danger" size="sm" onClick={() => deleteCampaign(campaign.id)}>
                                            {t(lang, 'delete')}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </td>
                    </tr>
                ))}
            </Table>
            <ErrorAlert error={error} />
        </main>
    );
};

const CampaignForm = ({ campaign, lang, onSaved }: { campaign: Campaign | null; lang: Lang; onSaved: () => void }) => {
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
            setError(requestError instanceof Error ? requestError.message : t(lang, 'saveFailed'));
        }
    };

    return (
        <Card className="mb-5 p-6">
            <h3 className="text-lg font-bold text-slate-900">
                {campaign ? t(lang, 'editCampaign') : t(lang, 'newCampaign')}
            </h3>
            <form className="mt-4 grid gap-4 md:grid-cols-3" onSubmit={submit}>
                <Field label={t(lang, 'name')} htmlFor="campaign-name">
                    <TextInput
                        id="campaign-name"
                        value={name}
                        required
                        onChange={(event) => setName(event.target.value)}
                    />
                </Field>
                <Field label={t(lang, 'cause')} htmlFor="campaign-cause">
                    <TextInput
                        id="campaign-cause"
                        value={cause}
                        required
                        onChange={(event) => setCause(event.target.value)}
                    />
                </Field>
                <Field label={t(lang, 'goal')} htmlFor="campaign-goal">
                    <TextInput
                        id="campaign-goal"
                        type="number"
                        min="1"
                        value={goalAmount}
                        onChange={(event) => setGoalAmount(event.target.value)}
                    />
                </Field>
                <Field label={t(lang, 'currency')} htmlFor="campaign-currency">
                    <Select
                        id="campaign-currency"
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value as Currency)}
                    >
                        {currencies.map((item) => (
                            <option key={item}>{item}</option>
                        ))}
                    </Select>
                </Field>
                <Field label={t(lang, 'status')} htmlFor="campaign-status">
                    <Select id="campaign-status" value={status} onChange={(event) => setStatus(event.target.value)}>
                        {['draft', 'active', 'ended', 'archived'].map((item) => (
                            <option key={item} value={item}>
                                {enumLabel(lang, 'status', item)}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label={t(lang, 'color')} htmlFor="campaign-color">
                    <input
                        id="campaign-color"
                        className="focus-ring h-[46px] w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-1 shadow-sm"
                        type="color"
                        value={color}
                        onChange={(event) => setColor(event.target.value)}
                    />
                </Field>
                <div className="md:col-span-3">
                    <Button type="submit">{campaign ? t(lang, 'saveCampaign') : t(lang, 'createCampaign')}</Button>
                    <p className="mt-2 text-sm text-red-700" aria-live="polite">
                        {error}
                    </p>
                </div>
            </form>
        </Card>
    );
};

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
        api.campaigns()
            .then(setCampaigns)
            .catch(() => setCampaigns([]));
    }, []);

    useEffect(() => {
        api.donations(filters)
            .then(setDonations)
            .catch((requestError: Error) => setError(requestError.message));
    }, [filters]);

    const totals = donations.reduce<Record<Currency, number>>(
        (sum, donation) => {
            if (donation.status === 'succeeded') sum[donation.currency] += donation.amount;
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
                <h3 className="text-base font-bold text-slate-900">{t(lang, 'donationLedgerReport')}</h3>
                <p className="mt-1 text-sm text-slate-500">
                    {t(lang, 'generated')}: {formatDate(new Date().toISOString())}
                </p>
                <p className="mt-2 text-sm text-slate-700">
                    <span className="font-medium">{t(lang, 'totalSucceeded')}</span>{' '}
                    {currencies
                        .filter((currency) => totals[currency])
                        .map((currency) => money(totals[currency], currency))
                        .join(' · ') || money(0, 'EUR')}
                </p>
            </Card>
            <div className="no-print mb-4 grid gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card md:grid-cols-4">
                <FilterInput
                    label={t(lang, 'from')}
                    type="date"
                    value={filters.from}
                    onChange={(value) => updateFilter('from', value)}
                />
                <FilterInput
                    label={t(lang, 'to')}
                    type="date"
                    value={filters.to}
                    onChange={(value) => updateFilter('to', value)}
                />
                {campaigns.length ? (
                    <Field label={t(lang, 'campaign')}>
                        <Select
                            value={filters.campaignId}
                            onChange={(event) => updateFilter('campaignId', event.target.value)}
                        >
                            <option value="">{t(lang, 'any')}</option>
                            {campaigns.map((campaign) => (
                                <option key={campaign.id} value={campaign.id}>
                                    {campaign.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                ) : (
                    <FilterInput
                        label={t(lang, 'campaignId')}
                        value={filters.campaignId}
                        onChange={(value) => updateFilter('campaignId', value)}
                    />
                )}
                <Field label={t(lang, 'status')}>
                    <Select value={filters.status} onChange={(event) => updateFilter('status', event.target.value)}>
                        <option value="">{t(lang, 'any')}</option>
                        {statuses.map((status) => (
                            <option key={status} value={status}>
                                {enumLabel(lang, 'status', status)}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label={t(lang, 'currency')}>
                    <Select value={filters.currency} onChange={(event) => updateFilter('currency', event.target.value)}>
                        <option value="">{t(lang, 'any')}</option>
                        {currencies.map((currency) => (
                            <option key={currency}>{currency}</option>
                        ))}
                    </Select>
                </Field>
                <FilterInput
                    label={t(lang, 'minAmount')}
                    type="number"
                    value={filters.minAmount}
                    onChange={(value) => updateFilter('minAmount', value)}
                />
                <FilterInput
                    label={t(lang, 'maxAmount')}
                    type="number"
                    value={filters.maxAmount}
                    onChange={(value) => updateFilter('maxAmount', value)}
                />
                <Field label={t(lang, 'sort')}>
                    <Select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}>
                        <option value="createdAt">{t(lang, 'date')}</option>
                        <option value="amount">{t(lang, 'amount')}</option>
                        <option value="status">{t(lang, 'status')}</option>
                    </Select>
                </Field>
            </div>
            <DonationTable donations={donations} lang={lang} />
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
        <TextInput type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
);

const DonationTable = ({ donations, lang }: { donations: Donation[]; lang: Lang }) => (
    <Table
        heads={[
            t(lang, 'date'),
            t(lang, 'donationId'),
            t(lang, 'campaign'),
            t(lang, 'amount'),
            t(lang, 'method'),
            t(lang, 'status'),
            t(lang, 'mastercardId'),
            t(lang, 'receipt'),
        ]}
    >
        {donations.length === 0 && <EmptyRow colSpan={8} label={t(lang, 'noDonations')} />}
        {donations.map((donation) => (
            <tr key={donation.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(donation.createdAt)}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{donation.id}</td>
                <td className="px-4 py-3 text-slate-700">{donation.campaignName || donation.campaignId}</td>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                    {money(donation.amount, donation.currency)}
                </td>
                <td className="px-4 py-3 capitalize text-slate-600">
                    {enumLabel(lang, 'payment', donation.paymentMethod)}
                </td>
                <td className="px-4 py-3">
                    <StatusBadge lang={lang} status={donation.status} />
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {donation.mastercardTransactionId || '-'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                    {enumLabel(lang, 'channel', donation.receiptChannel || 'none')}{' '}
                    {donation.maskedReceiptContact || ''}
                </td>
            </tr>
        ))}
    </Table>
);

const ReconciliationPage = ({ lang }: { lang: Lang }) => {
    const [rows, setRows] = useState<ReconciliationRow[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        api.reconciliation()
            .then(setRows)
            .catch((requestError: Error) => setError(requestError.message));
    }, []);

    return (
        <AdminTable
            title={t(lang, 'reconciliation')}
            heads={[
                t(lang, 'donation'),
                t(lang, 'campaign'),
                t(lang, 'amount'),
                t(lang, 'donationStatus'),
                t(lang, 'mastercardId'),
                t(lang, 'mastercardStatus'),
                t(lang, 'match'),
                t(lang, 'source'),
                t(lang, 'created'),
            ]}
            rows={rows.map((row) => ({
                id: row.id,
                cells: [
                    <span className="font-mono text-xs text-slate-500">{row.donationId}</span>,
                    row.campaignName,
                    <span className="font-medium text-slate-900">{money(row.amount, row.currency)}</span>,
                    <StatusBadge lang={lang} status={row.donationStatus} />,
                    <span className="font-mono text-xs text-slate-500">{row.mastercardTransactionId}</span>,
                    enumLabel(lang, 'status', row.mastercardStatus),
                    <StatusBadge lang={lang} status={row.matchState} />,
                    row.source,
                    formatDate(row.createdAt),
                ],
            }))}
            error={error}
            lang={lang}
        />
    );
};

const AuditPage = ({ lang }: { lang: Lang }) => {
    const [rows, setRows] = useState<AuditRow[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        api.audit()
            .then(setRows)
            .catch((requestError: Error) => setError(requestError.message));
    }, []);

    return (
        <AdminTable
            title={t(lang, 'audit')}
            heads={[
                t(lang, 'created'),
                t(lang, 'actor'),
                t(lang, 'actions'),
                t(lang, 'entityType'),
                t(lang, 'entityId'),
            ]}
            rows={rows.map((row) => ({
                id: row.id,
                cells: [
                    formatDate(row.createdAt),
                    row.actorName === 'System' ? t(lang, 'system') : row.actorName,
                    <Badge tone="blue">{enumLabel(lang, 'action', row.action)}</Badge>,
                    enumLabel(lang, 'entity', row.entityType),
                    <span className="font-mono text-xs text-slate-500">{row.entityId}</span>,
                ],
            }))}
            error={error}
            lang={lang}
        />
    );
};

const AdminTable = ({
    title,
    heads,
    lang,
    rows,
    error,
}: {
    title: string;
    heads: string[];
    lang: Lang;
    rows: { id: string; cells: React.ReactNode[] }[];
    error: string;
}) => (
    <main>
        <PageHeading title={title} />
        <Table heads={heads}>
            {rows.length === 0 && <EmptyRow colSpan={heads.length} label={t(lang, 'nothingToShow')} />}
            {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    {row.cells.map((cell, index) => (
                        <td key={index} className="px-4 py-3 text-slate-600">
                            {cell}
                        </td>
                    ))}
                </tr>
            ))}
        </Table>
        <ErrorAlert error={error} />
    </main>
);
