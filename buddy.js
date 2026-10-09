'use strict';

/* =========================================================
   스터디 버디 (떠다니는 친구): 내가 넣은 이미지가 둥둥 떠 있다가,
   글을 쓰거나 누를 때마다 뽀잉 튀고, 시간이 지나면 말을 함.
   위치: 끄기 | 사이드바 아래 | 떠 있는 창(끌어서 옮김)
   ========================================================= */
const BUDDY_LINES = [
  '오늘도 화이팅! ✨',
  '오늘 벌써 {study} 공부했어요!',
  '사이트 연 지 {m}분 지났어요',
  '물 한 잔 마시고 와요 💧',
  '어깨 한 번 쭉 펴볼까요?',
  '잘하고 있어요, 조금만 더!',
  '지금 {time}이에요. 무리하지 마요',
];

// PNG 안에 움직이는 장면(acTL)이 있는지
async function isApng(file) {
  const buf = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  for (let i = 0; i < buf.length - 4; i++) if (buf[i] === 0x61 && buf[i + 1] === 0x63 && buf[i + 2] === 0x54 && buf[i + 3] === 0x4c) return true;
  return false;
}

const Buddy = {
  // basis: 'clock' = 시간이 흐르면 / 'study' = 타이머로 공부한 시간이 쌓이면
  st: { place: 'off', size: 110, speak: true, every: 15, basis: 'clock', lines: null, x: null, y: null },
  img: null, el: null,
  // 사이트 연 시각: 같은 탭에서 새로고침해도 이어짐
  t0: (() => { try { const v = +sessionStorage.getItem('sn-t0'); if (v) return v; sessionStorage.setItem('sn-t0', Date.now()); } catch (e) { /* ignore */ } return Date.now(); })(), lastSay: Date.now(), lastSayStudy: null, bubbleTimer: 0, lastBoing: 0,

  init() {
    try { Object.assign(this.st, JSON.parse(localStorage.getItem('sn-buddy') || '{}')); } catch (e) { /* ignore */ }
    this.build();
    this.loadImg().then(() => this.place());
    // 작업할 때마다 뽀잉 (너무 자주는 말고)
    const poke = () => this.boing();
    document.addEventListener('input', poke, true);
    document.addEventListener('keydown', poke, true);
    $('#page').addEventListener('pointerdown', poke);
    setInterval(() => this.tickSpeech(), 20000);
    addEventListener('resize', () => { if (this.st.place === 'float') this.clamp(); });
  },
  save() { try { localStorage.setItem('sn-buddy', JSON.stringify(this.st)); } catch (e) { /* ignore */ } },
  lines() { return (this.st.lines && this.st.lines.length ? this.st.lines : BUDDY_LINES); },
  active() { return this.st.place !== 'off' && !!this.img; },

  build() {
    this.pic = h('img', { class: 'bd-img', alt: '', draggable: 'false' });
    this.bubble = h('div', { class: 'bd-bubble' });
    this.el = h('div', { class: 'buddy' }, this.bubble, h('div', { class: 'bd-float' }, h('div', { class: 'bd-bounce' }, this.pic)));
    this.el.addEventListener('pointerdown', e => this.press(e));
  },
  place() {
    const el = this.el, p = this.st.place;
    el.classList.toggle('float', p === 'float');
    el.classList.toggle('dock', p === 'dock');
    el.style.setProperty('--bd-size', this.st.size + 'px');
    el.classList.toggle('no-idle', this.st.idle === false);
    if (this.img) this.pic.src = this.img;
    if (!this.active()) { el.remove(); return; }
    if (p === 'dock') {
      const foot = $('#sidebar .sb-foot');
      if (foot) foot.before(el); else el.remove();
      el.style.left = el.style.top = '';
    } else {
      if (el.parentElement !== document.body) document.body.append(el);
      this.clamp();
    }
  },
  clamp() {
    const el = this.el, w = this.st.size, hgt = this.st.size;
    let { x, y } = this.st;
    if (x == null) { x = innerWidth - w - 40; y = 90; }
    x = Math.max(4, Math.min(innerWidth - w - 4, x));
    y = Math.max(4, Math.min(innerHeight - hgt - 4, y));
    el.style.left = x + 'px';
    el.style.top = y + 'px';
  },

  /* ---------- 움직임 ---------- */
  boing(force) {
    if (!this.active() || (!force && this.st.react === false)) return;
    const now = Date.now();
    if (!force && now - this.lastBoing < 700) return;
    this.lastBoing = now;
    const b = $('.bd-bounce', this.el);
    b.classList.remove('boing');
    void b.offsetWidth;
    b.classList.add('boing');
  },
  // 누르면 말하고, 끌면 옮김 (떠 있는 창일 때)
  press(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const float = this.st.place === 'float', el = this.el, r = el.getBoundingClientRect();
    const dx = e.clientX - r.left, dy = e.clientY - r.top, x0 = e.clientX, y0 = e.clientY;
    let moved = false;
    if (float) { e.preventDefault(); el.setPointerCapture(e.pointerId); }
    const move = ev => {
      if (!float) return;
      if (!moved && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return;
      moved = true;
      el.classList.add('dragging');
      this.st.x = ev.clientX - dx;
      this.st.y = ev.clientY - dy;
      this.clamp();
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.classList.remove('dragging');
      if (moved) this.save();
      else { this.boing(true); this.say(); }
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  },

  /* ---------- 말하기 ---------- */
  // {m} 사이트 연 뒤 분 · {s} 오늘 공부한 분 · {study} 오늘 공부한 시간(1시간 5분) · {time} 지금 시각
  fill(t) {
    const d = new Date(), m = Math.floor((Date.now() - this.t0) / 60000), sm = Timer.studyMs();
    return t.replace(/\{m\}/g, m).replace(/\{s\}/g, Math.floor(sm / 60000)).replace(/\{study\}/g, Timer.fmtStudy(sm))
      .replace(/\{time\}/g, `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`);
  },
  say(text) {
    if (!this.active()) return;
    const ls = this.lines();
    this.bubble.textContent = this.fill(text || ls[Math.floor(Math.random() * ls.length)]);
    this.bubble.classList.add('show');
    this.lastSay = Date.now();
    this.lastSayStudy = Timer.studyMs();
    clearTimeout(this.bubbleTimer);
    this.bubbleTimer = setTimeout(() => this.bubble.classList.remove('show'), 5500);
  },
  tickSpeech() {
    if (!this.active() || !this.st.speak || document.hidden) return;
    const gap = this.st.every * 60000;
    if (this.st.basis === 'study') {
      const sm = Timer.studyMs();
      if (this.lastSayStudy == null) this.lastSayStudy = sm;
      if (sm - this.lastSayStudy >= gap) { this.boing(true); this.say(); }
    } else if (Date.now() - this.lastSay >= gap) { this.boing(true); this.say(); }
  },

  /* ---------- 이미지 저장: 움짤도 원본 그대로 쓰려고 IndexedDB(images 저장소, id 'buddy-img')에 ---------- */
  IMG_ID: 'buddy-img',
  async loadImg() {
    try {
      const rec = await DB.get('images', this.IMG_ID);
      if (rec) { this.setBlob(rec.blob); return; }
      // 예전 버전(localStorage에 저장)에서 옮겨오기
      const old = localStorage.getItem('sn-buddy-img');
      if (old) { await this.storeBlob(dataURLToBlob(old)); localStorage.removeItem('sn-buddy-img'); }
    } catch (e) { console.error(e); }
  },
  setBlob(blob) {
    if (this.img && this.img.startsWith('blob:')) URL.revokeObjectURL(this.img);
    this.blob = blob;
    this.img = blob ? URL.createObjectURL(blob) : null;
  },
  async storeBlob(blob) {
    await DB.put('images', { id: this.IMG_ID, blob, type: blob.type });
    this.setBlob(blob);
  },

  /* ---------- 전체 백업에 넣고 빼기 ---------- */
  async exportData() {
    if (!this.blob && !this.st.lines) return null;
    const { x, y, ...st } = this.st;
    return { st, img: this.blob ? await blobToDataURL(this.blob) : null };
  },
  async importData(d) {
    if (!d || typeof d !== 'object') return;
    if (d.st) Object.assign(this.st, d.st);
    if (d.img) { try { await this.storeBlob(dataURLToBlob(d.img)); } catch (e) { console.error(e); } }
    this.save();
    this.place();
  },
  onTimer(kind) {
    if (!this.active()) return;
    this.boing(true);
    this.say({ focusDone: '집중 끝! 수고했어요, 잠깐 쉬어요 ☕', breakDone: '휴식 끝! 다시 해볼까요?', timerDone: '시간 다 됐어요! ⏰' }[kind]);
  },

  /* ---------- 설정 (화면 설정 탭) ---------- */
  async pick() {
    const [f] = await pickFile('image/*');
    if (!f) return false;
    try {
      // 움짤(GIF·WebP·APNG)은 원본 그대로, 일반 사진은 투명 배경 살려서 PNG로 줄임
      const animated = /gif|webp|apng/i.test(f.type) || (f.type === 'image/png' && await isApng(f));
      if (animated && f.size > 8 * 1048576) { toast('움짤이 너무 큼 (8MB 이하로 넣어주세요)'); return false; }
      await this.storeBlob(animated ? f : dataURLToBlob(await shrinkImage(f, 360, 1, 'image/png')));
      if (this.st.place === 'off') this.st.place = 'float';
      this.save();
      this.place();
      this.boing(true);
      return true;
    } catch (e) { toast('이미지를 저장할 수 없음 (용량이 너무 큼?)'); return false; }
  },
  settings(redraw) {
    const st = this.st, set = (k, v, again) => { st[k] = v; this.save(); this.place(); if (again) redraw(); };
    const head = (title, desc) => h('div', { class: 'set-row-head' }, h('b', null, title), desc ? h('span', { class: 'hint' }, desc) : null);
    const lines = h('textarea', { class: 'inp bd-lines', rows: 5, placeholder: BUDDY_LINES.join('\n') });
    lines.value = (st.lines || []).join('\n');
    lines.oninput = () => { st.lines = lines.value.split('\n').map(s => s.trim()).filter(Boolean); this.save(); };
    return h('div', { class: 'set-row' }, head('이미지 · 위치', '내가 넣은 이미지가 둥둥 떠다니고, 글을 쓸 때마다 뽀잉 움직임'),
      h('div', { class: 'bd-set' },
        h('button', { class: 'bd-preview', title: '이미지 넣기', onclick: async () => { if (await this.pick()) redraw(); } },
          this.img ? h('img', { src: this.img, alt: '' }) : h('span', null, '＋', h('br'), '이미지')),
        h('div', { class: 'bd-opts' },
          h('div', { class: 'seg' }, [['off', '끄기'], ['dock', '사이드바 아래'], ['float', '떠 있는 창']].map(([v, t]) =>
            h('button', { class: st.place === v ? 'on' : '', onclick: async () => {
              if (v !== 'off' && !this.img && !await this.pick()) return;
              set('place', v, true);
              if (v === 'dock' && !document.body.classList.contains('sb-open')) App.toggleSidebar(true);
            } }, t))),
          h('div', { class: 'pop-range' }, h('span', { class: 'hint' }, '크기'),
            h('input', { type: 'range', min: 60, max: 220, step: 10, value: st.size, oninput: e => set('size', +e.target.value) })),
          this.img ? h('div', { class: 'pop-row' },
            h('button', { class: 'btn', onclick: async () => { if (await this.pick()) redraw(); } }, '이미지 바꾸기'),
            h('button', { class: 'btn', onclick: () => { this.boing(true); this.say(); } }, '말 걸어보기')) : null)),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.idle !== false, onchange: e => set('idle', e.target.checked) }), '가만히 있을 때도 둥둥 떠다니기'),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.react !== false, onchange: e => set('react', e.target.checked) }), '글 쓰거나 누를 때마다 뽀잉 움직이기'),
      h('label', { class: 'check' }, h('input', { type: 'checkbox', checked: st.speak, onchange: e => set('speak', e.target.checked, true) }), '시간이 지나면 말하기'),
      st.speak ? h('div', null,
        h('div', { class: 'pop-row', style: { padding: '0 0 6px', flexWrap: 'wrap' } },
          h('div', { class: 'seg' }, [['clock', '시간이 흐르면'], ['study', '공부 시간이 쌓이면']].map(([v, t]) =>
            h('button', { class: (st.basis || 'clock') === v ? 'on' : '', title: v === 'study' ? '타이머(뽀모도로 집중·타이머·스톱워치)가 돌아간 시간 기준' : '타이머와 상관없이 시계 기준', onclick: () => { this.lastSayStudy = Timer.studyMs(); set('basis', v, true); } }, t))),
          h('select', { class: 'inp bd-every', onchange: e => set('every', +e.target.value) },
            [5, 10, 15, 20, 30, 45, 60].map(m => h('option', { value: m, selected: st.every === m }, m + '분마다')))),
        h('label', { class: 'field' }, h('span', null, '대사 (한 줄에 하나, 비워두면 기본 대사)'), lines),
        h('div', { class: 'hint' }, '{study} → 오늘 타이머로 공부한 시간 (예: 1시간 5분), {s} → 그 분 수, {m} → 사이트를 연 뒤 지난 분, {time} → 지금 시각.'),
        h('div', { class: 'hint' }, '버디를 누르면 바로 한 마디, 타이머가 끝나도 한 마디.')) : null);
  },
};
