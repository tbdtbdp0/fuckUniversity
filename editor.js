'use strict';

/* =========================================================
   편집 모드
   ========================================================= */
const TEXT_COLORS = ['#1f2328', '#d93025', '#e8710a', '#188038', '#1a73e8', '#8430ce', '#80868b'];
const HILITES = ['#fff3a3', '#c8f7c5', '#cfe8ff', '#ffd6e7', '#ffe0b2', '#e6d9ff'];
const FONT_SIZES = [12, 14, 15, 17, 20, 24, 30];

const Editor = {
  saveTimer: null, dirty: false, savedRange: null, hist: { undo: [], redo: [], cur: '' }, histTimer: null, lastColor: '#d93025', lastHilite: '#fff3a3',

  init() {
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* ignore */ }
    document.addEventListener('selectionchange', () => {
      const s = getSelection();
      if (!s.rangeCount) return;
      const n = s.anchorNode, el = n && (n.nodeType === 1 ? n : n.parentElement);
      if (el && el.closest('.editor .rich[contenteditable]')) this.savedRange = s.getRangeAt(0).cloneRange();
    });
    document.addEventListener('paste', e => this.onPaste(e), true);
    const page = $('#page');
    page.addEventListener('pointerdown', e => {
      if (S.mode !== 'edit' || !S.note) return;
      const blk = e.target.closest('.blk');
      if (blk) this.setActive(blk.dataset.id);
    });
    page.addEventListener('focusin', e => {
      const blk = e.target.closest && e.target.closest('.editor .blk');
      if (blk) this.setActive(blk.dataset.id);
    });
    page.addEventListener('dragover', e => {
      if (S.mode !== 'edit' || !S.note || ![...e.dataTransfer.types].includes('Files')) return;
      e.preventDefault();
      $$('.blk.dragover', page).forEach(b => b.classList.remove('dragover'));
      const blk = e.target.closest('.blk');
      if (blk) blk.classList.add('dragover');
    });
    page.addEventListener('drop', e => {
      if (S.mode !== 'edit' || !S.note) return;
      const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
      if (!files.length) return;
      e.preventDefault();
      const blk = e.target.closest('.blk');
      this.insertImages(files, blk && blk.dataset.id);
    });
    document.addEventListener('keydown', e => {
      if (S.mode !== 'edit' || !S.note || !(e.metaKey || e.ctrlKey) || e.target.closest('.modal')) return;
      const k = e.key.toLowerCase();
      if (k !== 'z' && k !== 'y') return;
      e.preventDefault();
      if (k === 'y' || e.shiftKey) this.redo(); else this.undo();
    });
    // 아이패드 키보드의 되돌리기 버튼·흔들어 되돌리기도 같은 기록을 쓰도록
    page.addEventListener('beforeinput', e => {
      if (e.inputType !== 'historyUndo' && e.inputType !== 'historyRedo') return;
      e.preventDefault();
      if (e.inputType === 'historyUndo') this.undo(); else this.redo();
    });
    // 표: 칸 테두리를 끌어서 열 너비·행 높이 조절 (마우스·트랙패드). 터치는 "표 ▾" 메뉴로.
    page.addEventListener('pointermove', e => {
      if (S.mode !== 'edit' || e.buttons || e.pointerType !== 'mouse') return;
      const hit = this.tableEdge(e);
      page.style.cursor = hit ? (hit.kind === 'col' ? 'col-resize' : 'row-resize') : '';
    });
    page.addEventListener('pointerdown', e => {
      if (S.mode !== 'edit' || e.pointerType !== 'mouse' || e.button !== 0) return;
      const hit = this.tableEdge(e);
      if (hit) this.startTableResize(e, hit);
    }, true);
    addEventListener('pagehide', () => this.flush());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.flush(); });
  },

  /* ---------- 저장 ---------- */
  touch() {
    if (!S.note) return;
    this.dirty = true;
    this.status('저장 중…');
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 500);
    clearTimeout(this.histTimer);
    this.histTimer = setTimeout(() => this.commit(), 400);
  },

  /* ---------- 되돌리기 / 다시 실행 (노트 전체 스냅샷) ---------- */
  snap() { return JSON.stringify({ title: S.note.title, blocks: S.note.blocks }); },
  resetHistory() {
    clearTimeout(this.histTimer);
    this.hist = { undo: [], redo: [], cur: S.note ? this.snap() : '' };
    this.updateHist();
  },
  commit() {
    clearTimeout(this.histTimer);
    if (!S.note) return;
    const s = this.snap(), hs = this.hist;
    if (s === hs.cur) return;
    hs.undo.push(hs.cur);
    if (hs.undo.length > 150) hs.undo.shift();
    hs.cur = s;
    hs.redo = [];
    this.updateHist();
  },
  undo() { this.travel('undo', 'redo'); },
  redo() { this.travel('redo', 'undo'); },
  travel(from, to) {
    if (!S.note) return;
    this.commit();
    const hs = this.hist;
    if (!hs[from].length) return;
    hs[to].push(hs.cur);
    hs.cur = hs[from].pop();
    const d = JSON.parse(hs.cur), blocks = S.note.blocks;
    S.note.title = d.title;
    blocks.length = 0;
    blocks.push(...d.blocks);
    if (!this.block(S.activeBlock)) S.activeBlock = null;
    this.savedRange = null;
    this.dirty = true;
    this.status('저장 중…');
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 300);
    if (S.mode === 'edit') this.render(); else Study.render();
    App.renderSidebar();
    App.renderTopbar();
    this.updateHist();
  },
  updateHist() {
    const u = $('#btn-undo'), r = $('#btn-redo');
    if (u) u.disabled = !this.hist.undo.length && this.snapSame();
    if (r) r.disabled = !this.hist.redo.length;
  },
  snapSame() { return !S.note || this.snap() === this.hist.cur; },
  async flush() {
    clearTimeout(this.saveTimer);
    if (!this.dirty || !S.note) return;
    this.dirty = false;
    S.note.updatedAt = Date.now();
    try {
      await DB.put('notes', S.note);
      const d = new Date();
      this.status(`자동 저장됨 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    } catch (err) {
      this.dirty = true;
      this.status('저장 실패!');
      console.error(err);
    }
  },
  status(t) { const el = $('#save-status'); if (el) el.textContent = t; },

  /* ---------- 렌더 ---------- */
  render() {
    const page = $('#page'), sc = $('#scroller'), y = sc.scrollTop, n = S.note;
    page.className = 'paper editor' + (S.showEn ? ' show-en wide' : '');
    page.style.zoom = '';
    page.innerHTML = '';
    page.append(h('input', {
      class: 'title-input', value: n.title, placeholder: '챕터 제목',
      oninput: e => { n.title = e.target.value; this.touch(); App.renderSidebar(); App.renderTopbar(); },
    }));
    n.blocks.forEach(b => page.append(this.blockEl(b)));
    page.append(h('div', { class: 'add-row' },
      h('button', { class: 'btn', onclick: () => this.add('text', null, true) }, '+ 텍스트 블록'),
      h('button', { class: 'btn', onclick: () => this.add('image', null, true) }, '+ 이미지 블록'),
      h('button', { class: 'btn', onclick: () => this.add('space', null, true) }, '+ 여백 블록')));
    sc.scrollTop = y;
  },

  blockEl(b) {
    const el = h('div', { class: `blk blk-${b.type}` + (b.id === S.activeBlock ? ' active' : ''), dataset: { id: b.id } });
    if (b.breakBefore) el.append(h('div', { class: 'pb-mark' }, 'PDF 페이지 나눔'));
    el.append(h('div', { class: 'blk-grip', title: '끌어서 블록 이동', onpointerdown: e => this.startDrag(e, b) }, '⠿'), this.toolsEl(b));
    if (b.fold) el.append(h('div', { class: 'fold-edit' }, '▸ 접기 블록',
      h('input', { value: b.foldLabel || '', placeholder: '접었을 때 보일 제목 (예: 예시, 암기할 내용)', oninput: e => { b.foldLabel = e.target.value; this.touch(); } })));

    if (b.type === 'toc') {
      el.append(h('div', { class: 'toc-wrap' }, this.tocPreview()));
      return el;
    }

    if (b.type === 'space') {
      const sp = h('div', { class: 'space pat-' + (b.pattern || 'blank'), style: { height: (b.height || 140) + 'px' } });
      const grip = h('div', { class: 'space-grip', title: '끌어서 높이 조절' });
      grip.addEventListener('pointerdown', e => {
        e.preventDefault();
        grip.setPointerCapture(e.pointerId);
        const y0 = e.clientY, h0 = b.height || 140;
        const move = ev => { b.height = Math.max(30, Math.round(h0 + ev.clientY - y0)); sp.style.height = b.height + 'px'; };
        const up = () => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); this.touch(); };
        grip.addEventListener('pointermove', move);
        grip.addEventListener('pointerup', up);
      });
      sp.append(grip);
      el.append(sp);
      return el;
    }

    if (b.type === 'image') {
      const fig = h('div', { class: 'fig', style: { textAlign: b.align || 'center' } });
      if (b.image) {
        const img = h('img', { style: { width: (b.width || 80) + '%' }, alt: b.figLabel || '' });
        Images.url(b.image).then(u => { if (u) img.src = u; });
        fig.append(img);
        el.append(h('div', { class: 'fig-ctl' },
          '크기', h('input', { type: 'range', min: 10, max: 100, value: b.width || 80, oninput: e => { b.width = +e.target.value; img.style.width = b.width + '%'; this.touch(); } }),
          ['left', 'center', 'right'].map(a => h('button', { class: 'tb outlined' + ((b.align || 'center') === a ? ' on' : ''), onclick: () => this.mut(() => { b.align = a; }) }, { left: '왼쪽', center: '가운데', right: '오른쪽' }[a])),
          h('button', { class: 'tb outlined', onclick: () => this.pickImage(b) }, '이미지 교체')));
      } else {
        fig.append(h('button', { class: 'dropzone', onclick: () => this.pickImage(b) },
          h('b', null, b.figLabel || 'Figure'),
          h('span', null, '눌러서 이미지 선택 · 붙여넣기(Ctrl/⌘+V) · 끌어다 놓기')));
        el.append(h('div', { class: 'fig-ctl' }, '넣을 그림 메모',
          h('input', { type: 'text', value: b.figLabel || '', placeholder: '예: Figure 3.2 (슬라이드 14)', oninput: e => { b.figLabel = e.target.value; $('.dropzone b', el).textContent = b.figLabel || 'Figure'; this.touch(); } })));
      }
      el.append(fig);
    }

    const ph = b.type === 'image' ? ['그림 설명·해석', 'Caption / original text'] : ['내용 입력', 'English original'];
    el.append(h('div', { class: 'tb-grid' }, this.richEl(b, 'ko', ph[0]), this.richEl(b, 'en', ph[1])));
    return el;
  },

  richEl(b, field, ph) {
    return h('div', {
      class: 'rich ' + field, contenteditable: 'true', spellcheck: 'false', dataset: { field, ph }, html: b[field] || '',
      oninput: e => this.syncRich(e.currentTarget),
      onkeydown: e => {
        if (e.key !== 'Tab') return;
        e.preventDefault();
        document.execCommand(e.shiftKey ? 'outdent' : 'indent');
        this.syncRich(e.currentTarget);
      },
    });
  },

  syncRich(rich) {
    const b = this.block(rich.closest('.blk').dataset.id);
    if (!b) return;
    if (!rich.textContent.trim() && !rich.querySelector('table,hr')) rich.innerHTML = '';
    b[rich.dataset.field] = rich.innerHTML;
    this.touch();
    this.updateHist();
    if (S.note.blocks.some(x => x.type === 'toc')) {
      clearTimeout(this.tocTimer);
      this.tocTimer = setTimeout(() => $$('#page .toc-wrap').forEach(w => w.replaceChildren(this.tocPreview())), 300);
    }
  },
  tocPreview() {
    return [tocEl(S.note, t => {
      const el = $(`#page .blk[data-id="${t.blockId}"]`);
      const target = el && ($$(TOC_SEL, el)[t.idx] || el);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }), h('div', { class: 'hint' }, '자동 목차 — 제목·소제목을 고치면 저절로 바뀜. 공부 모드에서 누르면 그 위치로 이동.')];
  },
  insertToc() {
    const ex = S.note.blocks.find(b => b.type === 'toc');
    if (ex) {
      const el = $(`#page .blk[data-id="${ex.id}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast('이미 목차가 있음 (위치는 블록 이동으로 바꿀 수 있음)');
      return;
    }
    const b = newBlock('toc');
    this.mut(() => { S.note.blocks.unshift(b); S.activeBlock = b.id; });
    $('#scroller').scrollTop = 0;
    if (!tocEntries(S.note).length) toast('목차 넣음 — 아직 제목·소제목이 없어서 비어 있음');
  },

  /* ---------- 표 ---------- */
  curCell() {
    const r = this.savedRange;
    if (!r || !document.contains(r.startContainer)) return null;
    const n = r.startContainer, el = n.nodeType === 1 ? n : n.parentElement;
    const cell = el && el.closest('td,th');
    return cell && cell.closest('.editor .rich[contenteditable]') ? cell : null;
  },
  insertTable(rows, cols, head) {
    const rich = this.restoreSel();
    if (!rich) { toast('먼저 표를 넣을 칸에 커서를 두세요'); return; }
    const row = tag => '<tr>' + `<${tag}><br></${tag}>`.repeat(cols) + '</tr>';
    const html = '<table><tbody>' + (head ? row('th') : '') + row('td').repeat(head ? rows - 1 : rows) + '</tbody></table><p><br></p>';
    this.commit();
    document.execCommand('insertHTML', false, html);
    this.syncRich(rich);
  },
  tablePicker(anchor) {
    const N = 8, label = h('div', { class: 'menu-label' }, '표 크기를 고르세요');
    const head = h('input', { type: 'checkbox', checked: true });
    const cells = [];
    const mark = (r, c) => {
      cells.forEach(x => x.el.classList.toggle('on', x.r <= r && x.c <= c));
      label.textContent = r ? `${r}행 × ${c}열` : '표 크기를 고르세요';
    };
    const grid = h('div', { class: 'tbl-pick', onpointerleave: () => mark(0, 0) });
    for (let r = 1; r <= N; r++) for (let c = 1; c <= N; c++) {
      const el = h('div', { onpointerenter: () => mark(r, c), onclick: () => { closePop(); this.insertTable(r, c, head.checked); } });
      cells.push({ el, r, c });
      grid.append(el);
    }
    popover(anchor, [label, grid, h('label', { class: 'check pop-check' }, head, '첫 줄을 머리글로')]);
  },
  // 표 안에서: 행·열 추가/삭제, 크기 조절
  tableMenu(anchor) {
    const cell = this.curCell();
    if (!cell) { this.tablePicker(anchor); return; }
    const op = fn => () => {
      const c = this.curCell() || cell, rich = c.closest('.rich'), tbl = c.closest('table');
      this.commit();
      const next = fn(c, tbl, c.parentElement);
      if (!tbl.rows.length || !tbl.rows[0].cells.length) tbl.remove();
      if (next && document.contains(next)) this.caretIn(next);
      this.syncRich(rich);
    };
    const mkCell = (ref, tag) => h(tag || (ref && ref.tagName === 'TH' ? 'th' : 'td'), null, h('br'));
    const colIdx = c => c.cellIndex;
    popMenu(anchor, [
      { text: '행' },
      { label: '위에 행 추가', fn: op((c, t, tr) => { const n = h('tr', null, [...tr.cells].map(() => mkCell(null, 'td'))); tr.before(n); return n.cells[colIdx(c)]; }) },
      { label: '아래에 행 추가', fn: op((c, t, tr) => { const n = h('tr', null, [...tr.cells].map(() => mkCell(null, 'td'))); tr.after(n); return n.cells[colIdx(c)]; }) },
      { label: '행 높이 늘리기', fn: op((c, t, tr) => { tr.style.height = Math.round(tr.getBoundingClientRect().height + 16) + 'px'; return c; }) },
      { label: '행 높이 줄이기', fn: op((c, t, tr) => { tr.style.height = Math.max(24, Math.round(tr.getBoundingClientRect().height - 16)) + 'px'; return c; }) },
      { label: '행 삭제', danger: true, fn: op((c, t, tr) => { const i = tr.rowIndex; tr.remove(); const r = t.rows[Math.min(i, t.rows.length - 1)]; return r && r.cells[0]; }) },
      { text: '열' },
      { label: '왼쪽에 열 추가', fn: op((c, t) => { const i = colIdx(c); [...t.rows].forEach(r => { const ref = r.cells[Math.min(i, r.cells.length - 1)]; if (ref) ref.before(mkCell(ref)); }); this.freezeWidths(t, true); return c; }) },
      { label: '오른쪽에 열 추가', fn: op((c, t) => { const i = colIdx(c); [...t.rows].forEach(r => { const ref = r.cells[Math.min(i, r.cells.length - 1)]; if (ref) ref.after(mkCell(ref)); }); this.freezeWidths(t, true); return c; }) },
      { label: '열 넓히기', fn: op((c, t) => { this.nudgeCol(t, colIdx(c), 5); return c; }) },
      { label: '열 좁히기', fn: op((c, t) => { this.nudgeCol(t, colIdx(c), -5); return c; }) },
      { label: '열 삭제', danger: true, fn: op((c, t) => { const i = colIdx(c); [...t.rows].forEach(r => { if (r.cells[i]) r.cells[i].remove(); }); this.freezeWidths(t, true); const r0 = c.parentElement; return r0 && r0.cells[Math.max(0, i - 1)]; }) },
      { text: '표' },
      { label: '첫 줄 머리글 켜기/끄기', fn: op((c, t) => {
        const r0 = t.rows[0], toTh = [...r0.cells].some(x => x.tagName !== 'TH');
        [...r0.cells].forEach(x => { const n = h(toTh ? 'th' : 'td'); n.append(...x.childNodes); [...x.attributes].forEach(a => n.setAttribute(a.name, a.value)); x.replaceWith(n); });
        return r0.cells[0];
      }) },
      { label: '열 너비·행 높이 초기화', fn: op((c, t) => { t.style.tableLayout = ''; $$('td,th,tr', t).forEach(x => { x.style.width = ''; x.style.height = ''; }); return c; }) },
      { label: '새 표 넣기…', fn: () => setTimeout(() => this.tablePicker(anchor), 0) },
      { label: '표 삭제', danger: true, fn: op((c, t) => { t.remove(); return null; }) },
    ]);
  },
  caretIn(el) {
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(true);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
    this.savedRange = r.cloneRange();
  },
  // 첫 줄 칸들의 현재 너비를 %로 고정 (table-layout: fixed).
  // reflow: 열을 넣거나 뺀 뒤 — 이미 고정된 표만 자연 너비로 다시 재서 고정
  freezeWidths(t, reflow) {
    const r0 = t.rows[0];
    if (!r0) return [];
    if (reflow && t.style.tableLayout !== 'fixed') return [];
    if (reflow) [...r0.cells].forEach(c => { c.style.width = ''; });
    t.style.tableLayout = '';
    const total = t.getBoundingClientRect().width || 1;
    const ws = [...r0.cells].map(c => c.getBoundingClientRect().width / total * 100);
    [...r0.cells].forEach((c, i) => { c.style.width = ws[i].toFixed(2) + '%'; });
    t.style.tableLayout = 'fixed';
    return ws;
  },
  nudgeCol(t, i, d) {
    const ws = this.freezeWidths(t), r0 = t.rows[0], j = i + 1 < ws.length ? i + 1 : i - 1;
    if (j < 0) return;
    const a = Math.max(4, Math.min(ws[i] + ws[j] - 4, ws[i] + d));
    ws[j] = ws[i] + ws[j] - a;
    ws[i] = a;
    r0.cells[i].style.width = ws[i].toFixed(2) + '%';
    r0.cells[j].style.width = ws[j].toFixed(2) + '%';
  },
  tableEdge(e) {
    const cell = e.target.closest && e.target.closest('td,th');
    if (!cell || !cell.closest('.editor .rich[contenteditable]')) return null;
    const r = cell.getBoundingClientRect(), E = 6;
    if (e.clientX > r.right - E && cell.nextElementSibling) return { kind: 'col', cell };
    if (e.clientX < r.left + E && cell.previousElementSibling) return { kind: 'col', cell: cell.previousElementSibling };
    if (e.clientY > r.bottom - E) return { kind: 'row', cell };
    return null;
  },
  startTableResize(e, hit) {
    e.preventDefault();
    e.stopPropagation();
    const t = hit.cell.closest('table'), rich = t.closest('.rich'), tr = hit.cell.parentElement;
    this.commit();
    const x0 = e.clientX, y0 = e.clientY, page = $('#page');
    let move;
    if (hit.kind === 'col') {
      const ws = this.freezeWidths(t), i = hit.cell.cellIndex, r0 = t.rows[0], total = t.getBoundingClientRect().width || 1;
      if (!r0.cells[i + 1]) return;
      const a0 = ws[i], b0 = ws[i + 1];
      move = ev => {
        const a = Math.max(4, Math.min(a0 + b0 - 4, a0 + (ev.clientX - x0) / total * 100));
        r0.cells[i].style.width = a.toFixed(2) + '%';
        r0.cells[i + 1].style.width = (a0 + b0 - a).toFixed(2) + '%';
      };
    } else {
      const h0 = tr.getBoundingClientRect().height;
      move = ev => { tr.style.height = Math.max(24, Math.round(h0 + ev.clientY - y0)) + 'px'; };
    }
    document.body.classList.add('tbl-resizing');
    const up = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
      document.body.classList.remove('tbl-resizing');
      page.style.cursor = '';
      this.syncRich(rich);
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  },

  toolsEl(b) {
    const T = (label, title, fn, on) => h('button', { class: 'tb' + (on ? ' on' : ''), title, onmousedown: e => e.preventDefault(), onclick: fn }, label);
    return h('div', { class: 'blk-tools' },
      h('button', { class: 'tb grip', title: '끌어서 블록 이동', onpointerdown: e => this.startDrag(e, b) }, '⠿ 이동'),
      T('+ 추가', '이 블록 위·아래에 새 블록 추가', e => popMenu(e.currentTarget, [
        { text: '아래에 추가' },
        { label: '텍스트 블록', fn: () => this.add('text', b.id) },
        { label: '이미지 블록', fn: () => this.add('image', b.id) },
        { label: '여백 블록', fn: () => this.add('space', b.id) },
        { text: '위에 추가' },
        { label: '텍스트 블록', fn: () => this.add('text', b.id, false, true) },
        { label: '이미지 블록', fn: () => this.add('image', b.id, false, true) },
        { label: '여백 블록', fn: () => this.add('space', b.id, false, true) }])),
      T('▲', '위로 이동', () => this.move(b, -1)),
      T('▼', '아래로 이동', () => this.move(b, 1)),
      T('복제', '블록 복제', () => this.duplicate(b)),
      T('접기', '공부 모드에서 접었다 펼 수 있는 블록으로 설정', () => this.mut(() => { b.fold = !b.fold; if (b.fold) b.collapsed = true; }), b.fold),
      T('페이지 나눔', 'PDF에서 이 블록부터 새 페이지', () => this.mut(() => { b.breakBefore = !b.breakBefore; }), b.breakBefore),
      b.type === 'space' ? T({ blank: '무지', lined: '줄', grid: '모눈', dot: '점' }[b.pattern || 'blank'], '여백 무늬 바꾸기', () => this.mut(() => {
        const ps = ['blank', 'lined', 'grid', 'dot'];
        b.pattern = ps[(ps.indexOf(b.pattern || 'blank') + 1) % ps.length];
      })) : null,
      T('삭제', '블록 삭제', () => this.remove(b)));
  },

  /* ---------- 블록 조작 ---------- */
  block(id) { return S.note && S.note.blocks.find(b => b.id === id); },
  setActive(id) {
    if (S.activeBlock === id) return;
    S.activeBlock = id;
    $$('#page .blk').forEach(el => el.classList.toggle('active', el.dataset.id === id));
  },
  mut(fn) { this.commit(); fn(); this.touch(); this.render(); this.commit(); },
  add(type, afterId, atEnd, before) {
    this.commit();
    const blocks = S.note.blocks, b = newBlock(type);
    const ref = atEnd ? null : (afterId || S.activeBlock);
    const i = ref ? blocks.findIndex(x => x.id === ref) : -1;
    blocks.splice(i < 0 ? blocks.length : i + (before ? 0 : 1), 0, b);
    S.activeBlock = b.id;
    this.touch();
    this.render();
    this.commit();
    const el = $(`.blk[data-id="${b.id}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      const r = $('.rich.ko', el);
      if (r && type === 'text') r.focus();
    }
    return b;
  },
  move(b, d) {
    const a = S.note.blocks, i = a.indexOf(b), j = i + d;
    if (j < 0 || j >= a.length) return;
    this.mut(() => { a.splice(i, 1); a.splice(j, 0, b); });
    const el = $(`.blk[data-id="${b.id}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  },
  // 손잡이를 끌어서 블록 순서 바꾸기 (마우스·터치·펜 공통)
  startDrag(e, b) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    this.setActive(b.id);
    const grip = e.currentTarget, page = $('#page'), sc = $('#scroller');
    const el = $(`.blk[data-id="${b.id}"]`, page), line = h('div', { class: 'drop-line' });
    let before = undefined, y = e.clientY, raf = 0, done = false;
    grip.setPointerCapture(e.pointerId);
    el.classList.add('dragging');
    document.body.classList.add('blk-dragging');
    const place = () => {
      const others = $$('.blk', page).filter(x => x !== el);
      const hit = others.find(x => { const r = x.getBoundingClientRect(); return y < r.top + r.height / 2; });
      before = hit ? hit.dataset.id : null;
      if (hit) { if (line.nextSibling !== hit) page.insertBefore(line, hit); }
      else page.insertBefore(line, $('.add-row', page));
    };
    const tick = () => {
      raf = 0;
      if (done) return;
      const r = sc.getBoundingClientRect(), edge = 70;
      const v = y < r.top + edge ? -(r.top + edge - y) : y > r.bottom - edge ? y - (r.bottom - edge) : 0;
      if (v) { sc.scrollTop += v * 0.25; place(); raf = requestAnimationFrame(tick); }
    };
    const move = ev => { y = ev.clientY; place(); if (!raf) raf = requestAnimationFrame(tick); };
    const end = ev => {
      done = true;
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', end);
      grip.removeEventListener('pointercancel', end);
      line.remove();
      el.classList.remove('dragging');
      document.body.classList.remove('blk-dragging');
      if (ev.type !== 'pointerup' || before === undefined) return;
      const a = S.note.blocks, from = a.indexOf(b), nextId = a[from + 1] ? a[from + 1].id : null;
      if (before === nextId) return;
      this.mut(() => {
        a.splice(from, 1);
        const to = before ? a.findIndex(x => x.id === before) : a.length;
        a.splice(to < 0 ? a.length : to, 0, b);
      });
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', end);
    grip.addEventListener('pointercancel', end);
  },
  duplicate(b) {
    const a = S.note.blocks, c = Object.assign(JSON.parse(JSON.stringify(b)), { id: uid() });
    this.mut(() => { a.splice(a.indexOf(b) + 1, 0, c); S.activeBlock = c.id; });
  },
  remove(b) {
    const a = S.note.blocks, i = a.indexOf(b);
    this.mut(() => { a.splice(i, 1); S.activeBlock = null; });
    const note = S.note;
    toast('블록 삭제됨', { label: '되돌리기', fn: () => { if (S.note !== note) return; this.mut(() => { a.splice(Math.min(i, a.length), 0, b); S.activeBlock = b.id; }); } });
  },

  /* ---------- 이미지 ---------- */
  async pickImage(b) {
    const [f] = await pickFile('image/*');
    if (f) { b.image = await Images.add(f); this.mut(() => { }); }
  },
  async insertImages(files, targetId) {
    let ref = targetId || S.activeBlock;
    for (const f of files) {
      const id = await Images.add(f);
      const t = this.block(ref);
      if (t && t.type === 'image' && !t.image) { t.image = id; continue; }
      const blocks = S.note.blocks, nb = newBlock('image', { image: id });
      const i = blocks.findIndex(x => x.id === ref);
      blocks.splice(i < 0 ? blocks.length : i + 1, 0, nb);
      ref = nb.id;
    }
    S.activeBlock = ref;
    this.touch();
    this.render();
  },
  onPaste(e) {
    if (S.mode !== 'edit' || !S.note || e.target.closest('.modal')) return;
    const cd = e.clipboardData;
    if (!cd) return;
    const files = [...cd.files].filter(f => f.type.startsWith('image/'));
    const rich = e.target.closest && e.target.closest('.rich[contenteditable]');
    if (files.length && !(rich && cd.getData('text/plain'))) {
      e.preventDefault();
      this.insertImages(files);
      return;
    }
    if (!rich) return;
    e.preventDefault();
    const html = cd.getData('text/html');
    if (html) document.execCommand('insertHTML', false, sanitize(html.replace(/<!--[\s\S]*?-->/g, '')));
    else document.execCommand('insertText', false, cd.getData('text/plain'));
    this.syncRich(rich);
  },

  /* ---------- 서식 ---------- */
  restoreSel() {
    const r = this.savedRange;
    if (!r || !document.contains(r.commonAncestorContainer)) return null;
    const n = r.commonAncestorContainer, rich = (n.nodeType === 1 ? n : n.parentElement).closest('.rich[contenteditable]');
    if (!rich) return null;
    if (document.activeElement !== rich) rich.focus({ preventScroll: true });
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
    return rich;
  },
  cmd(c, v, css = true) {
    const rich = this.restoreSel();
    if (!rich) { toast('먼저 블록 안의 글자를 선택하세요'); return null; }
    document.execCommand('styleWithCSS', false, css);
    document.execCommand(c, false, v);
    this.syncRich(rich);
    return rich;
  },
  hilite(color) {
    const rich = this.restoreSel();
    if (!rich) { toast('먼저 블록 안의 글자를 선택하세요'); return; }
    document.execCommand('styleWithCSS', false, true);
    if (!document.execCommand('hiliteColor', false, color)) document.execCommand('backColor', false, color);
    this.syncRich(rich);
  },
  fontSize(px) {
    const rich = this.cmd('fontSize', '7', false);
    if (!rich) return;
    const spans = $$('font[size="7"]', rich).map(f => {
      const s = h('span', { style: { fontSize: px + 'px' } });
      s.append(...f.childNodes);
      $$('[style]', s).forEach(c => { c.style.fontSize = ''; });
      f.replaceWith(s);
      return s;
    });
    if (spans.length) {
      const r = document.createRange();
      r.setStartBefore(spans[0]);
      r.setEndAfter(spans[spans.length - 1]);
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(r);
    }
    this.syncRich(rich);
  },
  heading(tag) {
    if (!this.restoreSel()) { toast('먼저 블록 안에 커서를 두세요'); return; }
    const cur = (document.queryCommandValue('formatBlock') || '').toLowerCase();
    this.cmd('formatBlock', cur === tag ? 'p' : tag);
  },
  clearFormat() {
    if (!this.cmd('removeFormat')) return;
    this.hilite('transparent');
  },

  toolbar() {
    const B = (label, title, fn, cls = '') => h('button', { class: 'tb ' + cls, title, onmousedown: e => e.preventDefault(), onclick: fn }, label);
    const sw = (colors, cur, pick, withNone) => h('div', { class: 'swatches' },
      colors.map(c => h('button', { class: 'swatch' + (c === cur ? ' on' : ''), style: { background: c }, onclick: () => { closePop(); pick(c); } })),
      withNone ? h('button', { class: 'swatch none', title: '없음', onclick: () => { closePop(); pick(null); } }) : null);
    const colorChip = h('span', { class: 'color-chip', style: { background: this.lastColor } });
    const hiChip = h('span', { class: 'color-chip', style: { background: this.lastHilite } });
    const undoB = B('↶', '되돌리기 (Ctrl/⌘+Z)', () => this.undo()), redoB = B('↷', '다시 실행 (Ctrl/⌘+Shift+Z)', () => this.redo());
    undoB.id = 'btn-undo';
    redoB.id = 'btn-redo';
    undoB.disabled = !this.hist.undo.length && this.snapSame();
    redoB.disabled = !this.hist.redo.length;
    return [
      undoB, redoB,
      h('span', { class: 'tb-sep' }),
      B(h('b', null, 'B'), '굵게', () => this.cmd('bold')),
      B(h('i', null, 'I'), '기울임', () => this.cmd('italic')),
      B(h('u', null, 'U'), '밑줄', () => this.cmd('underline')),
      B(h('s', null, 'S'), '취소선', () => this.cmd('strikeThrough')),
      h('span', { class: 'tb-sep' }),
      B('크기 ▾', '글씨 크기', e => popMenu(e.currentTarget, FONT_SIZES.map(px => ({ label: `${px}px` + (px === 15 ? ' (기본)' : ''), fn: () => this.fontSize(px) })))),
      B(h('span', { class: 'stack' }, '가', colorChip), '글자 색 (마지막 색 바로 적용)', () => this.cmd('foreColor', this.lastColor)),
      B('▾', '글자 색 고르기', e => popover(e.currentTarget, sw(TEXT_COLORS, this.lastColor, c => { this.lastColor = c; colorChip.style.background = c; this.cmd('foreColor', c); }))),
      B(h('span', { class: 'stack' }, '형광', hiChip), '형광펜 (마지막 색 바로 적용)', () => this.hilite(this.lastHilite)),
      B('▾', '형광펜 색 고르기', e => popover(e.currentTarget, sw(HILITES, this.lastHilite, c => {
        if (c) { this.lastHilite = c; hiChip.style.background = c; }
        this.hilite(c || 'transparent');
      }, true))),
      B('서식 지움', '선택한 글자의 서식 지우기', () => this.clearFormat()),
      h('span', { class: 'tb-sep' }),
      B('제목', '큰 제목 (h2)', () => this.heading('h2')),
      B('소제목', '소제목 (h3)', () => this.heading('h3')),
      B('• 목록', '글머리 목록', () => this.cmd('insertUnorderedList')),
      B('1. 목록', '번호 목록', () => this.cmd('insertOrderedList')),
      B('⇤', '내어쓰기 (Shift+Tab)', () => this.cmd('outdent')),
      B('⇥', '들여쓰기 (Tab)', () => this.cmd('indent')),
      B('표 ▾', '표 넣기 · 표 안에 커서가 있으면 행·열 추가/삭제, 크기 조절', e => this.tableMenu(e.currentTarget)),
      h('span', { class: 'tb-sep' }),
      B('+ 텍스트', '선택한 블록 아래에 텍스트 블록 추가', () => this.add('text'), 'outlined'),
      B('+ 이미지', '선택한 블록 아래에 이미지 블록 추가', () => this.add('image'), 'outlined'),
      B('+ 여백', '선택한 블록 아래에 필기 여백 추가', () => this.add('space'), 'outlined'),
      B('+ 목차', '제목·소제목을 모은 자동 목차를 맨 앞에 넣기', () => this.insertToc(), 'outlined'),
      h('span', { class: 'tb-sep' }),
      B('영어 칸', '영어 원문 칸 보이기/숨기기', () => { S.showEn = !S.showEn; savePrefs(); App.renderToolbar(); this.render(); }, 'outlined' + (S.showEn ? ' on' : '')),
      B('보기 서식 ▾', '영어 글자 서식 (색·크기·기울임·굵게)', e => viewMenu(e.currentTarget, false)),
      h('span', { class: 'tb-space' }),
      h('span', { id: 'save-status' }, '자동 저장 켜짐'),
      B('불러오기 ▾', '', e => popMenu(e.currentTarget, [
        { label: 'AI 정리 불러오기 (HTML)', fn: openImportAI },
        { label: 'AI 프롬프트 복사', fn: openPromptModal },
        { label: '프로젝트 파일 열기 (.snote.json)', fn: importProjectFile }]), 'outlined'),
      B('내보내기 ▾', '', e => popMenu(e.currentTarget, [
        { label: 'PDF로 내보내기', fn: openPdfDialog },
        { label: '프로젝트 파일로 저장 (이어서 편집용)', fn: () => exportProject(S.note) }]), 'outlined'),
    ];
  },
};
