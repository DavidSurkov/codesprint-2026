import { useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Shell } from './components/Shell';
import { getInitialLang, type Lang } from './i18n';
import { AdminShell } from './routes/AdminShell';
import { Confirmation } from './routes/Confirmation';
import { DonorHome } from './routes/DonorHome';
import { Login } from './routes/Login';

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
