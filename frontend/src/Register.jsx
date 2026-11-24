import { useState } from 'react';
import api from './api';

export default function Register({
  onRegisterSuccess,
  onSwitchToLogin,
  onClose,
}) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    terms: false,
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [noteMessage, setNoteMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const firstName = form.first_name.trim();
    const lastName = form.last_name.trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const email = form.email.trim();

    if (!firstName || !lastName || fullName.length > 100) {
      setErrorMessage('Masukkan nama depan dan nama belakang (maksimal 100 karakter).');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage('Masukkan alamat email yang valid.');
      return;
    }
    if (form.password.length < 8 || form.password.length > 72) {
      setErrorMessage('Kata sandi harus terdiri dari 8 sampai 72 karakter.');
      return;
    }
    if (!form.terms) {
      setErrorMessage('Setujui syarat dan ketentuan untuk melanjutkan.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        name: fullName,
        email,
        password: form.password,
        role: 'buyer',
      });

      if (res.data?.success) {
        onRegisterSuccess('Akun berhasil dibuat. Silakan masuk.');
      } else {
        setErrorMessage(
          res.data?.message || 'Pendaftaran tidak berhasil. Periksa kembali data Anda.'
        );
      }
    } catch (err) {
      const data = err.response?.data;
      const msg =
        data?.errors?.email?.[0] ||
        data?.errors?.name?.[0] ||
        (data?.errors && Object.values(data.errors).flat()[0]) ||
        data?.message ||
        'Pendaftaran tidak berhasil. Periksa kembali data Anda.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto grid place-items-center px-3 py-4 sm:px-5 sm:py-8 text-[#17233b] bg-[radial-gradient(ellipse_at_50%_45%,#eef1f3_0%,#e3e8ec_52%,#d5dee7_100%)]">
      <main className="w-full max-w-[1120px] grid grid-cols-1 sm:grid-cols-[minmax(58px,0.4fr)_minmax(270px,360px)_minmax(58px,0.4fr)] md:grid-cols-[minmax(180px,1fr)_minmax(320px,430px)_minmax(180px,1fr)] items-center gap-3 md:gap-7">
        {/* Ilustrasi Kiri */}
        <div
          className="hidden sm:block w-full max-w-[330px] justify-self-center drop-shadow-[0_14px_14px_rgba(37,50,74,0.09)]"
          aria-hidden="true"
        >
          <svg viewBox="0 0 340 390" role="presentation" className="block w-full h-auto">
            <ellipse cx="169" cy="350" rx="137" ry="18" fill="#becbd6" />
            <path
              d="M37 193c13-71 68-126 136-126s123 55 136 126c8 44-7 91-43 123H80c-36-32-51-79-43-123Z"
              fill="#c8d6e0"
            />
            <path d="M47 309h246l-20 39H66l-19-39Z" fill="#f3b51b" />
            <path d="M91 141h94l10 168H79l12-168Z" fill="#ffd04a" />
            <path
              d="M108 143c0-31 13-52 30-52s30 21 30 52"
              fill="none"
              stroke="#1d2b45"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path d="M209 198h71l10 111h-91l10-111Z" fill="#f5a928" />
            <path
              d="M224 200c0-23 10-39 25-39s25 16 25 39"
              fill="none"
              stroke="#26344f"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path d="M225 250h58v59h-58z" fill="#e58f21" />
            <path d="M118 218h42v58h-42z" fill="#fff5d5" />
            <path
              d="M126 231h26m-26 12h26"
              stroke="#5f7891"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path
              d="M65 287c-18-22-20-45-5-67m6 37c22-17 26-35 22-53m166 70c20-17 26-35 20-54"
              fill="none"
              stroke="#547b69"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M58 242c-15-2-26-12-29-28 15 0 28 8 34 22m20-26c2-17 11-27 25-31 1 16-6 28-21 35m166 73c13-14 28-16 42-8-10 13-24 18-40 14"
              fill="#789c79"
            />
            <circle cx="254" cy="97" r="13" fill="#f4bb25" />
            <path d="m254 77 3 12 11 4-11 4-3 12-4-12-11-4 11-4 4-12Z" fill="#fff7db" />
            <circle cx="74" cy="104" r="7" fill="#fff6d8" />
          </svg>
        </div>

        {/* Kartu Register Utama */}
        <section
          className="w-full px-5 py-5 sm:px-[30px] sm:pt-[27px] sm:pb-[22px] border border-[#f1eee5] rounded-[20px] bg-[#fffdf7] shadow-[0_12px_26px_rgba(30,43,60,0.14)]"
          aria-labelledby="page-title"
        >
          <div className="flex justify-center items-center gap-1.5 mb-2.5 text-[#243148] text-[13px] font-extrabold tracking-[-0.3px]">
            <img
              className="w-[25px] h-[25px] object-contain"
              src="/Images/Logo.png"
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span>
              Gerai<span className="text-[#d39b16]">Lokal</span>
            </span>
          </div>

          <h1
            id="page-title"
            className="m-0 mb-4 text-center text-[20px] font-bold tracking-[-0.35px]"
          >
            Buat Akun
          </h1>

          {errorMessage && (
            <p
              className="m-0 mb-[13px] px-3 py-2.5 border border-[#f1c7c7] rounded-lg bg-[#fff2f1] text-[#9b3535] text-[12px] leading-[1.45]"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <form onSubmit={handleSubmit} autoComplete="on">
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
              <label className="block m-0 mb-[11px]">
                <span className="block m-0 mb-[5px] text-[#647084] text-[11px] font-semibold">
                  Nama Depan
                </span>
                <input
                  type="text"
                  name="first_name"
                  value={form.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  placeholder="Nama depan"
                  autoComplete="given-name"
                  maxLength={100}
                  required
                  className="w-full h-[37px] px-[11px] border border-[#dfe3e8] rounded-lg bg-white text-[#202b3e] text-[11px] outline-none transition focus:border-[#61738e] focus:ring-[3px] focus:ring-[#34445e]/10"
                />
              </label>

              <label className="block m-0 mb-[11px]">
                <span className="block m-0 mb-[5px] text-[#647084] text-[11px] font-semibold">
                  Nama Belakang
                </span>
                <input
                  type="text"
                  name="last_name"
                  value={form.last_name}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                  placeholder="Nama belakang"
                  autoComplete="family-name"
                  maxLength={100}
                  required
                  className="w-full h-[37px] px-[11px] border border-[#dfe3e8] rounded-lg bg-white text-[#202b3e] text-[11px] outline-none transition focus:border-[#61738e] focus:ring-[3px] focus:ring-[#34445e]/10"
                />
              </label>
            </div>

            <label className="block m-0 mb-[11px]">
              <span className="block m-0 mb-[5px] text-[#647084] text-[11px] font-semibold">
                Email
              </span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="nama@email.com"
                autoComplete="email"
                required
                className="w-full h-[37px] px-[11px] border border-[#dfe3e8] rounded-lg bg-white text-[#202b3e] text-[11px] outline-none transition focus:border-[#61738e] focus:ring-[3px] focus:ring-[#34445e]/10"
              />
            </label>

            <label className="block m-0 mb-[11px]">
              <span className="block m-0 mb-[5px] text-[#647084] text-[11px] font-semibold">
                Kata Sandi
              </span>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                className="w-full h-[37px] px-[11px] border border-[#dfe3e8] rounded-lg bg-white text-[#202b3e] text-[11px] outline-none transition focus:border-[#61738e] focus:ring-[3px] focus:ring-[#34445e]/10"
              />
            </label>

            <label className="flex items-start gap-2 mt-1 mb-3.5 text-[#657084] text-[10px] leading-[1.45] cursor-pointer">
              <input
                type="checkbox"
                name="terms"
                checked={form.terms}
                onChange={(e) => handleChange('terms', e.target.checked)}
                required
                className="w-3.5 h-3.5 mt-0.5 accent-[#26344f]"
              />
              <span>
                Saya menyetujui{' '}
                <button
                  type="button"
                  onClick={() =>
                    setNoteMessage('Syarat dan ketentuan akan tersedia segera.')
                  }
                  className="text-[#26344f] font-bold hover:underline bg-transparent border-0 p-0 cursor-pointer"
                >
                  Syarat dan Ketentuan
                </button>{' '}
                GeraiLokal.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[38px] flex items-center justify-center gap-2 rounded-lg border-0 bg-[#26344f] hover:bg-[#1b2942] disabled:opacity-60 text-white text-[10px] font-extrabold tracking-[0.35px] shadow-[0_3px_6px_rgba(38,52,79,0.15)] cursor-pointer transition"
            >
              {loading ? 'MEMPROSES...' : 'DAFTAR'}
            </button>
          </form>

          <div className="flex items-center gap-2.5 my-2.5 text-[#9aa2ad] text-[9px] before:content-[''] before:h-px before:flex-1 before:bg-[#e4e6e9] after:content-[''] after:h-px after:flex-1 after:bg-[#e4e6e9]">
            ATAU
          </div>

          <button
            type="button"
            onClick={() =>
              setNoteMessage('Pendaftaran dengan Google belum tersedia.')
            }
            className="w-full min-h-[38px] flex items-center justify-center gap-[9px] rounded-lg border border-[#d7d9de] bg-white hover:bg-[#f8f9fb] text-[#27344b] text-[10px] font-extrabold tracking-[0.35px] cursor-pointer transition"
          >
            <img
              className="w-[15px] h-[15px] object-contain"
              src="/Images/Google.png"
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            DAFTAR DENGAN GOOGLE
          </button>

          <p
            className="min-h-[14px] mt-1.5 mb-0 text-center text-[#7a8492] text-[10px]"
            aria-live="polite"
          >
            {noteMessage}
          </p>

          <p className="mt-3 mb-0 text-center text-[#697487] text-[10px]">
            Sudah mempunyai akun?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-[#26344f] font-bold hover:underline bg-transparent border-0 p-0 cursor-pointer"
            >
              Masuk
            </button>
          </p>

          {onClose && (
            <p className="mt-2 mb-0 text-center">
              <button
                type="button"
                onClick={onClose}
                className="text-[#7a8492] hover:text-[#26344f] text-[10px] underline bg-transparent border-0 p-0 cursor-pointer"
              >
                Kembali ke Katalog
              </button>
            </p>
          )}
        </section>

        {/* Ilustrasi Kanan */}
        <div
          className="hidden sm:block w-full max-w-[330px] justify-self-center drop-shadow-[0_14px_14px_rgba(37,50,74,0.09)]"
          aria-hidden="true"
        >
          <svg viewBox="0 0 340 390" role="presentation" className="block w-full h-auto">
            <ellipse cx="174" cy="350" rx="140" ry="18" fill="#becbd6" />
            <path
              d="M35 190c18-74 76-122 143-122 71 0 128 53 141 122 9 47-8 91-43 122H79c-38-31-54-77-44-122Z"
              fill="#c8d6e0"
            />
            <path d="M53 311h237l-18 37H70l-17-37Z" fill="#e9a71d" />
            <path d="M60 221h61v90H51l9-90Z" fill="#f5b52a" />
            <path
              d="M69 222c0-25 8-40 22-40s22 15 22 40"
              fill="none"
              stroke="#26344f"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path d="M69 257h43v54H69z" fill="#ffd45c" />
            <path d="M175 149h109l-8 162H168l7-162Z" fill="#fffdf7" />
            <path
              d="M185 151c0-34 14-55 43-55s43 21 43 55"
              fill="none"
              stroke="#26344f"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path
              d="M198 203h60m-60 21h60m-60 21h40"
              stroke="#d4dce4"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path d="M209 269h39v42h-39z" fill="#f5b52a" />
            <path
              d="M37 291c-10-19-8-36 7-51m1 27c19-11 27-27 25-45m222 71c-13-19-11-35 3-49"
              fill="none"
              stroke="#547b69"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M42 251c-15 0-25-8-30-22 15-2 28 5 36 17m20-20c3-16 13-25 28-27 0 16-8 28-23 34m194 57c13-14 29-17 43-9-10 14-25 19-41 15"
              fill="#789c79"
            />
            <circle cx="290" cy="117" r="16" fill="#f5bd28" />
            <path d="m290 93 4 15 15 5-15 5-4 15-5-15-15-5 15-5 5-15Z" fill="#fff7db" />
            <circle cx="54" cy="123" r="7" fill="#fff7db" />
          </svg>
        </div>
      </main>
    </div>
  );
}