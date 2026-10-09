'use strict';

/* =========================================================
   공부 캘린더 (#/cal)
   - 처음엔 2026년 10월 하나, "캘린더 추가"로 원하는 달(이전 달 포함)을 더함
   - 하루 공부 시간 = 타이머가 자동으로 쌓은 시간(auto) + 직접 추가한 기록(manual)
   - 모양(진하기 색 · 아이콘)은 화면 설정의 무드 프리셋을 따라감
   ========================================================= */
const Cal = {
  data: { months: ['2026-10'], days: {} }, // days['2026-10-9'] = { auto: ms, manual: [{ id, min, memo, course }] }
  cur: null, dirty: false,

  init() {
    try { Object.assign(this.data, JSON.parse(localStorage.getItem('sn-cal') || '{}')); } catch (e) { /* ignore */ }
    if (!Array.isArray(this.data.months) || !this.data.months.length) this.data.months = ['2026-10'];
    this.data.days = this.data.days || {};
  },
  save() {
    this.dirty = false;
    try { localStorage.setItem('sn-cal', JSON.stringify(this.data)); } catch (e) { toast('캘린더 저장 실패 (저장 공간 부족?)'); }
  },
  flush() { if (this.dirty) this.save(); },

  /* ---------- 날짜 ---------- */
  monthKey: (y, m) => `${y}-${String(m).padStart(2, '0')}`,
  dayKey: (y, m, d) => `${y}-${m}-${d}`, // Timer.dayKey()와 같은 형식
  parseMonth: k => k.split('-').map(Number),
  sortMonths() { this.data.months = [...new Set(this.data.months)].sort(); },

  /* ---------- 기록 ---------- */
  day(k) { return this.data.days[k] || (this.data.days[k] = { auto: 0, manual: [] }); },
  // 타이머가 쌓은 오늘 공부 시간을 그대로 반영 (저장은 Timer.save 때 같이)
  setAuto(k, ms) {
    const d = this.day(k);
    if (d.auto === ms) return;
    d.auto = ms;
    this.dirty = true;
    // 기록이 생긴 달은 캘린더에 자동으로 보이게
    const [y, m] = k.split('-').map(Number), mk = this.monthKey(y, m);
    if (ms > 0 && !this.data.months.includes(mk)) { this.data.months.push(mk); this.sortMonths(); }
  },
  totalMs(k) {
    const d = this.data.days[k];
    if (!d) return 0;
    return (d.auto || 0) + (d.manual || []).reduce((a, x) => a + (x.min || 0) * 60000, 0);
  },
  fmt(ms) {
    const m = Math.round(ms / 60000);
    if (!m) return '';
    return m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ' ' + (m % 60) + '분' : ''}` : `${m}분`;
  },
  fmtShort(ms) { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}` : `${m}분`; },

  /* ---------- 백업 ---------- */
  exportData() { this.flush(); return JSON.parse(JSON.stringify(this.data)); },
  // 불러오기: 달은 합치고, 날짜별 자동 기록은 큰 쪽, 직접 기록은 id 기준으로 합침
  importData(d) {
    if (!d || typeof d !== 'object') return;
    (d.months || []).forEach(m => { if (!this.data.months.includes(m)) this.data.months.push(m); });
    this.sortMonths();
    for (const [k, v] of Object.entries(d.days || {})) {
      const cur = this.day(k);
      cur.auto = Math.max(cur.auto || 0, v.auto || 0);
      for (const e of v.manual || []) if (!cur.manual.some(x => x.id === e.id)) cur.manual.push(e);
    }
    this.save();
  },

  /* ---------- 모양: 배경(무드 프리셋)과 연동하거나, 따로 정하거나 ---------- */
  style() {
    if (S.calSync !== false) return { heat: S.logo.color || '#4f5bd5', icon: S.calIcon == null ? '✏️' : S.calIcon, card: null };
    const c = S.calCustom || {};
    return { heat: c.heat || '#4f5bd5', icon: c.icon == null ? '✏️' : c.icon, card: c.card || null };
  },

  /* ---------- 화면 ---------- */
  render() {
    const page = $('#page'), months = this.data.months;
    page.className = 'calendar';
    page.innerHTML = '';
    const now = new Date(), nowKey = this.monthKey(now.getFullYear(), now.getMonth() + 1);
    if (!this.cur || !months.includes(this.cur)) this.cur = months.includes(nowKey) ? nowKey : months[months.length - 1];
    const i = months.indexOf(this.cur), [y, m] = this.parseMonth(this.cur);
    const first = new Date(y, m - 1, 1).getDay(), last = new Date(y, m, 0).getDate();
    let monthMs = 0, studyDays = 0, maxMs = 0;
    for (let d = 1; d <= last; d++) { const t = this.totalMs(this.dayKey(y, m, d)); monthMs += t; if (t) studyDays++; maxMs = Math.max(maxMs, t); }
    const { heat, icon, card } = this.style();
    const scale = Math.max(4 * 3600000, maxMs); // 4시간 이상부터 가장 진하게

    const cells = [];
    for (let k = 0; k < first; k++) cells.push(h('div', { class: 'cal-cell empty' }));
    for (let d = 1; d <= last; d++) {
      const key = this.dayKey(y, m, d), t = this.totalMs(key), dow = (first + d - 1) % 7;
      const isToday = y === now.getFullYear() && m === now.getMonth() + 1 && d === now.getDate();
      cells.push(h('button', {
        class: 'cal-cell' + (isToday ? ' today' : '') + (t ? ' has' : '') + (dow === 0 ? ' sun' : dow === 6 ? ' sat' : ''),
        style: t ? { background: hexA(heat, .12 + .55 * Math.min(1, t / scale)) } : null,
        onclick: () => this.dayModal(y, m, d),
      },
        h('span', { class: 'dn' }, d),
        t ? h('span', { class: 'ic' }, icon) : null,
        t ? h('span', { class: 'tm' }, this.fmtShort(t)) : null));
    }

    page.append(
      h('div', { class: 'cal-head' },
        h('h1', null, '공부 캘린더'),
        h('button', { class: 'btn', onclick: () => this.addMonth() }, '+ 캘린더 추가')),
      h('div', { class: 'cal-card', style: card ? { background: card, color: inkOn(card) ? '#2b2b2b' : '#f2f2f7' } : null },
        h('div', { class: 'cal-bar' },
          h('button', { class: 'icon-btn', disabled: i <= 0, onclick: () => { this.cur = months[i - 1]; this.render(); } }, '‹'),
          h('select', { class: 'inp cal-pick', onchange: e => { this.cur = e.target.value; this.render(); } },
            months.map(k => { const [yy, mm] = this.parseMonth(k); return h('option', { value: k, selected: k === this.cur }, `${yy}년 ${mm}월`); })),
          h('button', { class: 'icon-btn', disabled: i >= months.length - 1, onclick: () => { this.cur = months[i + 1]; this.render(); } }, '›'),
          h('span', { class: 'cal-sum' }, monthMs ? `이번 달 ${this.fmt(monthMs)} · ${studyDays}일 공부` : '아직 기록 없음'),
          h('button', { class: 'btn ghost cal-del', title: '이 달과 그 달의 공부 기록을 모두 삭제', onclick: () => this.removeMonth(this.cur) }, '이 달 삭제')),
        h('div', { class: 'cal-grid' },
          ['일', '월', '화', '수', '목', '금', '토'].map((w, k) => h('div', { class: 'cal-dow' + (k === 0 ? ' sun' : k === 6 ? ' sat' : '') }, w)),
          cells)),
      // 사용법 안내는 편집 모드에서만
      S.mode === 'edit' ? h('p', { class: 'hint cal-hint' }, '날짜를 누르면 그날 기록을 보고 직접 추가할 수 있음. 타이머(뽀모도로 집중·타이머·스톱워치)가 돌아간 시간은 자동으로 기록됨.') : '');
  },

  async addMonth() {
    const [cy, cm] = this.parseMonth(this.cur || '2026-10');
    let ny = cy, nm = cm + 1;
    if (nm > 12) { nm = 1; ny++; }
    const yi = h('input', { type: 'number', min: 2000, max: 2100, value: ny }), mi = h('input', { type: 'number', min: 1, max: 12, value: nm });
    const m = openModal({
      title: '캘린더 추가',
      body: h('div', null, h('div', { class: 'row' },
        h('label', { class: 'field' }, h('span', null, '년'), yi),
        h('label', { class: 'field' }, h('span', null, '월'), mi)),
        h('p', { class: 'hint' }, '지난 달도 추가할 수 있음. 달 목록은 날짜 순서대로 정렬됨.')),
      actions: [
        { label: '취소', onclick: close => close() },
        { label: '추가', kind: 'primary', onclick: close => {
          const y = Math.round(+yi.value), mo = Math.round(+mi.value), key = this.monthKey(y, mo);
          if (!(mo >= 1 && mo <= 12) || !(y >= 2000 && y <= 2100)) { toast('2000~2100년, 1~12월 사이로 골라주세요'); return; }
          if (!this.data.months.includes(key)) { this.data.months.push(key); this.sortMonths(); this.save(); }
          this.cur = key;
          close();
          this.render();
        } }],
    });
    setTimeout(() => { mi.focus(); mi.select(); }, 30);
    return m;
  },
  // 달 삭제: 목록에서 빼고 그 달의 공부 기록(자동·직접)도 모두 지움
  async removeMonth(key) {
    const [y, m] = this.parseMonth(key), pre = `${y}-${m}-`;
    const days = Object.keys(this.data.days).filter(k => k.startsWith(pre));
    const total = days.reduce((a, k) => a + this.totalMs(k), 0);
    if (!await askConfirm('이 달 삭제', `${y}년 ${m}월과 그 달의 공부 기록${total ? ` (${this.fmt(total)})` : ''}을 모두 삭제함. 되돌릴 수 없음.`, '삭제', true)) return;
    days.forEach(k => { delete this.data.days[k]; });
    // 오늘이 든 달이면 타이머의 오늘 공부 시간도 0으로 (안 그러면 다시 채워짐)
    if (Timer.dayKey().startsWith(pre)) Timer.resetStudy();
    this.data.months = this.data.months.filter(x => x !== key);
    if (!this.data.months.length) this.data.months = ['2026-10'];
    this.cur = null;
    this.save();
    this.render();
  },

  // 하루 기록 보기 · 직접 추가 · 삭제
  dayModal(y, mo, d) {
    const key = this.dayKey(y, mo, d), rec = this.day(key);
    const wd = ['일', '월', '화', '수', '목', '금', '토'][new Date(y, mo - 1, d).getDay()];
    const list = h('div', { class: 'cal-list' }), total = h('b');
    const hi = h('input', { type: 'number', min: 0, max: 23, value: 0 }), mi = h('input', { type: 'number', min: 0, max: 59, value: 30 });
    const course = h('select', null, h('option', { value: '' }, '과목 (선택)'), S.courses.map(c => h('option', { value: c.name }, c.name)));
    const memo = h('input', { type: 'text', placeholder: '메모 (예: 3단원 복습)' });
    const draw = () => {
      total.textContent = this.fmt(this.totalMs(key)) || '0분';
      list.replaceChildren(
        h('div', { class: 'cal-item auto' }, h('span', { class: 'what' }, '⏱ 타이머 자동 기록'), h('span', { class: 'len' }, this.fmt(rec.auto || 0) || '0분')),
        ...rec.manual.map(e => h('div', { class: 'cal-item' },
          h('span', { class: 'what' }, '✎ ' + [e.course, e.memo].filter(Boolean).join(' · ') || '✎ 직접 기록'),
          h('span', { class: 'len' }, this.fmt(e.min * 60000)),
          h('button', { class: 'icon-btn', title: '삭제', onclick: () => { rec.manual = rec.manual.filter(x => x !== e); this.save(); draw(); } }, '✕'))));
      if (S.view === 'cal') this.render(); // 뒤에 있는 달력도 바로 갱신
    };
    draw();
    openModal({
      title: `${y}년 ${mo}월 ${d}일 (${wd})`,
      body: h('div', null,
        h('div', { class: 'cal-total' }, '이날 공부 ', total),
        list,
        h('h4', { class: 'info-h' }, '기록 추가'),
        h('div', { class: 'row' },
          h('label', { class: 'field' }, h('span', null, '시간'), hi),
          h('label', { class: 'field' }, h('span', null, '분'), mi),
          h('label', { class: 'field' }, h('span', null, '과목'), course)),
        h('label', { class: 'field' }, h('span', null, '메모'), memo),
        h('button', { class: 'btn primary', onclick: () => {
          const min = Math.round(+hi.value) * 60 + Math.round(+mi.value);
          if (!(min > 0)) { toast('시간을 입력하세요'); return; }
          rec.manual.push({ id: uid(), min, memo: memo.value.trim(), course: course.value });
          memo.value = '';
          this.save();
          draw();
        } }, '+ 기록 추가')),
      actions: [{ label: '닫기', kind: 'primary', onclick: close => close() }],
    });
  },
};
