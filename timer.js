'use strict';

/* =========================================================
   공부 타이머 (뽀모도로 · 타이머 · 스톱워치)
   사이드바 아래에 붙이거나, 화면 위에 떠 있는 작은 창으로 끌고 다님.
   시간은 끝나는 시각(endAt) 기준으로 계산해서 탭이 잠들어도 어긋나지 않음.
   ========================================================= */
const Timer = {
  st: {
    place: 'off', mode: 'pomo', min: false, x: null, y: null, look: 'pixel', theme: 'pastel',
    timerMin: 10, focusMin: 25, breakMin: 5,
    running: false, endAt: 0, left: null, startAt: 0, acc: 0, phase: 'focus', rounds: 0,
    today: { d: '', ms: 0 }, // 오늘 실제로 공부한 시간 (타이머가 돌아간 시간, 뽀모도로 휴식 제외)
  },
  lastSave: 0,
  el: null, iv: 0, BLOCKS: 36,

  init() {
    try { Object.assign(this.st, JSON.parse(localStorage.getItem('sn-timer') || '{}')); } catch (e) { /* ignore */ }
    this.build();
    if (this.st.running) { if (!this.st.tick) this.st.tick = Date.now(); this.loop(true); }
    // 새로고침·닫기 직전에 저장
    const flush = () => { if (this.st.running) { this.addStudy(); this.save(); } };
    addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
    this.place();
    addEventListener('resize', () => { if (this.st.place === 'float') this.clamp(); });
  },
  save() { try { localStorage.setItem('sn-timer', JSON.stringify(this.st)); } catch (e) { /* ignore */ } Cal.flush(); },

  /* ---------- 시간 계산 ---------- */
  total() {
    const s = this.st;
    if (s.mode === 'timer') return s.timerMin * 60000;
    if (s.mode === 'pomo') return (s.phase === 'focus' ? s.focusMin : s.breakMin) * 60000;
    return 3600000; // 스톱워치: 한 바퀴 = 1시간
  },
  left() {
    const s = this.st;
    if (s.running) return Math.max(0, s.endAt - Date.now());
    return s.left != null ? s.left : this.total();
  },
  elapsed() { const s = this.st; return s.acc + (s.running ? Date.now() - s.startAt : 0); },
  fmt(ms, up) {
    const t = up ? Math.floor(ms / 1000) : Math.ceil(ms / 1000);
    const hh = Math.floor(t / 3600), mm = Math.floor(t / 60) % 60, ss = t % 60, p = n => String(n).padStart(2, '0');
    return (hh ? hh + ':' : '') + p(mm) + ':' + p(ss);
  },

  /* ---------- 오늘 공부한 시간 ---------- */
  dayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; },
  counting() { const s = this.st; return s.running && !(s.mode === 'pomo' && s.phase === 'break'); },
  // 돌아간 만큼 오늘 공부 시간에 더함. 마지막으로 센 시각(s.tick)을 저장해 두므로
  // 새로고침·탭 닫았다 열기 사이의 시간도 이어서 셈 (타이머는 끝나는 시각까지만, 스톱워치는 최대 12시간)
  addStudy() {
    const now = Date.now(), s = this.st;
    if (!s.today || s.today.d !== this.dayKey()) s.today = { d: this.dayKey(), ms: 0 };
    if (this.counting() && s.tick) {
      const end = s.mode === 'watch' ? now : Math.min(now, s.endAt);
      s.today.ms += Math.max(0, Math.min(12 * 3600000, end - s.tick));
    }
    s.tick = now;
    Cal.setAuto(s.today.d, s.today.ms); // 캘린더에도 기록
  },
  studyMs() {
    if (this.st.running) this.addStudy();
    return this.st.today && this.st.today.d === this.dayKey() ? this.st.today.ms : 0;
  },
  resetStudy() {
    this.st.today = { d: this.dayKey(), ms: 0 };
    Cal.setAuto(this.st.today.d, 0);
    this.st.tick = Date.now();
    this.save();
    this.draw();
  },
  fmtStudy(ms) { const m = Math.floor(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`; },

  /* ---------- 조작 ---------- */
  start() {
    const s = this.st;
    if (s.running) return;
    if (s.mode === 'watch') s.startAt = Date.now();
    else s.endAt = Date.now() + this.left();
    s.running = true;
    s.left = null;
    s.tick = Date.now();
    this.save();
    this.loop(true);
  },
  pause() {
    const s = this.st;
    if (!s.running) return;
    this.addStudy();
    if (s.mode === 'watch') s.acc = this.elapsed();
    else s.left = this.left();
    s.running = false;
    this.save();
    this.loop(false);
  },
  reset() {
    const s = this.st;
    s.running = false;
    s.left = null;
    s.acc = 0;
    if (s.mode === 'pomo') { s.phase = 'focus'; s.rounds = 0; }
    this.save();
    this.loop(false);
  },
  setMode(m) {
    if (this.st.mode === m) return;
    this.pause();
    this.st.mode = m;
    this.reset();
  },
  loop(on) {
    clearInterval(this.iv);
    if (on) this.iv = setInterval(() => this.tick(), 250);
    this.draw();
  },
  tick() {
    const s = this.st;
    if (s.running) {
      this.addStudy();
      if (Date.now() - this.lastSave > 10000) { this.lastSave = Date.now(); this.save(); }
    }
    if (s.running && s.mode !== 'watch' && this.left() <= 0) this.finish();
    this.draw();
  },
  finish() {
    const s = this.st;
    this.addStudy();
    s.running = false;
    s.left = null;
    this.beep();
    if (s.mode === 'pomo') {
      if (s.phase === 'focus') { s.rounds++; s.phase = 'break'; toast(`집중 ${s.rounds}회 끝! ${s.breakMin}분 쉬어요 — START`); }
      else { s.phase = 'focus'; toast('휴식 끝! 다시 집중 — START'); }
    } else toast('타이머 끝!');
    if (typeof Buddy !== 'undefined') Buddy.onTimer(s.mode === 'pomo' ? (s.phase === 'break' ? 'focusDone' : 'breakDone') : 'timerDone');
    this.save();
    this.loop(false);
    this.el.classList.remove('ring-done');
    void this.el.offsetWidth;
    this.el.classList.add('ring-done');
  },
  // 8비트 느낌 알림음
  beep() {
    try {
      const A = window.AudioContext || window.webkitAudioContext, ctx = new A();
      [0, .18, .36].forEach((t, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = [880, 1175, 1568][i];
        g.gain.setValueAtTime(.08, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + t + .16);
        o.connect(g).connect(ctx.destination);
        o.start(ctx.currentTime + t);
        o.stop(ctx.currentTime + t + .17);
      });
      setTimeout(() => ctx.close(), 900);
    } catch (e) { /* 소리 못 내도 무시 */ }
  },
  // 제목줄 ⚙: 뽀모도로·타이머 시간을 한 번에 설정 (멈춰 있으면 새 시간으로 바로 바뀜)
  edit() {
    const s = this.st, num = (v, max) => h('input', { type: 'number', min: 1, max, value: v });
    const fields = [['집중 (분)', num(s.focusMin, 180), 'focusMin'], ['휴식 (분)', num(s.breakMin, 60), 'breakMin'], ['타이머 (분)', num(s.timerMin, 600), 'timerMin']];
    const field = ([l, inp]) => h('label', { class: 'field' }, h('span', null, l), inp);
    const m = openModal({
      title: '타이머 시간 설정',
      body: h('div', null,
        h('div', { class: 'hint' }, '뽀모도로'), h('div', { class: 'row' }, fields.slice(0, 2).map(field)),
        h('div', { class: 'hint' }, '타이머'), h('div', { class: 'row' }, fields.slice(2).map(field)),
        h('p', { class: 'hint' }, '돌아가는 중이면 지금 시간은 그대로, 다음 번부터 새 시간으로.')),
      actions: [
        { label: '취소', onclick: close => close() },
        { label: '확인', kind: 'primary', onclick: close => {
          fields.forEach(([, inp, k]) => { const v = Math.round(+inp.value); if (v > 0) s[k] = Math.min(+inp.max, v); });
          if (!s.running) s.left = null;
          this.save();
          this.draw();
          close();
        } }],
    });
    setTimeout(() => { const i = $('input', m.box); if (i) { i.focus(); i.select(); } }, 30);
  },

  /* ---------- 화면 ---------- */
  build() {
    const B = this.BLOCKS, R = 50, blocks = [];
    for (let i = 0; i < B; i++) {
      const a = i / B * 360;
      blocks.push(`<rect x="-4" y="-${R + 6}" width="8" height="11" transform="rotate(${a})"/>`);
    }
    const tab = (m, t) => h('button', { class: 'pt-tab', dataset: { m }, onclick: () => this.setMode(m) }, t);
    const btn = (cls, t, fn) => h('button', { class: 'pt-btn ' + cls, onclick: fn }, t);
    this.el = h('div', { class: 'ptimer' },
      h('div', { class: 'pt-title', onpointerdown: e => this.drag(e) },
        h('span', { class: 'pt-name' }, '♡ STUDY TIMER ♡'),
        h('button', { class: 'pt-win', title: '시간 설정 (뽀모도로·타이머)', onclick: () => this.edit() }, '⚙'),
        h('button', { class: 'pt-win', title: '접기/펴기', onclick: () => { this.st.min = !this.st.min; this.save(); this.draw(); if (this.st.place === 'float') this.clamp(); } }, '−'),
        h('button', { class: 'pt-win', title: '닫기 (설정에서 다시 켬)', onclick: () => { this.st.place = 'off'; this.save(); this.place(); toast('타이머 닫음 — 설정 → 플로팅에서 다시 켤 수 있음'); } }, '×')),
      h('div', { class: 'pt-body' },
        h('div', { class: 'pt-tabs' }, tab('pomo', '뽀모도로'), tab('timer', '타이머'), tab('watch', '스톱워치')),
        h('div', { class: 'pt-ring', html: `<svg viewBox="-64 -64 128 128"><g class="pt-blocks">${blocks.join('')}</g>`
          + `<circle class="pt-track" r="54"/><circle class="pt-arc" r="54" transform="rotate(-90)" stroke-dasharray="${2 * Math.PI * 54}"/></svg>` },
          h('div', { class: 'pt-center' }, h('div', { class: 'pt-label' }), h('div', { class: 'pt-time' }))),
        h('div', { class: 'pt-btns' },
          btn('go', '', () => (this.st.running ? this.pause() : this.start())),
          btn('reset', '↺ RESET', () => this.reset())),
        h('div', { class: 'pt-foot' })),
      h('div', { class: 'pt-grip', title: '끌어서 크기 조절', onpointerdown: e => this.resize(e) }));
    this.rects = [...this.el.querySelectorAll('.pt-blocks rect')];
  },
  draw() {
    const s = this.st, el = this.el;
    if (!el) return;
    const watch = s.mode === 'watch', ms = watch ? this.elapsed() : this.left();
    const frac = watch ? (ms % 3600000) / 3600000 : 1 - ms / this.total();
    const on = Math.round(frac * this.BLOCKS);
    this.rects.forEach((r, i) => r.classList.toggle('on', i < on));
    const C = 2 * Math.PI * 54, simple = s.look === 'simple';
    $('.pt-arc', el).setAttribute('stroke-dashoffset', C * (1 - Math.max(0, Math.min(1, frac))));
    el.className = 'ptimer' + ['float', 'dock'].filter(c => el.classList.contains(c)).map(c => ' ' + c).join('')
      + ` th-${s.theme || 'pastel'}` + (simple ? ' simple' : '') + (el.classList.contains('dragging') ? ' dragging' : '');
    const time = this.fmt(ms, watch);
    $('.pt-time', el).textContent = time;
    $('.pt-label', el).textContent = watch ? 'STUDY' : s.mode === 'timer' ? 'TIMER' : s.phase === 'focus' ? 'FOCUS' : 'BREAK';
    $('.pt-name', el).textContent = simple ? (s.min ? time : '공부 타이머') : s.min ? `♡ ${time} ♡` : '♡ STUDY TIMER ♡';
    $('.pt-btn.go', el).textContent = simple ? (s.running ? '❚❚ 멈춤' : '▶ 시작') : s.running ? '❚❚ PAUSE' : '▶ START';
    $('.pt-btn.reset', el).textContent = simple ? '↺ 리셋' : '↺ RESET';
    $$('.pt-tab', el).forEach(t => t.classList.toggle('on', t.dataset.m === s.mode));
    $('.pt-foot', el).textContent = watch ? `✧ 오늘 공부 ${this.fmtStudy(this.studyMs())} ✧`
      : s.mode === 'pomo' ? `✧ 집중 ${s.rounds}회 완료 ✧` : '✧ 시간 정하고 START ✧';
    el.style.setProperty('--pt-scale', s.scale || 1);
    this.applyCustom();
    el.classList.toggle('min', !!s.min);
    el.classList.toggle('break', s.mode === 'pomo' && s.phase === 'break');
    el.classList.toggle('running', !!s.running);
  },
  // 'off' | 'dock' (사이드바 아래) | 'float' (떠 있는 창)
  place() {
    const el = this.el, p = this.st.place;
    el.classList.toggle('float', p === 'float');
    el.classList.toggle('dock', p === 'dock');
    if (p === 'off') { el.remove(); return; }
    if (p === 'dock') {
      const foot = $('#sidebar .sb-foot');
      if (foot) foot.before(el); else el.remove();
      el.style.left = el.style.top = '';
    } else {
      if (el.parentElement !== document.body) document.body.append(el);
      this.draw(); // 크기(테마·배율)를 먼저 맞춘 뒤 위치 계산
      this.clamp();
    }
    this.draw();
  },
  // 색감 '직접 고르기': 고른 네 가지 색에서 나머지 색을 섞어 만듦
  applyCustom() {
    const el = this.el, s = this.st, keys = ['line', 'ink', 'soft', 'paper', 'tt', 'g1', 'g2', 'g3', 's4', 's5', 'on', 'off', 'on2', 'label', 'b1', 'b2', 'b3', 'shadow'];
    if (s.theme !== 'custom' || !s.custom) { keys.forEach(k => el.style.removeProperty('--pt-' + k)); return; }
    const { main, accent, paper, ink } = s.custom, W = '#ffffff';
    const mix = (a, b, t) => {
      const p = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16));
      const A = p(a), B = p(b);
      return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
    };
    const v = {
      line: main, ink, soft: mix(main, W, .82), paper, tt: inkOn(main) ? '#3b3a48' : '#ffffff',
      g1: main, g2: mix(main, W, .3), g3: mix(accent, W, .45), s4: mix(main, W, .55), s5: mix(accent, W, .7),
      on: accent, off: mix(accent, paper, .82), on2: mix(main, accent, .5), label: mix(ink, paper, .35),
      b1: accent, b2: main, b3: mix(main, accent, .5), shadow: hexA(main, .35),
    };
    keys.forEach(k => el.style.setProperty('--pt-' + k, v[k]));
  },
  setPlace(p) { this.st.place = p; this.save(); this.place(); },
  setScale(v) {
    this.st.scale = Math.round(Math.max(.6, Math.min(1.5, v)) * 100) / 100;
    this.draw();
    if (this.st.place === 'float') this.clamp();
  },
  // 오른쪽 아래 모서리를 끌어서 크기 조절 (0.6배 ~ 1.5배)
  resize(e) {
    e.preventDefault();
    e.stopPropagation();
    const grip = e.currentTarget, s0 = this.st.scale || 1, x0 = e.clientX, y0 = e.clientY, w0 = this.el.offsetWidth;
    grip.setPointerCapture(e.pointerId);
    const move = ev => this.setScale(s0 * (w0 + ((ev.clientX - x0) + (ev.clientY - y0)) / 2) / w0);
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      this.save();
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  },
  clamp() {
    const el = this.el, w = el.offsetWidth || 240, hgt = el.offsetHeight || 300;
    let { x, y } = this.st;
    if (x == null) { x = innerWidth - w - 24; y = innerHeight - hgt - 24; }
    x = Math.max(4, Math.min(innerWidth - w - 4, x));
    y = Math.max(4, Math.min(innerHeight - Math.min(hgt, innerHeight - 8) - 4, y)); // 창 전체가 화면 안에
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  },
  drag(e) {
    if (this.st.place !== 'float' || e.target.closest('button')) return;
    e.preventDefault();
    const el = this.el, bar = e.currentTarget, r = el.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    bar.setPointerCapture(e.pointerId);
    el.classList.add('dragging');
    const move = ev => { this.st.x = ev.clientX - dx; this.st.y = ev.clientY - dy; this.clamp(); };
    const up = () => {
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
      bar.removeEventListener('pointercancel', up);
      el.classList.remove('dragging');
      this.save();
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
  },
};
