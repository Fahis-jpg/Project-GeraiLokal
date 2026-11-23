<?php
declare(strict_types=1);

session_start();

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

function escapeHtml($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function requestAuthApi(string $path, array $payload): array
{
    $apiBase = rtrim(getenv('GERAILOKAL_API_URL') ?: 'http://localhost:3000/api', '/');
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", [
                'Content-Type: application/json',
                'Accept: application/json',
                'X-Requested-With: XMLHttpRequest',
                'X-Token-Mode: bearer',
            ]),
            'content' => json_encode($payload),
            'ignore_errors' => true,
            'timeout' => 10,
        ],
    ]);

    $response = @file_get_contents($apiBase . $path, false, $context);
    if ($response === false) {
        return ['ok' => false, 'message' => 'Server autentikasi tidak dapat dihubungi.'];
    }

    $data = json_decode($response, true);
    if (!is_array($data)) {
        return ['ok' => false, 'message' => 'Server mengirim respons yang tidak valid.'];
    }

    $status = 0;
    foreach ($http_response_header ?? [] as $header) {
        if (preg_match('/^HTTP\/\S+\s+(\d{3})/', $header, $matches)) {
            $status = (int) $matches[1];
        }
    }

    return [
        'ok' => $status >= 200 && $status < 300 && !empty($data['success']),
        'data' => $data,
    ];
}

$email = '';
$errorMessage = '';
$noticeMessage = isset($_GET['registered']) ? 'Akun berhasil dibuat. Silakan masuk.' : '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim((string) ($_POST['email'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');
    $postedToken = (string) ($_POST['csrf_token'] ?? '');

    if (!hash_equals($_SESSION['csrf_token'], $postedToken)) {
        $errorMessage = 'Sesi formulir tidak valid. Muat ulang halaman lalu coba kembali.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
        $errorMessage = 'Masukkan email dan kata sandi yang valid.';
    } else {
        $result = requestAuthApi('/auth/login', [
            'email' => $email,
            'password' => $password,
        ]);

        if (!$result['ok']) {
            $data = $result['data'] ?? [];
            $errorMessage = $data['errors']['_form'][0]
                ?? $data['message']
                ?? $result['message']
                ?? 'Email atau kata sandi tidak cocok.';
        } else {
            $tokens = $result['data'];
            if (empty($tokens['access_token']) || empty($tokens['refresh_token'])) {
                $errorMessage = 'Login berhasil, tetapi token sesi tidak diterima.';
            } else {
                session_regenerate_id(true);
                $secureCookie = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
                setcookie('access_token', $tokens['access_token'], [
                    'expires' => time() + 900,
                    'path' => '/',
                    'secure' => $secureCookie,
                    'httponly' => true,
                    'samesite' => 'Lax',
                ]);
                setcookie('refresh_token', $tokens['refresh_token'], [
                    'expires' => time() + 604800,
                    'path' => '/api/auth',
                    'secure' => $secureCookie,
                    'httponly' => true,
                    'samesite' => 'Lax',
                ]);

                $frontendUrl = getenv('GERAILOKAL_FRONTEND_URL') ?: 'http://localhost:5173';
                header('Location: ' . $frontendUrl, true, 303);
                exit;
            }
        }
    }
}
?>
<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#dce4ec">
    <title>Masuk - GeraiLokal</title>
    <style>
        :root{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#17233b;background:#dce4ec;font-synthesis:none;text-rendering:optimizeLegibility}
        *{box-sizing:border-box}
        body{margin:0;min-height:100vh;display:grid;place-items:center;padding:32px 20px;background:radial-gradient(ellipse at 50% 45%,#eef1f3 0,#e3e8ec 52%,#d5dee7 100%)}
        .layout{width:min(1120px,100%);display:grid;grid-template-columns:minmax(180px,1fr) minmax(320px,410px) minmax(180px,1fr);align-items:center;gap:28px}
        .art{width:100%;max-width:330px;justify-self:center;filter:drop-shadow(0 14px 14px #25324a18)}
        .art svg{display:block;width:100%;height:auto}
        .card{width:100%;padding:28px 30px 24px;border:1px solid #f1eee5;border-radius:20px;background:#fffdf7;box-shadow:0 12px 26px #1e2b3c23}
        .brand{display:flex;justify-content:center;align-items:center;gap:6px;margin-bottom:12px;color:#243148;font-size:13px;font-weight:800;letter-spacing:-.3px}
        .brand-mark{width:25px;height:25px;object-fit:contain}
        .brand span span{color:#d39b16}
        h1{margin:0 0 20px;text-align:center;font-size:20px;letter-spacing:-.35px}
        .field{display:block;margin:0 0 13px}
        .field span{display:block;margin:0 0 5px;color:#647084;font-size:11px;font-weight:600}
        .field input{width:100%;height:39px;padding:0 12px;border:1px solid #dfe3e8;border-radius:8px;background:#fff;color:#202b3e;font:inherit;font-size:12px;outline:none;transition:border-color .15s,box-shadow .15s}
        .field input:focus{border-color:#61738e;box-shadow:0 0 0 3px #34445e16}
        .message{margin:0 0 14px;padding:10px 12px;border-radius:8px;font-size:12px;line-height:1.45}
        .error{border:1px solid #f1c7c7;background:#fff2f1;color:#9b3535}
        .notice{border:1px solid #b9dfc5;background:#f0fff4;color:#22633b}
        .submit,.google{width:100%;min-height:39px;display:flex;align-items:center;justify-content:center;gap:9px;border-radius:8px;font:inherit;font-size:11px;font-weight:800;letter-spacing:.35px;cursor:pointer}
        .submit{border:0;background:#26344f;color:white;box-shadow:0 3px 6px #26344f27}
        .submit:hover{background:#1b2942}
        .divider{display:flex;align-items:center;gap:10px;margin:12px 0;color:#9aa2ad;font-size:9px}
        .divider:before,.divider:after{content:"";height:1px;flex:1;background:#e4e6e9}
        .google{border:1px solid #d7d9de;background:#fff;color:#27344b}
        .google:hover{background:#f8f9fb}
        .google-mark{width:15px;height:15px;object-fit:contain}
        .footer{margin:16px 0 0;text-align:center;color:#697487;font-size:10px}
        .footer a{color:#26344f;font-weight:700;text-decoration:none}
        .footer a:hover{text-decoration:underline}
        .google-note{min-height:15px;margin:6px 0 0;text-align:center;color:#7a8492;font-size:10px}
        @media(max-width:760px){body{padding:12px 14px}.layout{width:min(680px,100%);grid-template-columns:minmax(58px,.4fr) minmax(270px,310px) minmax(58px,.4fr);gap:10px}.art{display:block}.card{padding:23px 18px}}
        @media(max-width:560px){.layout{max-width:430px;display:block}.art{display:none}.card{padding:25px 24px}}
        @media(max-width:380px){body{padding:18px 12px}.card{padding:24px 18px}}
    </style>
</head>
<body>
    <main class="layout">
        <div class="art" aria-hidden="true">
            <svg viewBox="0 0 340 390" role="presentation">
                <ellipse cx="170" cy="350" rx="140" ry="18" fill="#becbd6"/>
                <path d="M31 210c8-78 68-139 139-139s131 61 139 139c4 41-9 77-37 101H68c-28-24-41-60-37-101Z" fill="#c8d6e0"/>
                <circle cx="87" cy="92" r="23" fill="#f6bd27"/>
                <path d="m87 58 6 22 22 7-22 7-6 22-7-22-22-7 22-7 7-22Z" fill="#fff8dc"/>
                <path d="M56 324h231l-20 24H75l-19-24Z" fill="#f1b322"/>
                <path d="M112 157c0-39 20-62 48-62 29 0 50 24 50 61l-9 29h-86l-3-28Z" fill="#26344f"/>
                <circle cx="160" cy="160" r="34" fill="#f3bd9d"/>
                <path d="M126 157c4-33 20-52 42-52 21 0 36 15 41 41-19-1-31-10-40-21-9 17-24 27-43 32Z" fill="#26344f"/>
                <path d="M126 207c-25 16-37 44-38 91l-4 26h143l-8-75c-4-30-21-47-51-51l-9 27-17-25-16 7Z" fill="#335074"/>
                <path d="m147 205 20 24-19 22-20-35 19-11Zm25 0-5 24 18 21 11-36-24-9Z" fill="#f5bd27"/>
                <path d="M90 254c14-8 29-8 43-2l28 15-10 18-35-9-24 13-11-19 9-16Z" fill="#f3bd9d"/>
                <path d="M142 267h112l-8 59H142v-59Z" fill="#fffdf7"/>
                <path d="M155 279h87v37h-87z" fill="#dbe4eb"/>
                <path d="M176 291h46m-46 9h30" stroke="#9eafbf" stroke-width="4" stroke-linecap="round"/>
                <path d="M63 295c-14-19-15-37-4-54m7 31c16-12 21-27 17-44m157 64c15-12 20-26 17-42" fill="none" stroke="#547b69" stroke-width="7" stroke-linecap="round"/>
                <path d="M58 253c-13 0-21-8-24-22 14 0 25 7 30 19m19-23c1-15 9-24 22-27 1 14-5 24-18 30m132 60c12-12 25-14 37-6-9 12-21 16-35 13" fill="#789c79"/>
            </svg>
        </div>
        <section class="card" aria-labelledby="page-title">
            <div class="brand">
                <img class="brand-mark" src="frontend/Images/Logo.png" alt="">
                <span>Gerai<span>Lokal</span></span>
            </div>
            <h1 id="page-title">Selamat Datang Kembali!</h1>

            <?php if ($noticeMessage !== ''): ?>
                <p class="message notice" role="status"><?= escapeHtml($noticeMessage) ?></p>
            <?php endif; ?>
            <?php if ($errorMessage !== ''): ?>
                <p class="message error" role="alert"><?= escapeHtml($errorMessage) ?></p>
            <?php endif; ?>

            <form method="post" action="login.php" autocomplete="on">
                <input type="hidden" name="csrf_token" value="<?= escapeHtml($_SESSION['csrf_token']) ?>">
                <label class="field">
                    <span>Email</span>
                    <input type="email" name="email" value="<?= escapeHtml($email) ?>" placeholder="nama@email.com" autocomplete="email" required>
                </label>
                <label class="field">
                    <span>Kata Sandi</span>
                    <input type="password" name="password" placeholder="Masukkan kata sandi" autocomplete="current-password" required>
                </label>
                <button class="submit" type="submit">MASUK</button>
            </form>

            <div class="divider">ATAU</div>
            <button class="google" type="button" onclick="document.getElementById('google-note').textContent='Login dengan Google belum tersedia.'">
                <img class="google-mark" src="frontend/Images/Google.png" alt="">
                MASUK DENGAN GOOGLE
            </button>
            <p class="google-note" id="google-note" aria-live="polite"></p>
            <p class="footer">Belum mempunyai akun? <a href="register.php">Daftar</a></p>
        </section>
        <div class="art" aria-hidden="true">
            <svg viewBox="0 0 340 390" role="presentation">
                <ellipse cx="174" cy="350" rx="140" ry="18" fill="#becbd6"/>
                <path d="M35 190c18-74 76-122 143-122 71 0 128 53 141 122 9 47-8 91-43 122H79c-38-31-54-77-44-122Z" fill="#c8d6e0"/>
                <path d="M53 311h237l-18 37H70l-17-37Z" fill="#e9a71d"/>
                <circle cx="273" cy="94" r="17" fill="#f5bd28"/>
                <path d="m264 94 7 7 13-16" fill="none" stroke="#fffdf7" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="m71 185 18 105h130l19-78H95" fill="none" stroke="#26344f" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M100 222h122l-9 43H108l-8-43Z" fill="#fffdf7"/>
                <path d="M111 240h98m-93 13h88" stroke="#d7e0e7" stroke-width="6" stroke-linecap="round"/>
                <circle cx="122" cy="307" r="12" fill="#26344f"/>
                <circle cx="199" cy="307" r="12" fill="#26344f"/>
                <path d="M109 221v-29c0-19 10-32 25-32s25 13 25 32v29" fill="#f5b52a"/>
                <path d="M173 221v-24c0-18 10-30 24-30s24 12 24 30v24" fill="#f1a323"/>
                <path d="M104 185c0-25 11-41 30-41s30 16 30 41" fill="none" stroke="#26344f" stroke-width="8" stroke-linecap="round"/>
                <path d="M173 169c0-25 10-40 24-40s24 15 24 40" fill="none" stroke="#26344f" stroke-width="8" stroke-linecap="round"/>
                <path d="M255 165c0-26 20-40 41-45 21 5 41 19 41 45 0 42-25 68-41 78-16-10-41-36-41-78Z" fill="#f5bd28" stroke="#fff7dc" stroke-width="6"/>
                <rect x="278" y="169" width="36" height="31" rx="5" fill="#26344f"/>
                <path d="M286 169v-9c0-8 4-12 10-12s10 4 10 12v9" fill="none" stroke="#26344f" stroke-width="7" stroke-linecap="round"/>
                <circle cx="296" cy="183" r="3" fill="#f5bd28"/>
                <path d="M43 298c-12-17-11-33 2-49m-4 22c14-10 18-22 14-38" fill="none" stroke="#547b69" stroke-width="8" stroke-linecap="round"/>
                <path d="M44 262c-12-1-20-8-22-21 13 0 23 6 28 17m7-24c1-14 9-22 21-24 0 13-5 23-17 28" fill="#789c79"/>
            </svg>
        </div>
    </main>
</body>
</html>
