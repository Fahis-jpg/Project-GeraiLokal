import { useState } from 'react';
import api from './api';

export default function Login({
  onLoginSuccess,
  onSwitchToRegister,
  onClose,
  initialNotice = '',
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [googleNote, setGoogleNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Masukkan email dan kata sandi yang valid.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        email: trimmedEmail,
        password,
      });

      if (res.data?.success && res.data?.data) {
        onLoginSuccess(res.data.data);
      } else {
        setErrorMessage('Login berhasil, tetapi data sesi tidak diterima.');
      }
    } catch (err) {
      const data = err.response?.data;
      const msg =
        data?.errors?._form?.[0] ||
        (data?.errors && Object.values(data.errors).flat()[0]) ||
        data?.message ||
        'Email atau kata sandi tidak cocok.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto grid place-items-center px-3 py-4 sm:px-5 sm:py-8 text-[#17233b] bg-[radial-gradient(ellipse_at_50%_45%,#eef1f3_0%,#e3e8ec_52%,#d5dee7_100%)]">
      <main className="w-full max-w-[1120px] grid grid-cols-1 sm:grid-cols-[minmax(58px,0.4fr)_minmax(270px,360px)_minmax(58px,0.4fr)] md:grid-cols-[minmax(180px,1fr)_minmax(320px,410px)_minmax(180px,1fr)] items-center gap-3 md:gap-7">
        {/* Ilustrasi Kiri */}
        <div
          className="hidden sm:block w-full max-w-[330px] justify-self-center drop-shadow-[0_14px_14px_rgba(37,50,74,0.09)]"
          aria-hidden="true"
        >
          <svg viewBox="0 0 340 390" role="presentation" className="block w-full h-auto">
            <ellipse cx="170" cy="350" rx="140" ry="18" fill="#becbd6" />
            <path
              d="M31 210c8-78 68-139 139-139s131 61 139 139c4 41-9 77-37 101H68c-28-24-41-60-37-101Z"
              fill="#c8d6e0"
            />
            <circle cx="87" cy="92" r="23" fill="#f6bd27" />
            <path d="m87 58 6 22 22 7-22 7-6 22-7-22-22-7 22-7 7-22Z" fill="#fff8dc" />
            <path d="M56 324h231l-20 24H75l-19-24Z" fill="#f1b322" />
            <path
              d="M112 157c0-39 20-62 48-62 29 0 50 24 50 61l-9 29h-86l-3-28Z"
              fill="#26344f"
            />
            <circle cx="160" cy="160" r="34" fill="#f3bd9d" />
            <path
              d="M126 157c4-33 20-52 42-52 21 0 36 15 41 41-19-1-31-10-40-21-9 17-24 27-43 32Z"
              fill="#26344f"
            />
            <path
              d="M126 207c-25 16-37 44-38 91l-4 26h143l-8-75c-4-30-21-47-51-51l-9 27-17-25-16 7Z"
              fill="#335074"
            />
            <path
              d="m147 205 20 24-19 22-20-35 19-11Zm25 0-5 24 18 21 11-36-24-9Z"
              fill="#f5bd27"
            />
            <path
              d="M90 254c14-8 29-8 43-2l28 15-10 18-35-9-24 13-11-19 9-16Z"
              fill="#f3bd9d"
            />
            <path d="M142 267h112l-8 59H142v-59Z" fill="#fffdf7" />
            <path d="M155 279h87v37h-87z" fill="#dbe4eb" />
            <path
              d="M176 291h46m-46 9h30"
              stroke="#9eafbf"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M63 295c-14-19-15-37-4-54m7 31c16-12 21-27 17-44m157 64c15-12 20-26 17-42"
              fill="none"
              stroke="#547b69"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M58 253c-13 0-21-8-24-22 14 0 25 7 30 19m19-23c1-15 9-24 22-27 1 14-5 24-18 30m132 60c12-12 25-14 37-6-9 12-21 16-35 13"
              fill="#789c79"
            />
          </svg>
        </div>

        {/* Kartu Login Utama */}
        <section
          className="w-full px-5 py-6 sm:px-[30px] sm:pt-7 sm:pb-6 border border-[#f1eee5] rounded-[20px] bg-[#fffdf7] shadow-[0_12px_26px_rgba(30,43,60,0.14)]"
          aria-labelledby="page-title"
        >
          <div className="flex justify-center items-center gap-1.5 mb-3 text-[#243148] text-[13px] font-extrabold tracking-[-0.3px]">
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
            className="m-0 mb-5 text-center text-[20px] font-bold tracking-[-0.35px]"
          >
            Selamat Datang Kembali!
          </h1>

          {initialNotice && (
            <p
              className="m-0 mb-3.5 px-3 py-2.5 rounded-lg text-[12px] leading-[1.45] border border-[#b9dfc5] bg-[#f0fff4] text-[#22633b]"
              role="status"
            >
              {initialNotice}
            </p>
          )}

          {errorMessage && (
            <p
              className="m-0 mb-3.5 px-3 py-2.5 rounded-lg text-[12px] leading-[1.45] border border-[#f1c7c7] bg-[#fff2f1] text-[#9b3535]"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          <form onSubmit={handleSubmit} autoComplete="on">
            <label className="block m-0 mb-[13px]">
              <span className="block m-0 mb-[5px] text-[#647084] text-[11px] font-semibold">
                Email
              </span>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                autoComplete="email"
                required
                className="w-full h-[39px] px-3 border border-[#dfe3e8] rounded-lg bg-white text-[#202b3e] text-[12px] outline-none transition focus:border-[#61738e] focus:ring-[3px] focus:ring-[#34445e]/10"
              />
            </label>

            <label className="block m-0 mb-[13px]">
              <span className="block m-0 mb-[5px] text-[#647084] text-[11px] font-semibold">
                Kata Sandi
              </span>
              <input
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                autoComplete="current-password"
                required
                className="w-full h-[39px] px-3 border border-[#dfe3e8] rounded-lg bg-white text-[#202b3e] text-[12px] outline-none transition focus:border-[#61738e] focus:ring-[3px] focus:ring-[#34445e]/10"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[39px] flex items-center justify-center gap-2 rounded-lg border-0 bg-[#26344f] hover:bg-[#1b2942] disabled:opacity-60 text-white text-[11px] font-extrabold tracking-[0.35px] shadow-[0_3px_6px_rgba(38,52,79,0.15)] cursor-pointer transition"
            >
              {loading ? 'MEMPROSES...' : 'MASUK'}
            </button>
          </form>

          <div className="flex items-center gap-2.5 my-3 text-[#9aa2ad] text-[9px] before:content-[''] before:h-px before:flex-1 before:bg-[#e4e6e9] after:content-[''] after:h-px after:flex-1 after:bg-[#e4e6e9]">
            ATAU
          </div>

          <button
            type="button"
            onClick={() => setGoogleNote('Login dengan Google belum tersedia.')}
            className="w-full min-h-[39px] flex items-center justify-center gap-[9px] rounded-lg border border-[#d7d9de] bg-white hover:bg-[#f8f9fb] text-[#27344b] text-[11px] font-extrabold tracking-[0.35px] cursor-pointer transition"
          >
            <img
              className="w-[15px] h-[15px] object-contain"
              src="/Images/Google.png"
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            MASUK DENGAN GOOGLE
          </button>

          <p
            className="min-h-[15px] mt-1.5 mb-0 text-center text-[#7a8492] text-[10px]"
            aria-live="polite"
          >
            {googleNote}
          </p>

          <p className="mt-4 mb-0 text-center text-[#697487] text-[10px]">
            Belum mempunyai akun?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-[#26344f] font-bold hover:underline bg-transparent border-0 p-0 cursor-pointer"
            >
              Daftar
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
            <circle cx="273" cy="94" r="17" fill="#f5bd28" />
            <path
              d="m264 94 7 7 13-16"
              fill="none"
              stroke="#fffdf7"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="m71 185 18 105h130l19-78H95"
              fill="none"
              stroke="#26344f"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M100 222h122l-9 43H108l-8-43Z" fill="#fffdf7" />
            <path
              d="M111 240h98m-93 13h88"
              stroke="#d7e0e7"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <circle cx="122" cy="307" r="12" fill="#26344f" />
            <circle cx="199" cy="307" r="12" fill="#26344f" />
            <path
              d="M109 221v-29c0-19 10-32 25-32s25 13 25 32v29"
              fill="#f5b52a"
            />
            <path
              d="M173 221v-24c0-18 10-30 24-30s24 12 24 30v24"
              fill="#f1a323"
            />
            <path
              d="M104 185c0-25 11-41 30-41s30 16 30 41"
              fill="none"
              stroke="#26344f"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M173 169c0-25 10-40 24-40s24 15 24 40"
              fill="none"
              stroke="#26344f"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M255 165c0-26 20-40 41-45 21 5 41 19 41 45 0 42-25 68-41 78-16-10-41-36-41-78Z"
              fill="#f5bd28"
              stroke="#fff7dc"
              strokeWidth="6"
            />
            <rect x="278" y="169" width="36" height="31" rx="5" fill="#26344f" />
            <path
              d="M286 169v-9c0-8 4-12 10-12s10 4 10 12v9"
              fill="none"
              stroke="#26344f"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <circle cx="296" cy="183" r="3" fill="#f5bd28" />
            <path
              d="M43 298c-12-17-11-33 2-49m-4 22c14-10 18-22 14-38"
              fill="none"
              stroke="#547b69"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M44 262c-12-1-20-8-22-21 13 0 23 6 28 17m7-24c1-14 9-22 21-24 0 13-5 23-17 28"
              fill="#789c79"
            />
          </svg>
        </div>
      </main>
    </div>
  );
}