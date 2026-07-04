import { enumLabel, classNames } from '../utils';
import type { Lang } from '../i18n';

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

export const IconTap = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M8 11V6a2 2 0 1 1 4 0v5" />
    <path d="M12 11V4.5a2 2 0 1 1 4 0V11" />
    <path d="M16 11V7a2 2 0 1 1 4 0v7a6 6 0 0 1-6 6h-2.5a6 6 0 0 1-4.9-2.5l-2.2-3.1a2 2 0 0 1 3.2-2.4L8 12" />
  </Svg>
);

export const IconAlert = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </Svg>
);

export const IconCheckCircle = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" />
    <path d="m9 11 3 3L22 4" />
  </Svg>
);

export const IconGlobe = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z" />
  </Svg>
);

export const IconCoins = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="8" cy="8" r="5" />
    <path d="M18.1 5.3a5 5 0 0 1 0 13.4" />
    <path d="M7 15.3A5 5 0 0 0 16 19" />
  </Svg>
);

export const IconReceipt = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z" />
    <path d="M8 8h8" />
    <path d="M8 12h8" />
  </Svg>
);

export const IconTrend = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M3 3v18h18" />
    <path d="m7 14 3-3 3 3 4-5" />
  </Svg>
);

export const IconTarget = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </Svg>
);

export const IconChart = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M3 3v18h18" />
    <rect x="7" y="11" width="3" height="6" rx="1" />
    <rect x="13" y="7" width="3" height="10" rx="1" />
  </Svg>
);

export const IconList = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M8 6h13" />
    <path d="M8 12h13" />
    <path d="M8 18h13" />
    <path d="M3 6h.01M3 12h.01M3 18h.01" />
  </Svg>
);

export const IconScale = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 3v18" />
    <path d="M7 21h10" />
    <path d="M5 7h14" />
    <path d="m5 7-2.5 5a3 3 0 0 0 5 0Z" />
    <path d="m19 7-2.5 5a3 3 0 0 0 5 0Z" />
  </Svg>
);

export const IconShield = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 3 5 6v6c0 4.4 3 7.5 7 9 4-1.5 7-4.6 7-9V6Z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);

export const Spinner = ({ className }: IconProps) => (
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

export const Card = ({
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

export const Button = ({
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

export const linkButtonClass =
  'focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800';

export type Tone = 'brand' | 'green' | 'amber' | 'red' | 'slate' | 'blue';

export const toneStyles: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-600/20',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  slate: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  blue: 'bg-sky-50 text-sky-700 ring-sky-600/20',
};

export const Badge = ({
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

export const StatusBadge = ({
  lang,
  status,
}: {
  lang: Lang;
  status: string;
}) => (
  <Badge tone={statusTone(status)}>
    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
    {enumLabel(lang, 'status', status)}
  </Badge>
);

export const ErrorAlert = ({ error }: { error: string }) => (
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

export const FieldError = ({
  id,
  error,
}: {
  id: string;
  error: string;
}) => (
  <p id={id} className="mt-1.5 flex items-center gap-1.5 text-sm text-red-700">
    <IconAlert className="h-3.5 w-3.5 shrink-0" />
    {error}
  </p>
);

export const Field = ({
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

export const TextInput = ({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input className={classNames('field-input', className)} {...props} />
);

export const Select = ({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className={classNames('field-input', className)} {...props}>
    {children}
  </select>
);

export const Textarea = ({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={classNames('field-input', className)} {...props} />
);

export const Toggle = ({
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

export const PageHeading = ({
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

export const EmptyRow = ({
  colSpan,
  label,
}: {
  colSpan: number;
  label: string;
}) => (
  <tr>
    <td
      colSpan={colSpan}
      className="px-4 py-10 text-center text-sm text-slate-500"
    >
      {label}
    </td>
  </tr>
);

export const Table = ({
  heads,
  children,
}: {
  heads: string[];
  children: React.ReactNode;
}) => (
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
        <tbody>{children}</tbody>
      </table>
    </div>
  </Card>
);
