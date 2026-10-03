import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const VITE_PORT = 5179;
const RECEIVER_PORT = 5180;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('🚀 Khởi động Real QRPaymentPage Component Test Runner...');

  let testResults = null;
  let serverResolver = null;
  const serverPromise = new Promise((resolve) => {
    serverResolver = resolve;
  });

  // 1. Setup HTTP receiver server listening on all interfaces
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url === '/test-error') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        console.error('❌ BROWSER ERROR NHẬN ĐƯỢC:', body);
        res.writeHead(200);
        res.end('OK');
      });
      return;
    }

    if (req.method === 'POST' && req.url === '/test-results') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          testResults = JSON.parse(body);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.writeHead(400);
          res.end();
        }
        serverResolver();
      });
      return;
    }

    res.writeHead(404);
    res.end();
  });

  server.listen(RECEIVER_PORT, '0.0.0.0', () => {
    console.log(`📡 Receiver server sẵn sàng trên cổng ${RECEIVER_PORT}...`);
  });

  // 2. Start Vite server in-process without file watching
  console.log(`🌐 Khởi động in-process Vite server trên cổng ${VITE_PORT}...`);
  const vite = await createViteServer({
    root: __dirname,
    server: {
      port: VITE_PORT,
      host: '127.0.0.1',
      watch: null
    }
  });
  await vite.listen();

  // 3. Launch Chrome Headless with anti-throttling flags
  const tempProfileDir = path.join(os.tmpdir(), 'chrome-profile-qr-' + Date.now());
  const targetUrl = `http://127.0.0.1:${VITE_PORT}/test-qr-component.html?port=${RECEIVER_PORT}`;
  console.log(`🌐 Mở Google Chrome headless tại: ${targetUrl}`);

  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=CalculateNativeWinOcclusion',
      '--run-all-compositor-stages-before-draw',
      '--user-data-dir=' + tempProfileDir,
      targetUrl
    ],
    { stdio: 'ignore' }
  );

  // Set 40s timeout for tests
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout: Tests did not finish within 40s')), 40000)
  );

  try {
    await Promise.race([serverPromise, timeoutPromise]);
  } catch (err) {
    console.error('❌ Lỗi runtime:', err.message);
  } finally {
    try {
      chromeProcess.kill();
    } catch {}
    await vite.close();
    server.close();
    try {
      fs.rmSync(tempProfileDir, { recursive: true, force: true });
    } catch {}
  }

  // 4. Output results
  console.log('\n============================================================');
  console.log('       KẾT QUẢ KIỂM THỬ REAL QRPAYMENTPAGE COMPONENT        ');
  console.log('============================================================\n');

  if (!testResults || !Array.isArray(testResults)) {
    console.error('❌ Không nhận được kết quả từ trình duyệt.');
    process.exit(1);
  }

  let passCount = 0;
  let failCount = 0;

  for (const r of testResults) {
    const symbol = r.status === 'PASS' ? '✔' : '✖';
    console.log(`${symbol} [${r.status}] ${r.name}`);
    if (r.details) {
      console.log(`   └─ ${r.details}`);
    }
    if (r.status === 'PASS') passCount++;
    else failCount++;
  }

  console.log('\n------------------------------------------------------------');
  console.log(`Tổng kết: ${passCount} PASS, ${failCount} FAIL (Tổng ${testResults.length} tests)`);
  console.log('------------------------------------------------------------\n');

  if (failCount > 0 || passCount < 5) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
