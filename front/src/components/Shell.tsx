import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { t, type Lang } from '../i18n';
import { IconGlobe, IconTap, Toggle } from './ui';

const useLocalBoolean = (key: string) => {
    const [value, setValue] = useState(() => localStorage.getItem(key) === '1');

    const update = (next: boolean) => {
        localStorage.setItem(key, next ? '1' : '0');
        setValue(next);
    };

    return [value, update] as const;
};

export const Shell = ({
    children,
    lang,
    setLang,
}: {
    children: React.ReactNode;
    lang: Lang;
    setLang: (lang: Lang) => void;
}) => {
    const [isLargeText, setLargeText] = useLocalBoolean('tap_large_text');
    const [isHighContrast, setHighContrast] = useLocalBoolean('tap_high_contrast');

    useEffect(() => {
        document.documentElement.lang = lang;
        document.body.classList.toggle('large-text', isLargeText);
        document.body.classList.toggle('high-contrast', isHighContrast);
    }, [isHighContrast, isLargeText, lang]);

    return (
        <div className="flex min-h-screen flex-col">
            <header className="no-print sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
                    <Link className="focus-ring group flex items-center gap-2.5 rounded-xl" to="/">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm transition group-hover:bg-brand-800">
                            <IconTap className="h-5 w-5" />
                        </span>
                        <span className="text-lg font-extrabold tracking-tight text-slate-900">Tap For Good</span>
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
                                <option value="en">{t(lang, 'languageEn')}</option>
                                <option value="mt">{t(lang, 'languageMt')}</option>
                            </select>
                        </label>
                        <div className="hidden h-6 w-px bg-slate-200 sm:block" />
                        <Toggle checked={isLargeText} onChange={setLargeText} label={t(lang, 'largeText')} />
                        <Toggle checked={isHighContrast} onChange={setHighContrast} label={t(lang, 'highContrast')} />
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
                Tap For Good · {t(lang, 'contactlessGivingDemo')}
            </footer>
        </div>
    );
};
