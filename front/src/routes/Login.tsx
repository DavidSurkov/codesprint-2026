import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { t, type Lang } from '../i18n';
import { Button, Card, Field, IconTap, TextInput } from '../components/ui';

export const Login = ({ lang }: { lang: Lang }) => {
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
            setError(requestError instanceof Error ? requestError.message : t(lang, 'loginFailed'));
        }
    };

    return (
        <main className="mx-auto flex max-w-md flex-col px-4 py-14">
            <div className="mb-6 flex flex-col items-center text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-sm">
                    <IconTap className="h-6 w-6" />
                </span>
                <h1 className="mt-4 text-2xl font-extrabold text-slate-900">{t(lang, 'login')}</h1>
                <p className="mt-1 text-sm text-slate-500">{t(lang, 'signInAdmin')}</p>
            </div>
            <Card className="animate-scale-in p-6">
                <form className="grid gap-4" onSubmit={submit}>
                    <Field label={t(lang, 'email')} htmlFor="login-email">
                        <TextInput
                            id="login-email"
                            type="email"
                            value={email}
                            required
                            onChange={(event) => setEmail(event.target.value)}
                        />
                    </Field>
                    <Field label={t(lang, 'password')} htmlFor="login-password">
                        <TextInput
                            id="login-password"
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
