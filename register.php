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

$form = [
    'first_name' => '',
    'last_name' => '',
    'email' => '',
    'role' => 'buyer',
    'shop_name' => '',
];
$errorMessage = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    foreach (['first_name', 'last_name', 'email', 'role', 'shop_name'] as $field) {
        $form[$field] = trim((string) ($_POST[$field] ?? ''));
    }
    $password = (string) ($_POST['password'] ?? '');
    $postedToken = (string) ($_POST['csrf_token'] ?? '');
    $name = trim($form['first_name'] . ' ' . $form['last_name']);

    if (!hash_equals($_SESSION['csrf_token'], $postedToken)) {
        $errorMessage = 'Sesi formulir tidak valid. Muat ulang halaman lalu coba kembali.';
    } elseif ($form['first_name'] === '' || $form['last_name'] === '' || strlen($name) > 100) {
        $errorMessage = 'Masukkan nama depan dan nama belakang (maksimal 100 karakter).';
    } elseif (!filter_var($form['email'], FILTER_VALIDATE_EMAIL)) {
        $errorMessage = 'Masukkan alamat email yang valid.';
    } elseif (strlen($password) < 8 || strlen($password) > 72) {
        $errorMessage = 'Kata sandi harus terdiri dari 8 sampai 72 karakter.';
    } elseif (!in_array($form['role'], ['buyer', 'seller'], true)) {
        $errorMessage = 'Pilih jenis akun yang valid.';
    } elseif ($form['role'] === 'seller' && $form['shop_name'] === '') {
        $errorMessage = 'Nama toko wajib diisi untuk akun penjual.';
    } elseif (strlen($form['shop_name']) > 100) {
        $errorMessage = 'Nama toko maksimal 100 karakter.';
    } elseif (empty($_POST['terms'])) {
        $errorMessage = 'Setujui syarat dan ketentuan untuk melanjutkan.';
    } else {
        $payload = [
            'name' => $name,
            'email' => $form['email'],
            'password' => $password,
            'role' => $form['role'],
        ];
        if ($form['shop_name'] !== '') {
            $payload['shop_name'] = $form['shop_name'];
        }
        $result = requestAuthApi('/auth/register', $payload);

        if ($result['ok']) {
            header('Location: login.php?registered=1', true, 303);
            exit;
        }

        $data = $result['data'] ?? [];
        $errorMessage = $data['errors']['email'][0]
            ?? $data['errors']['name'][0]
            ?? $data['message']
            ?? $result['message']
            ?? 'Pendaftaran tidak berhasil. Periksa kembali data Anda.';
    }
}
?>
<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#dce4ec">
    <title>Daftar - GeraiLokal</title>
    <style>
        :root{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#17233b;background:#dce4ec;font-synthesis:none;text-rendering:optimizeLegibility}
        *{box-sizing:border-box}
        body{margin:0;min-height:100vh;display:grid;place-items:center;padding:32px 20px;background:radial-gradient(ellipse at 50% 45%,#eef1f3 0,#e3e8ec 52%,#d5dee7 100%)}
        .layout{width:min(1120px,100%);display:grid;grid-template-columns:minmax(180px,1fr) minmax(320px,430px) minmax(180px,1fr);align-items:center;gap:28px}
        .art{width:100%;max-width:330px;justify-self:center;filter:drop-shadow(0 14px 14px #25324a18)}
        .art svg{display:block;width:100%;height:auto}
        .card{width:100%;padding:27px 30px 22px;border:1px solid #f1eee5;border-radius:20px;background:#fffdf7;box-shadow:0 12px 26px #1e2b3c23}
        .brand{display:flex;justify-content:center;align-items:center;gap:6px;margin-bottom:10px;color:#243148;font-size:13px;font-weight:800;letter-spacing:-.3px}
        .brand-mark{width:25px;height:25px;object-fit:contain}
        .brand span span{color:#d39b16}
        h1{margin:0 0 16px;text-align:center;font-size:20px;letter-spacing:-.35px}
        .name-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .field{display:block;margin:0 0 11px}
        .field span{display:block;margin:0 0 5px;color:#647084;font-size:11px;font-weight:600}
        .field input,.field select{width:100%;height:37px;padding:0 11px;border:1px solid #dfe3e8;border-radius:8px;background:#fff;color:#202b3e;font:inherit;font-size:11px;outline:none;transition:border-color .15s,box-shadow .15s}
        .field input:focus,.field select:focus{border-color:#61738e;box-shadow:0 0 0 3px #34445e16}
        .message{margin:0 0 13px;padding:10px 12px;border:1px solid #f1c7c7;border-radius:8px;background:#fff2f1;color:#9b3535;font-size:12px;line-height:1.45}
        .terms{display:flex;align-items:flex-start;gap:8px;margin:4px 0 14px;color:#657084;font-size:10px;line-height:1.45}
        .terms input{width:14px;height:14px;margin:0;accent-color:#26344f}
        .terms a{color:#26344f;font-weight:700;text-decoration:none}
        .terms a:hover{text-decoration:underline}
        .submit,.google{width:100%;min-height:38px;display:flex;align-items:center;justify-content:center;gap:9px;border-radius:8px;font:inherit;font-size:10px;font-weight:800;letter-spacing:.35px;cursor:pointer}
        .submit{border:0;background:#26344f;color:white;box-shadow:0 3px 6px #26344f27}
        .submit:hover{background:#1b2942}
        .divider{display:flex;align-items:center;gap:10px;margin:10px 0;color:#9aa2ad;font-size:9px}
        .divider:before,.divider:after{content:"";height:1px;flex:1;background:#e4e6e9}
        .google{border:1px solid #d7d9de;background:#fff;color:#27344b}
        .google:hover{background:#f8f9fb}
        .google-mark{width:15px;height:15px;object-fit:contain}
        .field[hidden]{display:none}
        .footer{margin:13px 0 0;text-align:center;color:#697487;font-size:10px}
        .footer a{color:#26344f;font-weight:700;text-decoration:none}
        .footer a:hover{text-decoration:underline}
        .google-note{min-height:14px;margin:5px 0 0;text-align:center;color:#7a8492;font-size:10px}
        @media(max-width:760px){body{padding:12px 14px}.layout{width:min(680px,100%);grid-template-columns:minmax(58px,.4fr) minmax(270px,310px) minmax(58px,.4fr);gap:10px}.art{display:block}.card{padding:19px 16px}.brand{margin-bottom:6px}h1{margin-bottom:12px}.field{margin-bottom:8px}.field input,.field select{height:35px}.terms{margin:2px 0 9px}.submit,.google{min-height:34px}.divider{margin:8px 0}.footer{margin-top:9px}.google-note{min-height:10px;margin:3px 0 0}}
        @media(max-width:560px){.layout{max-width:430px;display:block}.art{display:none}.card{padding:25px 24px}}
        @media(max-width:380px){body{padding:18px 12px}.card{padding:23px 18px}.name-row{gap:8px}}
    </style>
</head>
<body>
    <main class="layout">
        <div class="art" aria-hidden="true">
            <svg viewBox="0 0 340 390" role="presentation">
                <ellipse cx="169" cy="350" rx="137" ry="18" fill="#becbd6"/>
                <path d="M37 193c13-71 68-126 136-126s123 55 136 126c8 44-7 91-43 123H80c-36-32-51-79-43-123Z" fill="#c8d6e0"/>
                <path d="M47 309h246l-20 39H66l-19-39Z" fill="#f3b51b"/>
                <path d="M91 141h94l10 168H79l12-168Z" fill="#ffd04a"/>
                <path d="M108 143c0-31 13-52 30-52s30 21 30 52" fill="none" stroke="#1d2b45" stroke-width="9" stroke-linecap="round"/>
                <path d="M209 198h71l10 111h-91l10-111Z" fill="#f5a928"/>
                <path d="M224 200c0-23 10-39 25-39s25 16 25 39" fill="none" stroke="#26344f" stroke-width="8" stroke-linecap="round"/>
                <path d="M225 250h58v59h-58z" fill="#e58f21"/>
                <path d="M118 218h42v58h-42z" fill="#fff5d5"/>
                <path d="M126 231h26m-26 12h26" stroke="#5f7891" stroke-width="5" stroke-linecap="round"/>
                <path d="M65 287c-18-22-20-45-5-67m6 37c22-17 26-35 22-53m166 70c20-17 26-35 20-54" fill="none" stroke="#547b69" stroke-width="8" stroke-linecap="round"/>
                <path d="M58 242c-15-2-26-12-29-28 15 0 28 8 34 22m20-26c2-17 11-27 25-31 1 16-6 28-21 35m166 73c13-14 28-16 42-8-10 13-24 18-40 14" fill="#789c79"/>
                <circle cx="254" cy="97" r="13" fill="#f4bb25"/>
                <path d="m254 77 3 12 11 4-11 4-3 12-4-12-11-4 11-4 4-12Z" fill="#fff7db"/>
                <circle cx="74" cy="104" r="7" fill="#fff6d8"/>
            </svg>
        </div>
        <section class="card" aria-labelledby="page-title">
            <div class="brand">
                <img class="brand-mark" src="frontend/Images/Logo.png" alt="">
                <span>Gerai<span>Lokal</span></span>
            </div>
            <h1 id="page-title">Buat Akun</h1>

            <?php if ($errorMessage !== ''): ?>
                <p class="message" role="alert"><?= escapeHtml($errorMessage) ?></p>
            <?php endif; ?>

            <form method="post" action="register.php" autocomplete="on">
                <input type="hidden" name="csrf_token" value="<?= escapeHtml($_SESSION['csrf_token']) ?>">
                <div class="name-row">
                    <label class="field">
                        <span>Nama Depan</span>
                        <input type="text" name="first_name" value="<?= escapeHtml($form['first_name']) ?>" placeholder="Nama depan" autocomplete="given-name" maxlength="100" required>
                    </label>
                    <label class="field">
                        <span>Nama Belakang</span>
                        <input type="text" name="last_name" value="<?= escapeHtml($form['last_name']) ?>" placeholder="Nama belakang" autocomplete="family-name" maxlength="100" required>
                    </label>
                </div>
                <label class="field">
                    <span>Email</span>
                    <input type="email" name="email" value="<?= escapeHtml($form['email']) ?>" placeholder="nama@email.com" autocomplete="email" required>
                </label>
                <label class="field">
                    <span>Kata Sandi</span>
                    <input type="password" name="password" placeholder="Minimal 8 karakter" autocomplete="new-password" minlength="8" maxlength="72" required>
                </label>
                <label class="field">
                    <span>Daftar Sebagai</span>
                    <select name="role" id="role" onchange="document.getElementById('shop-field').hidden = this.value !== 'seller'">
                        <option value="buyer" <?= $form['role'] === 'buyer' ? 'selected' : '' ?>>Pembeli</option>
                        <option value="seller" <?= $form['role'] === 'seller' ? 'selected' : '' ?>>Penjual UMKM</option>
                    </select>
                </label>
                <label class="field" id="shop-field" <?= $form['role'] !== 'seller' ? 'hidden' : '' ?>>
                    <span>Nama Toko</span>
                    <input type="text" name="shop_name" value="<?= escapeHtml($form['shop_name']) ?>" placeholder="Nama toko UMKM Anda" maxlength="100">
                </label>
                <label class="terms">
                    <input type="checkbox" name="terms" value="1" <?= !empty($_POST['terms']) ? 'checked' : '' ?> required>
                    <span>Saya menyetujui <a href="#" onclick="event.preventDefault();document.getElementById('google-note').textContent='Syarat dan ketentuan akan tersedia segera.'">Syarat dan Ketentuan</a> GeraiLokal.</span>
                </label>
                <button class="submit" type="submit">DAFTAR</button>
            </form>

            <div class="divider">ATAU</div>
            <button class="google" type="button" onclick="document.getElementById('google-note').textContent='Pendaftaran dengan Google belum tersedia.'">
                <img class="google-mark" src="frontend/Images/Google.png" alt="">
                DAFTAR DENGAN GOOGLE
            </button>
            <p class="google-note" id="google-note" aria-live="polite"></p>
            <p class="footer">Sudah mempunyai akun? <a href="login.php">Masuk</a></p>
        </section>
        <div class="art" aria-hidden="true">
            <svg viewBox="0 0 340 390" role="presentation">
                <ellipse cx="174" cy="350" rx="140" ry="18" fill="#becbd6"/>
                <path d="M35 190c18-74 76-122 143-122 71 0 128 53 141 122 9 47-8 91-43 122H79c-38-31-54-77-44-122Z" fill="#c8d6e0"/>
                <path d="M53 311h237l-18 37H70l-17-37Z" fill="#e9a71d"/>
                <path d="M60 221h61v90H51l9-90Z" fill="#f5b52a"/>
                <path d="M69 222c0-25 8-40 22-40s22 15 22 40" fill="none" stroke="#26344f" stroke-width="7" stroke-linecap="round"/>
                <path d="M69 257h43v54H69z" fill="#ffd45c"/>
                <path d="M175 149h109l-8 162H168l7-162Z" fill="#fffdf7"/>
                <path d="M185 151c0-34 14-55 43-55s43 21 43 55" fill="none" stroke="#26344f" stroke-width="9" stroke-linecap="round"/>
                <path d="M198 203h60m-60 21h60m-60 21h40" stroke="#d4dce4" stroke-width="8" stroke-linecap="round"/>
                <path d="M209 269h39v42h-39z" fill="#f5b52a"/>
                <path d="M37 291c-10-19-8-36 7-51m1 27c19-11 27-27 25-45m222 71c-13-19-11-35 3-49" fill="none" stroke="#547b69" stroke-width="8" stroke-linecap="round"/>
                <path d="M42 251c-15 0-25-8-30-22 15-2 28 5 36 17m20-20c3-16 13-25 28-27 0 16-8 28-23 34m194 57c13-14 29-17 43-9-10 14-25 19-41 15" fill="#789c79"/>
                <circle cx="290" cy="117" r="16" fill="#f5bd28"/>
                <path d="m290 93 4 15 15 5-15 5-4 15-5-15-15-5 15-5 5-15Z" fill="#fff7db"/>
                <circle cx="54" cy="123" r="7" fill="#fff7db"/>
            </svg>
        </div>
    </main>
</body>
</html>
