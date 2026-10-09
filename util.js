'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

// 작은 DOM 빌더: h('div', {class:'x', onclick:fn}, child, ...)
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k === 'dataset') Object.assign(e.dataset, v);
    else if (k === 'value') e.value = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    e.append(k.nodeType ? k : document.createTextNode(k));
  }
  return e;
}

/* ---------- modal / toast / popover ---------- */
function openModal({ title, body, actions = [], wide }) {
  const close = () => ov.remove();
  const box = h('div', { class: 'modal' + (wide ? ' wide' : '') },
    h('div', { class: 'modal-head' }, h('h3', null, title), h('button', { class: 'icon-btn', onclick: close }, '✕')),
    h('div', { class: 'modal-body' }, body),
    h('div', { class: 'modal-foot' }, actions.map(a => h('button', { class: 'btn ' + (a.kind || ''), onclick: e => a.onclick(close, e.currentTarget) }, a.label))));
  const ov = h('div', { class: 'overlay' }, box);
  $('#modal-root').append(ov);
  return { close, box };
}

function askText(title, value = '', placeholder = '') {
  return new Promise(res => {
    const inp = h('input', { type: 'text', class: 'inp', value, placeholder });
    const done = v => { m.close(); res(v); };
    const m = openModal({
      title, body: inp, actions: [
        { label: '취소', onclick: () => done(null) },
        { label: '확인', kind: 'primary', onclick: () => done(inp.value.trim() || null) }]
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.isComposing) done(inp.value.trim() || null); });
    setTimeout(() => { inp.focus(); inp.select(); }, 30);
  });
}

function askConfirm(title, text, okLabel = '확인', danger = false) {
  return new Promise(res => {
    const m = openModal({
      title, body: h('p', { style: { margin: '6px 0' } }, text), actions: [
        { label: '취소', onclick: () => { m.close(); res(false); } },
        { label: okLabel, kind: danger ? 'primary danger-bg' : 'primary', onclick: () => { m.close(); res(true); } }]
    });
  });
}

let toastTimer;
function toast(msg, action, ms = 3200) {
  const t = $('#toast');
  t.innerHTML = '';
  t.append(h('span', null, msg));
  if (action) t.append(h('button', { onclick: () => { t.classList.remove('show'); action.fn(); } }, action.label));
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), action ? 6000 : ms);
}

let curPop = null;
function closePop() {
  if (!curPop) return;
  curPop.p.remove();
  document.removeEventListener('pointerdown', curPop.onDoc, true);
  curPop = null;
}
function popover(anchor, content) {
  const same = curPop && curPop.anchor === anchor;
  closePop();
  if (same) return;
  // mousedown 기본동작을 막아 편집 중인 선택 영역이 풀리지 않게 함
  const p = h('div', { class: 'pop', onmousedown: e => { if (!e.target.closest('input')) e.preventDefault(); } }, content);
  document.body.append(p);
  const r = anchor.getBoundingClientRect();
  let top = r.bottom + 6;
  if (top + p.offsetHeight > innerHeight - 8) top = Math.max(8, r.top - p.offsetHeight - 6);
  p.style.top = top + 'px';
  p.style.left = Math.max(8, Math.min(r.left, innerWidth - p.offsetWidth - 8)) + 'px';
  const onDoc = e => { if (!p.contains(e.target) && !anchor.contains(e.target)) closePop(); };
  document.addEventListener('pointerdown', onDoc, true);
  curPop = { p, onDoc, anchor };
}
function popMenu(anchor, items) {
  popover(anchor, items.filter(Boolean).map(it => it.label
    ? h('button', { class: 'menu-item' + (it.danger ? ' danger' : ''), onclick: () => { closePop(); it.fn(); } }, it.label)
    : h('div', { class: 'menu-label' }, it.text)));
}

/* ---------- files ---------- */
function pickFile(accept, multiple = false) {
  return new Promise(res => {
    const inp = h('input', { type: 'file', accept, multiple, style: { display: 'none' } });
    inp.addEventListener('change', () => { res([...inp.files]); inp.remove(); });
    document.body.append(inp);
    inp.click();
  });
}
function download(blob, filename) {
  const a = h('a', { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
const blobToDataURL = blob => new Promise((res, rej) => {
  const fr = new FileReader();
  fr.onload = () => res(fr.result);
  fr.onerror = () => rej(fr.error);
  fr.readAsDataURL(blob);
});
function dataURLToBlob(url) {
  const [head, data] = url.split(',');
  const type = (head.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
  const bin = atob(data);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fallback below */ }
  const ta = h('textarea', { style: { position: 'fixed', opacity: 0 } });
  ta.value = text;
  document.body.append(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ }
  ta.remove();
  return ok;
}
const safeName = s => (s || 'note').replace(/[\\/:*?"<>|]+/g, '_').trim().slice(0, 80);
const fmtDate = t => { const d = new Date(t); return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`; };

/* ---------- HTML sanitize ---------- */
const TAG_OK = new Set(['H1', 'H2', 'H3', 'H4', 'P', 'DIV', 'UL', 'OL', 'LI', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'MARK', 'SPAN', 'FONT',
  'BR', 'HR', 'SUB', 'SUP', 'CODE', 'BLOCKQUOTE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH']);
const TAG_DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'TITLE', 'HEAD', 'SVG', 'IMG', 'VIDEO', 'AUDIO', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT']);
const STYLE_OK = ['color', 'background-color', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'text-decoration-line', 'text-align',
  'width', 'height', 'table-layout']; // width/height/table-layout: 표 열 너비·행 높이
const ATTR_OK = { TD: ['colspan', 'rowspan'], TH: ['colspan', 'rowspan'], FONT: ['color'] };

function sanitizeNode(node) {
  for (const ch of [...node.childNodes]) {
    if (ch.nodeType === 3) continue;
    if (ch.nodeType !== 1 || TAG_DROP.has(ch.tagName)) { ch.remove(); continue; }
    sanitizeNode(ch);
    if (!TAG_OK.has(ch.tagName)) { ch.replaceWith(...ch.childNodes); continue; }
    const keep = ATTR_OK[ch.tagName] || [];
    const style = STYLE_OK.map(p => { const v = ch.style.getPropertyValue(p); return v && !/url|expression/i.test(v) ? `${p}:${v}` : ''; }).filter(Boolean).join(';');
    for (const a of [...ch.attributes]) if (!keep.includes(a.name)) ch.removeAttribute(a.name);
    if (style) ch.setAttribute('style', style);
  }
}
function sanitize(html) {
  const doc = new DOMParser().parseFromString('<body>' + (html || '') + '</body>', 'text/html');
  sanitizeNode(doc.body);
  return doc.body.innerHTML.trim();
}
const htmlText = html => { const d = document.createElement('div'); d.innerHTML = html || ''; return d.textContent.trim(); };
