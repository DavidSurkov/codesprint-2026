import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { t, type Lang } from '../i18n';
import { IconGlobe, IconTap, Toggle } from './ui';

const useLocalBoolean = (key: string, fallback = false) => {
    const [value, setValue] = useState(() => {
        const stored = localStorage.getItem(key);
        return stored === null ? fallback : stored === '1';
    });

    const update = (next: boolean) => {
        localStorage.setItem(key, next ? '1' : '0');
        setValue(next);
    };

    return [value, update] as const;
};

const prefersDark = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

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
    const [isDark, setDark] = useLocalBoolean('tap_dark_mode', prefersDark());

    useEffect(() => {
        const root = document.documentElement;
        root.lang = lang;
        root.classList.toggle('dark', isDark);
        root.classList.toggle('large-text', isLargeText);
        root.classList.toggle('high-contrast', isHighContrast);
        const themeColor = isHighContrast ? (isDark ? '#000000' : '#ffffff') : isDark ? '#020617' : '#047857';
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
    }, [isDark, isHighContrast, isLargeText, lang]);

    return (
        <div className="flex min-h-screen flex-col">
            <header className="no-print sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
                <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
                    <Link className="focus-ring group flex items-center gap-2.5 rounded-xl" to="/">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm transition group-hover:bg-brand-800 dark:bg-brand-600 dark:group-hover:bg-brand-500">
                            <IconTap className="h-5 w-5" />
                        </span>
                        <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                            Tap For Good
                        </span>
                    </Link>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                            <IconGlobe className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                            <span className="sr-only sm:not-sr-only">{t(lang, 'language')}</span>
                            <select
                                className="focus-ring rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-medium shadow-sm hover:border-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-500"
                                value={lang}
                                onChange={(event) => setLang(event.target.value as Lang)}
                            >
                                <option value="en">{t(lang, 'languageEn')}</option>
                                <option value="mt">{t(lang, 'languageMt')}</option>
                            </select>
                        </label>
                        <div className="hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
                        <Toggle checked={isDark} onChange={setDark} label={t(lang, 'darkMode')} />
                        <Toggle checked={isLargeText} onChange={setLargeText} label={t(lang, 'largeText')} />
                        <Toggle checked={isHighContrast} onChange={setHighContrast} label={t(lang, 'highContrast')} />
                        <div className="hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
                        <Link
                            to="/admin"
                            className="focus-ring rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-900/30"
                        >
                            {t(lang, 'admin')}
                        </Link>
                    </div>
                </div>
            </header>
            <div className="flex-1">{children}</div>
            <footer className="no-print mt-auto border-t border-slate-200/80 py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                Tap For Good · {t(lang, 'contactlessGivingDemo')}
            </footer>
        </div>
    );
};
