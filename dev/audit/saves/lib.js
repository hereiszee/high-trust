/* shared helpers for the saves-area desktop probes (Playwright's Electron driver, packaged build) */
'use strict';
const { _electron } = require('playwright'), path = require('path'), fs = require('fs'), os = require('os');
const ROOT = path.resolve(__dirname, '../../..');
const EXE = process.env.HT_EXE || path.join(ROOT, 'desktop/dist/linux-unpacked/HighTrust');
const GPU = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const mkProfile = n => fs.mkdtempSync(path.join(os.tmpdir(), 'ht-audit-' + (n || '') + '-'));
async function launch(profile, extra = [], env = {}) {
  const app = await _electron.launch({ executablePath: EXE, args: [...GPU, '--no-sandbox', '--windowed', '--no-steam', ...extra],
    env: Object.assign({}, process.env, { HT_USER_DATA: profile, HT_WINDOW_SIZE: '1280x720' }, env), timeout: 120000, cwd: os.tmpdir() });
  const out = []; app.process().stdout.on('data', d => out.push(String(d))); app.process().stderr.on('data', d => out.push(String(d)));
  const p = await app.firstWindow(); const errs = [], remote = [];
  p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  p.on('request', r => { const u = r.url(); if (!/^(app|data|blob):/.test(u)) remote.push(u) });
  const exited = new Promise(r => app.process().once('exit', (code, sig) => r({ code, sig })));
  return { app, p, errs, remote, out, exited, pid: app.process().pid };
}
async function ready(p) {
  await p.waitForFunction(() => window.__ht && window.__ht.assets && window.__ht.assets.done, null, { timeout: 180000 });
  await p.waitForSelector('.ht-title [data-act=newgame]:not([disabled])', { timeout: 90000 });
}
const disk = profile => { const f = path.join(profile, 'saves', 'save.json'); try { const o = JSON.parse(fs.readFileSync(f, 'utf8')); return o.keys } catch (e) { return null } };
const diskSave = profile => { const k = disk(profile); try { return JSON.parse(k['ht-save']) } catch (e) { return null } };
const log404 = profile => { let lg = ''; try { lg = fs.readFileSync(path.join(profile, 'high-trust.log'), 'utf8') } catch (e) { } return lg.split('\n').filter(l => l.startsWith('[app] 404') || l.includes('[net] blocked')) };
const logText = profile => { try { return fs.readFileSync(path.join(profile, 'high-trust.log'), 'utf8') } catch (e) { return '' } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = p => p.keyboard.press('Escape');
/* a real click; SwiftShader can stall the page long enough for Playwright's click to time out, then fall back to a DOM click */
const click = async (p, sel) => { try { await p.click(sel, { timeout: 15000 }) } catch (e) { console.log('info (click fell back to DOM click: ' + sel + ')'); await p.evaluate(s => document.querySelector(s).click(), sel) } };
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'ok   ' : 'FAIL ') + m) };
const info = m => console.log('info ' + m);
module.exports = { click, launch, ready, disk, diskSave, log404, logText, sleep, ok, info, esc, mkProfile, ROOT, EXE, get fails() { return fails } };
