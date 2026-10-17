'use strict';

/* =========================================================
   공부 모드 (읽기 화면 · 한/영 보기 · 접기 · 레이저펜)
   ========================================================= */
const BLOCKY = 'ul,ol,p,div,table,h1,h2,h3,h4,blockquote';
const LINE_SEL = 'h1,h2,h3,h4,p,li,td,th,div,blockquote';

// 중첩 목록 등을 뺀, 그 줄 자체의 내용만
function ownClone(el) {
  const c = el.cloneNode(true);
  $$(BLOCKY, c).forEach(x => x.remove());
  return c;
}
const lineEls = root => $$(LINE_SEL, root).filter(el => ownClone(el).textContent.trim());

// 한국어 줄마다 같은 순번의 영어 줄을 바로 아래에 끼워 넣음. 줄 수가 안 맞으면 블록 단위로 붙임.
function buildMerged(ko, en) {
  const wrap = h('div', { class: 'rich', html: ko });
  if (!htmlText(en)) return wrap;
  const tmp = h('div', { html: en });
  const kl = lineEls(wrap), el = lineEls(tmp);
  if (kl.length && kl.length === el.length) {
    kl.forEach((k, i) => {
      const span = h('span', { class: 'en-line', html: ownClone(el[i]).innerHTML });
      const nested = [...k.children].find(c => c.matches(BLOCKY));
      if (nested) k.insertBefore(span, nested); else k.append(span);
      k.dataset.hasEn = '1';
    });
  } else {
    wrap.dataset.hasEn = '1';
    wrap.append(h('div', { class: 'en-line en-block rich', html: en }));
  }
  return wrap;
}

/* ---------- 자동 목차: 블록 안의 제목(h1·h2)·소제목(h3)을 모음 ----------
   목차 블록의 b.toc = { '블록id:순번': { from: 원래 제목, text?, hide?, level? } } 으로 고쳐 쓸 수 있음.
   원래 제목(from)이 바뀌면 고친 내용은 무시하고 자동으로 돌아감 (엉뚱한 줄에 붙지 않게). */
const TOC_SEL = 'h1,h2,h3';
function tocEntries(note, all) {
  const tb = note.blocks.find(b => b.type === 'toc'), ov = (tb && tb.toc) || {}, depth = (tb && tb.tocDepth) || 2;
  const out = [];
  for (const b of note.blocks) {
    if (b.type === 'space' || b.type === 'toc') continue;
    const d = h('div', { html: htmlText(b.ko) ? b.ko : (b.en || '') });
    $$(TOC_SEL, d).forEach((el, idx) => {
      const text = el.textContent.trim();
      if (!text) return;
      const key = b.id + ':' + idx, autoLevel = el.tagName === 'H3' ? 2 : 1, o = ov[key] && ov[key].from === text ? ov[key] : null;
      const e = { blockId: b.id, idx, key, auto: text, autoLevel, edited: !!o,
        text: o && o.text != null ? o.text : text, level: (o && o.level) || autoLevel, hidden: !!(o && o.hide) };
      e.hide = e.hidden || e.level > depth; // hidden: 직접 뺀 줄, level > depth: "제목만"이라 빠진 줄
      if (all || !e.hide) out.push(e);
    });
  }
  return out;
}
// 목차 DOM. onPick(entry)이 없으면 (PDF) 링크 없이 목록만
function tocEl(note, onPick) {
  const list = tocEntries(note);
  return h('nav', { class: 'toc' },
    h('div', { class: 'toc-title' }, '목차'),
    list.length
      ? h('ul', null, list.map(t => h('li', { class: 'lv' + t.level },
        onPick ? h('a', { href: '#', onclick: e => { e.preventDefault(); onPick(t); } }, t.text) : t.text)))
      : h('div', { class: 'toc-empty' }, '아직 제목·소제목이 없음. 편집 모드에서 "제목", "소제목" 서식을 쓰면 여기에 자동으로 모임.'));
}

/* ---------- 이미지 블록: 사진 여러 장 (세로로 · 격자 · 슬라이드) + 글과의 배치 ---------- */
const FIG_VIEWS = [['stack', '세로로 나열'], ['grid', '격자 (콜라주)'], ['slide', '슬라이드']];
const FIG_LAYOUTS = [['top', '사진 위 · 글 아래'], ['bottom', '글 위 · 사진 아래'], ['left', '사진 왼쪽 · 글 오른쪽'], ['right', '글 왼쪽 · 사진 오른쪽']];
const figSide = b => b.layout === 'left' || b.layout === 'right';
// o = { print, pending[], ctl(i) → 사진마다 얹을 편집 버튼 }
function galleryEl(b, o = {}) {
  const ids = imgsOf(b), view = o.print && b.view === 'slide' ? 'grid' : (b.view || 'stack');
  const items = ids.map((id, i) => {
    const img = Images.img(id, { alt: b.figLabel || '' });
    if (o.pending) o.pending.push(img._ready);
    return h('div', { class: 'gal-item' }, img, o.ctl ? o.ctl(i) : null);
  });
  const box = h('div', { class: 'gal gal-' + view });
  box.style.setProperty('--cols', Math.min(b.cols || 2, ids.length || 1));
  if (!figSide(b)) box.style.width = (b.width || 80) + '%';
  if (view === 'slide' && ids.length > 1) {
    const track = h('div', { class: 'gal-track' }, items), cnt = h('span', { class: 'gal-cnt' }, `1 / ${ids.length}`);
    const at = () => Math.round(track.scrollLeft / Math.max(1, track.clientWidth));
    const go = d => track.scrollTo({ left: Math.max(0, Math.min(ids.length - 1, at() + d)) * track.clientWidth, behavior: 'smooth' });
    track.addEventListener('scroll', () => { cnt.textContent = `${at() + 1} / ${ids.length}`; }, { passive: true });
    const nav = (d, t) => h('button', { class: 'gal-nav', title: d < 0 ? '이전 사진' : '다음 사진', onmousedown: e => e.preventDefault(), onclick: e => { e.stopPropagation(); go(d); } }, t);
    box.append(track, h('div', { class: 'gal-bar' }, nav(-1, '‹'), cnt, nav(1, '›')));
  } else box.append(...items);
  return h('div', { class: 'fig', style: { textAlign: figSide(b) ? 'center' : (b.align || 'center') } }, box);
}
// 사진과 글을 b.layout대로 배치. 반환은 노드 배열
function figLayout(b, fig, text) {
  const lay = b.layout || 'top';
  if (!text || !fig || lay === 'top') return [fig, text];
  if (lay === 'bottom') return [text, fig];
  const box = h('div', { class: 'fig-lay lay-' + lay }, fig, text);
  box.style.setProperty('--fig-w', (b.width || 45) + '%');
  return [box];
}

/* ---------- 다시 그릴 때 보던 블록을 화면의 같은 자리에 (이미지가 늦게 떠서 밀려도) ---------- */
const Anchor = {
  tok: 0,
  // prefer: 화면에 보이면 이 블록 기준 (편집 중인 블록)
  take(prefer) {
    const sc = $('#scroller'), r = sc.getBoundingClientRect(), els = $$('#page > [data-id]');
    const vis = x => { const q = x.getBoundingClientRect(); return q.bottom > r.top + 1 && q.top < r.bottom - 1; };
    const el = (prefer && els.find(x => x.dataset.id === prefer && vis(x))) || els.find(vis);
    return el ? { id: el.dataset.id, off: el.getBoundingClientRect().top - r.top } : null;
  },
  // a = take() 결과 또는 { y } (그 스크롤 위치로). 그 사이 직접 스크롤(휠·터치·키·스크롤바)하면 그만둠
  keep(a) {
    const page = $('#page'), sc = $('#scroller'), tok = ++this.tok;
    const stop = () => { if (tok === this.tok) this.cancel(); };
    const evs = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
    evs.forEach(k => sc.addEventListener(k, stop, { passive: true, once: true }));
    const fix = () => {
      if (tok !== this.tok || !a) return;
      if (a.y != null) { sc.scrollTop = a.y; return; }
      const el = $$('#page > [data-id]').find(x => x.dataset.id === a.id);
      if (el) sc.scrollTop += el.getBoundingClientRect().top - sc.getBoundingClientRect().top - a.off;
    };
    fix();
    requestAnimationFrame(fix);
    const imgs = $$('img', page).filter(i => i._ready);
    imgs.forEach(i => i._ready.then(fix)); // 한 장씩 뜰 때마다 다시 맞춤
    Promise.race([Promise.all(imgs.map(i => i._ready)), new Promise(r => setTimeout(r, 4000))]).then(() => {
      fix();
      evs.forEach(k => sc.removeEventListener(k, stop));
      if (tok === this.tok) page.style.minHeight = '';
    });
  },
  cancel() { this.tok++; $('#page').style.minHeight = ''; },
};

const ZOOMS = [80, 90, 100, 115, 130, 150, 175, 200];

const Study = {
  textPart(b, lang) {
    const ko = b.ko || '', en = b.en || '', hasKo = !!htmlText(ko) || /<table|<hr/.test(ko), hasEn = !!htmlText(en);
    if (!hasKo && !hasEn) return null;
    if (lang === 'ko') return h('div', { class: 'rich', html: ko });
    if (lang === 'en') return h('div', { class: 'rich' + (hasEn ? ' en' : ''), html: hasEn ? en : ko });
    if (lang === 'split') return hasEn
      ? h('div', { class: 'split' }, h('div', { class: 'rich', html: ko }), h('div', { class: 'rich en', html: en }))
      : h('div', { class: 'rich', html: ko });
    return buildMerged(ko, en);
  },

  // 노트 → 읽기용 DOM 배열. o = { lang, print, expand, pending[] }
  build(note, o) {
    return note.blocks.map(b => {
      const el = h('div', { class: `sblk sblk-${b.type}` + (o.print && b.breakBefore ? ' pb-before' : ''), dataset: { id: b.id } });
      const body = [];
      if (b.type === 'space') {
        body.push(h('div', { class: 'space pat-' + (b.pattern || 'blank'), style: { height: (b.height || 140) + 'px' } }));
      } else if (b.type === 'toc') {
        body.push(tocEl(note, o.print ? null : t => this.jump(t)));
      } else {
        const t = this.textPart(b, o.lang);
        let fig = null;
        if (b.type === 'image') {
          if (imgsOf(b).length) fig = galleryEl(b, { print: o.print, pending: o.pending });
          else if (!o.print) fig = h('div', { class: 'fig-missing' }, (b.figLabel || 'Figure') + ' — 이미지 미삽입 (편집 모드에서 추가)');
          else if (b.figLabel) fig = h('div', { class: 'fig-missing' }, b.figLabel);
        }
        body.push(...figLayout(b, fig, t).filter(Boolean));
      }
      if (!b.fold) { el.append(...body); return el; }
      const open = o.print ? (o.expand || !b.collapsed) : !b.collapsed;
      el.classList.toggle('open', open);
      el.append(
        h('button', { class: 'fold-head', onclick: () => {
          b.collapsed = el.classList.contains('open');
          el.classList.toggle('open', !b.collapsed);
          Editor.touch();
        } }, h('span', { class: 'chev' }, '▶'), b.foldLabel || '접힌 내용'),
        h('div', { class: 'fold-body' }, body));
      return el;
    });
  },

  render() {
    const page = $('#page'), n = S.note, course = S.courses.find(c => c.id === n.courseId), a = Anchor.take();
    page.style.minHeight = page.offsetHeight + 'px';
    page.className = `paper study lang-${S.lang}` + (S.lang === 'split' ? ' wide' : '');
    page.style.zoom = S.zoom === 100 ? '' : S.zoom / 100;
    page.innerHTML = '';
    page.append(h('div', { class: 'doc-course' }, course ? course.name : ''), h('h1', { class: 'doc-title' }, n.title || '제목 없음'));
    if (!n.blocks.length) page.append(h('div', { class: 'empty' }, '아직 내용이 없음. 위에서 "편집" 모드로 바꿔서 내용을 넣으세요.'));
    page.append(...this.build(n, { lang: S.lang }));
    Anchor.keep(a);
  },

  onClick(e) {
    if (S.mode !== 'study' || S.lang !== 'click' || Laser.dragged) return;
    if (e.target.closest('.fold-head') || !getSelection().isCollapsed) return;
    const t = e.target.closest('[data-has-en]');
    if (t) t.classList.toggle('rev');
  },

  // 목차에서 고른 제목으로 이동 (접힌 블록이면 펼침)
  jump(t) {
    const el = $(`#page [data-id="${t.blockId}"]`);
    if (!el) return;
    const b = S.note.blocks.find(x => x.id === t.blockId);
    if (b && b.fold && !el.classList.contains('open')) {
      b.collapsed = false;
      el.classList.add('open');
      if (S.mode === 'study') Editor.touch();
    }
    const target = $$(TOC_SEL, el)[t.idx] || el;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.remove('toc-flash');
    void target.offsetWidth;
    target.classList.add('toc-flash');
    setTimeout(() => target.classList.remove('toc-flash'), 1600);
  },

  // 글자 크기 배율 바꾸기 (읽던 위치 유지)
  setZoom(z) {
    const sc = $('#scroller'), ratio = sc.scrollTop / Math.max(1, sc.scrollHeight);
    S.zoom = z;
    savePrefs();
    $('#page').style.zoom = z === 100 ? '' : z / 100;
    sc.scrollTop = ratio * sc.scrollHeight;
    App.renderToolbar();
  },
  stepZoom(d) {
    const i = ZOOMS.indexOf(S.zoom), j = i < 0 ? ZOOMS.indexOf(100) : Math.max(0, Math.min(ZOOMS.length - 1, i + d));
    if (ZOOMS[j] !== S.zoom) this.setZoom(ZOOMS[j]);
  },

  foldAll(collapsed) {
    S.note.blocks.forEach(b => { if (b.fold) b.collapsed = collapsed; });
    Editor.touch();
    this.render();
  },

  toolbar() {
    const hasFold = S.note.blocks.some(b => b.fold);
    return [
      h('button', { class: 'tb outlined', title: '언어 보기 · 영어 글자 서식 · 블록 간격', onclick: e => viewMenu(e.currentTarget, true) },
        '보기: ' + (LANGS.find(x => x[0] === S.lang) || LANGS[0])[1] + ' ▾'),
      h('span', { class: 'tb-sep' }),
      h('div', { class: 'zoom', title: '글자 크기 (보기 전용, 노트 내용은 그대로)' },
        h('button', { class: 'tb', title: '작게', onclick: () => this.stepZoom(-1) }, '가−'),
        h('button', { class: 'tb zoom-val', title: '눌러서 100%로', onclick: () => this.setZoom(100) }, S.zoom + '%'),
        h('button', { class: 'tb', title: '크게', onclick: () => this.stepZoom(1) }, h('b', null, '가+'))),
      h('button', { class: 'tb', title: '제목·소제목으로 바로 가기', onclick: e => popover(e.currentTarget, tocEl(S.note, t => { closePop(); this.jump(t); })) }, '목차 ▾'),
      hasFold ? [h('span', { class: 'tb-sep' }),
        h('button', { class: 'tb', onclick: () => this.foldAll(true) }, '모두 접기'),
        h('button', { class: 'tb', onclick: () => this.foldAll(false) }, '모두 펴기')] : null,
      h('span', { class: 'tb-sep' }),
      h('button', { class: 'tb outlined' + (Laser.on ? ' on' : ''), title: '그은 선이 잠깐 보였다가 사라짐', onclick: () => Laser.toggle() }, '레이저펜'),
      h('button', { class: 'tb', title: '레이저펜 색 · 굵기', onclick: e => Laser.menu(e.currentTarget) },
        h('span', { class: 'laser-dot', style: { background: Laser.color, width: Math.min(16, Laser.width + 4) + 'px', height: Math.min(16, Laser.width + 4) + 'px' } }), '▾'),
      h('span', { class: 'tb-space' }),
      h('button', { class: 'tb outlined' + (S.focus ? ' on' : ''), title: '노트만 크게 보기 (Esc로 나가기)', onclick: () => App.setFocus(!S.focus) }, S.focus ? '크게 보기 끄기' : '크게 보기'),
      h('button', { class: 'tb outlined pdf-btn', onclick: openPdfDialog }, 'PDF'),
    ];
  },
};

/* ---------- 레이저펜: 그은 선이 잠깐 보였다가 사라짐 ---------- */
const LASER_COLORS = ['#ff3b30', '#ff9500', '#34c759', '#0a84ff', '#bf5af2'];
const Laser = {
  on: false, color: LASER_COLORS[0], width: 4, finger: false, strokes: [], cur: null, raf: 0, dragged: false,
  HOLD: 900, FADE: 700,

  init() {
    this.cv = $('#laser');
    this.ctx = this.cv.getContext('2d');
    const fit = () => {
      const d = devicePixelRatio || 1;
      this.cv.width = innerWidth * d;
      this.cv.height = innerHeight * d;
      this.ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    fit();
    addEventListener('resize', fit);
    const sc = this.sc = $('#scroller');
    const usable = e => this.on && S.mode === 'study' && S.note && (e.pointerType !== 'touch' || this.finger);

    sc.addEventListener('pointerdown', e => {
      this.dragged = false;
      this.blocked = false;
      if (!usable(e) || (e.pointerType === 'mouse' && e.button !== 0)) return;
      this.cur = { pid: e.pointerId, color: this.color, width: this.width, pts: [], end: 0, x0: e.clientX, y0: e.clientY, target: e.target, type: e.pointerType };
      this.strokes.push(this.cur);
      this.addPoint(e);
      this.kick();
    });
    addEventListener('pointermove', e => {
      const c = this.cur;
      if (!c || e.pointerId !== c.pid) return;
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      (evs.length ? evs : [e]).forEach(ev => this.addPoint(ev));
      if (Math.hypot(e.clientX - c.x0, e.clientY - c.y0) > 6) this.dragged = true;
    });
    const end = e => {
      const c = this.cur;
      if (!c || e.pointerId !== c.pid) return;
      c.end = performance.now();
      this.cur = null;
      // 펜·손가락은 기본 동작을 막아뒀으므로, 제자리 탭이면 클릭으로 넘겨줌 (영어 보기/접기)
      if (!this.dragged && this.blocked && e.type === 'pointerup') {
        this.strokes.splice(this.strokes.indexOf(c), 1);
        const t = document.elementFromPoint(e.clientX, e.clientY);
        if (t) t.click();
      }
    };
    addEventListener('pointerup', end);
    addEventListener('pointercancel', end);

    // 펜(또는 손가락 그리기)일 때는 스크롤·텍스트 선택 대신 그리기
    const block = e => {
      if (!this.on || S.mode !== 'study' || !S.note) return;
      const t = e.touches[0];
      if (t && (this.finger || t.touchType === 'stylus') && e.cancelable) { e.preventDefault(); this.blocked = true; }
    };
    sc.addEventListener('touchstart', block, { passive: false });
    sc.addEventListener('touchmove', block, { passive: false });
  },

  // 색(직접 지정 가능) · 굵기 · 손가락 그리기
  menu(anchor) {
    const known = LASER_COLORS.includes(this.color);
    const preview = h('div', { class: 'laser-preview' });
    const paint = () => { preview.style.height = this.width + 'px'; preview.style.background = this.color; preview.style.boxShadow = `0 0 ${this.width * 2}px ${this.color}`; };
    const save = () => { paint(); savePrefs(); const d = $('#toolbar .laser-dot'); if (d) { d.style.background = this.color; d.style.width = d.style.height = Math.min(16, this.width + 4) + 'px'; } };
    const wVal = h('b', null, this.width + 'px');
    paint();
    popover(anchor, h('div', { class: 'view-menu' },
      h('div', { class: 'menu-label' }, '레이저펜 색'),
      h('div', { class: 'swatches' },
        LASER_COLORS.map(c => h('button', { class: 'swatch' + (this.color === c ? ' on' : ''), style: { background: c }, onclick: () => { this.color = c; save(); closePop(); this.menu(anchor); } })),
        h('label', { class: 'swatch custom' + (known ? '' : ' on'), title: '직접 고르기', style: { background: known ? '' : this.color } },
          h('input', { type: 'color', value: this.color, oninput: e => { this.color = e.target.value; e.target.parentElement.style.background = this.color; save(); } }))),
      h('div', { class: 'menu-label' }, '굵기'),
      h('div', { class: 'pop-range' },
        h('input', { type: 'range', min: 1, max: 24, value: this.width, oninput: e => { this.width = +e.target.value; wVal.textContent = this.width + 'px'; save(); } }), wVal),
      h('div', { class: 'laser-preview-wrap' }, preview),
      h('button', { class: 'menu-item check' + (this.finger ? ' on' : ''), title: '켜면 손가락으로도 그림 (스크롤하려면 펜을 끄기)', onclick: () => { this.finger = !this.finger; savePrefs(); closePop(); this.menu(anchor); } }, '손가락으로도 그리기')));
  },

  toggle(v = !this.on) {
    this.on = v;
    document.body.classList.toggle('laser-on', v);
    App.renderToolbar();
  },
  addPoint(e) { this.cur.pts.push({ x: e.clientX, y: e.clientY + this.sc.scrollTop }); },
  kick() { if (!this.raf) this.raf = requestAnimationFrame(() => this.draw()); },

  draw() {
    this.raf = 0;
    const ctx = this.ctx, now = performance.now(), top = this.sc.scrollTop;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    this.strokes = this.strokes.filter(s => !s.end || now - s.end < this.HOLD + this.FADE);
    for (const s of this.strokes) {
      const a = s.end ? 1 - Math.max(0, now - s.end - this.HOLD) / this.FADE : 1, p = s.pts;
      if (!p.length) continue;
      ctx.globalAlpha = Math.max(0, a);
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.strokeStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = s.width * 2;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(p[0].x, p[0].y - top);
      for (let i = 1; i < p.length - 1; i++) ctx.quadraticCurveTo(p[i].x, p[i].y - top, (p[i].x + p[i + 1].x) / 2, (p[i].y + p[i + 1].y) / 2 - top);
      const l = p[p.length - 1];
      ctx.lineTo(l.x, l.y - top + 0.01);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (this.strokes.length) this.kick();
  },
};
