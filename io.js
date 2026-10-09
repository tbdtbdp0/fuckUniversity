'use strict';

/* =========================================================
   AI 프롬프트 · HTML 불러오기 · 프로젝트 파일 · 백업 · PDF
   ========================================================= */

function buildPrompt(course, chapter) {
  return `너는 대학 수업 자료를 시험 공부용 노트로 정리하는 조교다.
내가 첨부한 수업 자료(PDF·슬라이드·텍스트)를 아래 [정리 규정]과 [출력 형식]을 반드시 지켜서 HTML 파일 하나로 정리해줘.

수업명: ${course || '(자료에서 파악해서 기재)'}
챕터: ${chapter || '(자료에서 파악해서 기재)'}

[정리 규정]
1. 문장 단순화: 단어로 끝나는 단답형·음슴체 사용. 문장 구조를 단순하게 해서 바로 이해되게.
2. 핵심 키워드·주요 내용은 한국어와 영어 동시 기재. 예: 삼투(osmosis)
3. 이 노트만 보고도 시험 공부가 가능해야 함. 수업 자료의 내용을 빠뜨리지 말 것.
4. 수업 자료의 내용을 임의로 변형·추가·삭제하지 말 것. 자료에 없는 내용 지어내지 말 것.
5. 도표·그래프·그림 등 figure도 이론의 예시·근거 자료로서 포함. figure가 무엇을 보여주는지 해석을 반드시 작성.
   figure 사진 자체는 내가 나중에 직접 삽입하므로, 아래 형식의 figure 블록으로 자리만 만들고 해석을 적을 것.
6. 줄바꿈 원칙:
   - 화살표(→)로 이어지는 흐름은 각 단계를 <br>로 줄바꿈해서 한눈에 들어오게 표기. 단, 흐름 전체가 한 줄에 들어올 만큼 짧으면 줄바꿈 없이 유지.
   - 한 bullet 안에 문장이 여러 개이고 자동 줄바꿈이 생길 만큼 길면, 두 번째 문장부터는 <br>로 다음 줄에 배치.
   - 목표: 내용이 화면 폭 때문에 어중간하게 잘려 흐름이 끊기지 않게 하는 것.

[출력 형식] — 내가 쓰는 노트 사이트가 이 형식을 그대로 읽어들이므로 정확히 지킬 것.
- 완전한 HTML 문서 하나를 코드 블록 하나로 출력. 설명 문장은 코드 블록 밖에 쓰지 말 것.
- <style>, <script>, class, 외부 리소스, <img> 사용 금지. 꾸미기는 사이트가 알아서 함.
- 전체를 <article data-studynote="1" data-course="수업명" data-chapter="챕터 제목"> 으로 감쌀 것.
- 그 안에 <section data-block="..."> 블록을 순서대로 나열. 블록 종류는 3가지:

  (1) 텍스트 블록: <section data-block="text">
      - 소주제 하나 = 블록 하나. (소제목 <h3> + 그 아래 <ul> 목록 정도의 크기)
      - 큰 단원 제목은 <h2>만 들어 있는 별도의 텍스트 블록으로.
      - 안에 <div data-lang="ko">정리한 한국어 노트</div> 와 <div data-lang="en">대응하는 영어 원문</div> 을 둘 다 넣을 것.
      - en에는 번역이 아니라 수업 자료의 영어 원문 표현을 넣을 것. (자료가 한국어뿐이면 en은 생략)
      - 매우 중요: ko와 en은 줄(<h2>,<h3>,<h4>,<p>,<li>,<td>) 개수·순서·중첩 구조가 1:1로 똑같아야 함. 사이트가 같은 순번의 줄끼리 짝지어 보여줌.
        한 줄 안에서의 줄바꿈은 새 태그가 아니라 <br>로 할 것.
      - 예시, 부가 설명, 덜 중요한 자료, 또는 가려놓고 암기할 내용은 data-fold="접었을 때 보일 제목" 속성을 붙일 것.
        예: <section data-block="text" data-fold="예시: 적혈구 실험">

  (2) figure 블록: <section data-block="figure" data-caption="Figure 3.2 (슬라이드 14) 삼투압 그래프">
      - data-caption에는 내가 어떤 그림을 넣어야 하는지 찾을 수 있게 그림 번호·슬라이드 번호·간단한 이름을 적을 것.
      - 안에는 텍스트 블록과 똑같이 <div data-lang="ko">해석</div> <div data-lang="en">원문 캡션·설명</div>.

  (3) 여백 블록: <section data-block="space" data-height="120"></section>
      - 직접 풀어봐야 하는 문제·계산 뒤 등 필기 공간이 필요한 곳에만 사용. (없어도 됨)

- 사용할 수 있는 태그: h2 h3 h4 p ul ol li br b i u mark sub sup code table thead tbody tr th td blockquote
- 핵심 키워드는 <b>, 시험에 나올 만한 가장 중요한 부분은 <mark>로 표시.
- 수식은 일반 텍스트와 <sub> <sup>로 표기.

[형식 예시]
<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><title>챕터 제목</title></head>
<body>
<article data-studynote="1" data-course="세포생물학" data-chapter="Ch.3 막 수송">
  <section data-block="text">
    <div data-lang="ko"><h2>1. 수동 수송(Passive transport)</h2></div>
    <div data-lang="en"><h2>1. Passive transport</h2></div>
  </section>
  <section data-block="text">
    <div data-lang="ko">
      <h3>삼투(Osmosis)</h3>
      <ul>
        <li><b>삼투(osmosis)</b>: 선택적 투과막을 통한 물의 확산</li>
        <li>물 이동 방향: <mark>저장액(hypotonic) → 고장액(hypertonic)</mark></li>
      </ul>
    </div>
    <div data-lang="en">
      <h3>Osmosis</h3>
      <ul>
        <li>Osmosis is the diffusion of water across a selectively permeable membrane.</li>
        <li>Water moves from a hypotonic solution to a hypertonic solution.</li>
      </ul>
    </div>
  </section>
  <section data-block="figure" data-caption="Figure 3.4 (슬라이드 12) 용액 농도에 따른 적혈구 변화">
    <div data-lang="ko"><ul><li>고장액: 물 유출 → 세포 수축(crenation)</li><li>저장액: 물 유입 → 용혈(lysis)</li></ul></div>
    <div data-lang="en"><ul><li>Hypertonic: water leaves the cell, which shrivels (crenation).</li><li>Hypotonic: water enters the cell, which bursts (lysis).</li></ul></div>
  </section>
  <section data-block="text" data-fold="예시: 식물 세포">
    <div data-lang="ko"><ul><li>저장액에서 팽압(turgor pressure) 발생 → 정상 상태</li></ul></div>
    <div data-lang="en"><ul><li>In a hypotonic solution turgor pressure builds up, which is the normal state.</li></ul></div>
  </section>
</article>
</body></html>

분량이 길어서 한 번에 다 못 쓰면, 임의로 요약하지 말고 "1/3" 처럼 여러 번에 나눠서 출력해줘. 나눈 각 조각도 위 형식을 지킨 완전한 HTML 문서여야 함.`;
}

/* ---------- AI HTML → 블록 ---------- */
function newBlock(type, extra) {
  const b = { id: uid(), type, ko: '', en: '' };
  if (type === 'image') Object.assign(b, { image: null, width: 80, align: 'center', figLabel: '' });
  if (type === 'space') Object.assign(b, { height: 140, pattern: 'blank' });
  return Object.assign(b, extra);
}

function parseAIHtml(text) {
  text = (text || '').trim().replace(/^```[a-zA-Z]*\s*\n/, '').replace(/\n```\s*$/, '');
  const doc = new DOMParser().parseFromString(text, 'text/html');
  const art = doc.querySelector('[data-studynote]') || doc.body;
  const out = { course: (art.dataset.course || '').trim(), title: (art.dataset.chapter || doc.title || '').trim(), blocks: [], structured: false };
  const langHtml = (sec, lang) => {
    const els = [...sec.children].filter(c => c.dataset.lang === lang);
    return sanitize(els.map(e => e.innerHTML).join(''));
  };
  const secs = [...art.querySelectorAll('[data-block]')];
  if (secs.length) {
    out.structured = true;
    for (const s of secs) {
      const kind = s.dataset.block;
      if (kind === 'space') { out.blocks.push(newBlock('space', { height: Math.max(40, parseInt(s.dataset.height) || 140) })); continue; }
      if (kind === 'toc') { out.blocks.push(newBlock('toc')); continue; }
      const hasLang = [...s.children].some(c => c.dataset.lang);
      const b = newBlock(kind === 'figure' || kind === 'image' ? 'image' : 'text', {
        ko: hasLang ? langHtml(s, 'ko') : sanitize(s.innerHTML),
        en: hasLang ? langHtml(s, 'en') : '',
      });
      if (b.type === 'image') b.figLabel = s.dataset.caption || '';
      if (s.hasAttribute('data-fold')) { b.fold = true; b.foldLabel = s.dataset.fold || ''; b.collapsed = true; }
      out.blocks.push(b);
    }
  } else {
    // 형식을 안 지킨 일반 HTML: 제목(h1~h3)마다 블록을 끊어서 한국어 칸에 넣음
    const body = doc.createElement('div');
    body.innerHTML = sanitize(doc.body.innerHTML);
    let cur = [];
    const flush = () => { const html = cur.join('').trim(); if (htmlText(html)) out.blocks.push(newBlock('text', { ko: html })); cur = []; };
    for (const n of [...body.childNodes]) {
      if (n.nodeType === 1 && /^H[1-3]$/.test(n.tagName)) flush();
      cur.push(n.nodeType === 1 ? n.outerHTML : (n.textContent.trim() ? `<p>${n.textContent}</p>` : ''));
    }
    flush();
  }
  return out;
}

/* ---------- AI 프롬프트 프리셋 ----------
   [기본]은 고정. 직접 만든 프리셋은 localStorage(sn-prompts)에 저장하고 전체 백업에도 포함.
   프롬프트 안의 {{수업명}}, {{챕터}}는 복사할 때 입력 칸 값으로 바뀜. */
const PROMPT_FALLBACK = '(자료에서 파악해서 기재)';
const DEFAULT_PROMPT_ID = 'default';
const Prompts = {
  list() {
    try {
      const v = JSON.parse(localStorage.getItem('sn-prompts') || '[]');
      return Array.isArray(v) ? v.filter(p => p && p.id && typeof p.text === 'string') : [];
    } catch (e) { return []; }
  },
  save(list) {
    try { localStorage.setItem('sn-prompts', JSON.stringify(list)); return true; } catch (e) { toast('프리셋 저장 실패 (저장 공간 부족?)'); return false; }
  },
  // 수업별로 마지막에 쓴 프리셋 기억
  lastFor(courseId) {
    try { return JSON.parse(localStorage.getItem('sn-prompt-last') || '{}')[courseId || ''] || DEFAULT_PROMPT_ID; } catch (e) { return DEFAULT_PROMPT_ID; }
  },
  setLast(courseId, id) {
    try {
      const m = JSON.parse(localStorage.getItem('sn-prompt-last') || '{}');
      m[courseId || ''] = id;
      localStorage.setItem('sn-prompt-last', JSON.stringify(m));
    } catch (e) { /* ignore */ }
  },
  // 백업에서 불러오기: 같은 id는 덮어쓰고 없는 건 추가
  merge(incoming) {
    if (!Array.isArray(incoming) || !incoming.length) return;
    const list = this.list();
    for (const p of incoming) {
      if (!p || !p.id || typeof p.text !== 'string') continue;
      const i = list.findIndex(x => x.id === p.id);
      if (i >= 0) list[i] = p; else list.push(p);
    }
    this.save(list);
  },
};
const defaultPromptTemplate = () => buildPrompt('{{수업명}}', '{{챕터}}');
const fillPrompt = (tpl, course, chapter) => tpl.split('{{수업명}}').join(course || PROMPT_FALLBACK).split('{{챕터}}').join(chapter || PROMPT_FALLBACK);

function openPromptModal() {
  const c = S.courses.find(x => x.id === S.courseId);
  const courseId = c ? c.id : '';
  const course = h('input', { type: 'text', value: c ? c.name : '', placeholder: '비워두면 AI가 자료에서 파악' });
  const chap = h('input', { type: 'text', value: '', placeholder: '예: Ch.3 Membrane transport' });
  const ta = h('textarea', { style: { minHeight: '260px' } });
  const tabs = h('div', { class: 'preset-tabs' });
  const tools = h('div', { class: 'preset-tools' });
  const hint = h('div', { class: 'hint' });
  let list = Prompts.list();
  let curId = list.some(p => p.id === Prompts.lastFor(courseId)) ? Prompts.lastFor(courseId) : DEFAULT_PROMPT_ID;
  let saveTimer;
  const cur = () => list.find(p => p.id === curId);
  const tplOf = id => id === DEFAULT_PROMPT_ID ? defaultPromptTemplate() : (list.find(p => p.id === id) || {}).text || '';
  const flushSave = () => { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; Prompts.save(list); } };

  const select = id => {
    flushSave();
    curId = id;
    Prompts.setLast(courseId, id);
    render();
  };
  const addPreset = async () => {
    flushSave();
    const name = await askText('새 프리셋', '', '프리셋 이름 (예: 세포생물학용)');
    if (!name) return;
    const p = { id: uid(), name, text: tplOf(curId), updatedAt: Date.now() };
    list.push(p);
    if (!Prompts.save(list)) { list.pop(); return; }
    toast(`"${name}" 프리셋 만듦 — 지금 보던 프롬프트를 복사해 둠. 아래에서 바로 수정하세요.`);
    select(p.id);
  };
  const renamePreset = async () => {
    const p = cur();
    const name = await askText('프리셋 이름 변경', p.name);
    if (!name) return;
    p.name = name;
    Prompts.save(list);
    render();
  };
  const deletePreset = async () => {
    const p = cur();
    if (!await askConfirm('프리셋 삭제', `"${p.name}" 프리셋을 삭제함. 되돌릴 수 없음.`, '삭제', true)) return;
    list = list.filter(x => x !== p);
    Prompts.save(list);
    select(DEFAULT_PROMPT_ID);
  };
  const resetPreset = async () => {
    const p = cur();
    if (!await askConfirm('기본 내용으로 되돌리기', `"${p.name}" 프리셋 내용을 [기본] 프롬프트로 바꿈.`, '되돌리기')) return;
    p.text = defaultPromptTemplate();
    p.updatedAt = Date.now();
    Prompts.save(list);
    render();
  };

  function render() {
    const p = cur(), isDef = !p;
    tabs.innerHTML = '';
    tabs.append(
      h('button', { class: 'preset-tab' + (isDef ? ' on' : ''), onclick: () => select(DEFAULT_PROMPT_ID) }, '기본'),
      ...list.map(x => h('button', { class: 'preset-tab' + (x.id === curId ? ' on' : ''), onclick: () => select(x.id) }, x.name)),
      h('button', { class: 'preset-tab add', title: '지금 보는 프롬프트를 복사해서 새 프리셋 만들기', onclick: addPreset }, '+ 프리셋'));
    tools.innerHTML = '';
    if (!isDef) tools.append(
      h('button', { class: 'btn ghost', onclick: renamePreset }, '이름 변경'),
      h('button', { class: 'btn ghost', onclick: resetPreset }, '기본으로 되돌리기'),
      h('button', { class: 'btn ghost danger', onclick: deletePreset }, '삭제'));
    ta.value = tplOf(curId);
    ta.readOnly = isDef;
    hint.textContent = isDef
      ? '[기본] 프롬프트는 수정할 수 없음. "+ 프리셋"을 누르면 이 내용을 복사한 프리셋이 생기고, 거기서 자유롭게 고칠 수 있음.'
      : '수정하면 자동 저장됨. {{수업명}}, {{챕터}}는 복사할 때 위 칸에 적은 값으로 바뀜 (비어 있으면 "자료에서 파악").';
  }
  ta.oninput = () => {
    const p = cur();
    if (!p) return;
    p.text = ta.value;
    p.updatedAt = Date.now();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveTimer = null; Prompts.save(list); }, 400);
  };
  render();

  const m = openModal({
    title: 'AI 정리 프롬프트', wide: true,
    body: h('div', null,
      h('ol', { class: 'steps' },
        h('li', null, '아래 프롬프트를 복사'),
        h('li', null, 'AI(Claude, ChatGPT 등)에 수업 자료 파일을 첨부하고 프롬프트 붙여넣기'),
        h('li', null, 'AI가 준 HTML을 파일로 저장하거나 코드를 복사'),
        h('li', null, '편집 모드 → "AI 정리 불러오기"에 넣기')),
      h('div', { class: 'row' },
        h('label', { class: 'field' }, h('span', null, '수업명 (선택)'), course),
        h('label', { class: 'field' }, h('span', null, '챕터 (선택)'), chap)),
      h('div', { class: 'field' }, h('span', null, '프리셋'), tabs, tools),
      h('label', { class: 'field' }, h('span', null, '프롬프트'), ta), hint),
    actions: [
      { label: '닫기', onclick: close => { flushSave(); close(); } },
      { label: '프롬프트 복사', kind: 'primary', onclick: async () => {
        flushSave();
        const text = fillPrompt(tplOf(curId), course.value.trim(), chap.value.trim());
        toast(await copyText(text) ? `프롬프트 복사됨 (${cur() ? cur().name : '기본'})` : '복사 실패 — 직접 선택해서 복사하세요');
      } }],
  });
  // ✕ 버튼이나 바깥 경로로 닫혀도 입력 중이던 내용이 남도록
  m.box.querySelector('.modal-head .icon-btn').addEventListener('click', flushSave);
}

function openImportAI() {
  const cur = S.courses.find(x => x.id === S.courseId);
  const course = h('input', { type: 'text', value: cur ? cur.name : '', placeholder: '수업명', list: 'course-list' });
  const dl = h('datalist', { id: 'course-list' }, S.courses.map(c => h('option', { value: c.name })));
  const title = h('input', { type: 'text', placeholder: '챕터 제목' });
  const ta = h('textarea', { placeholder: 'AI가 준 HTML 코드를 여기에 붙여넣기 (또는 위 버튼으로 .html 파일 선택)' });
  const info = h('div', { class: 'hint' }, '');
  const append = h('input', { type: 'checkbox' });
  let parsed = null, timer;
  const reparse = () => {
    parsed = ta.value.trim() ? parseAIHtml(ta.value) : null;
    if (!parsed) { info.textContent = ''; info.className = 'hint'; return; }
    if (parsed.course && !course.value) course.value = parsed.course;
    if (parsed.title && !title.value) title.value = parsed.title;
    const n = t => parsed.blocks.filter(b => b.type === t).length;
    info.className = 'hint ' + (parsed.blocks.length ? (parsed.structured ? 'ok' : '') : 'bad');
    info.textContent = !parsed.blocks.length ? '읽을 수 있는 내용이 없음'
      : `블록 ${parsed.blocks.length}개 인식 (텍스트 ${n('text')} · figure ${n('image')} · 여백 ${n('space')})`
      + (parsed.structured ? '' : ' — 사이트 형식이 아니라서 제목 기준으로 나눔. 영어 칸은 비어 있음.');
  };
  ta.oninput = () => { clearTimeout(timer); timer = setTimeout(reparse, 250); };
  const m = openModal({
    title: 'AI 정리 불러오기', wide: true,
    body: h('div', null, dl,
      h('div', { class: 'row', style: { alignItems: 'center' } },
        h('button', { class: 'btn', onclick: openPromptModal }, '① AI 프롬프트 복사하기'),
        h('button', { class: 'btn', onclick: async () => {
          const [f] = await pickFile('.html,.htm,.txt,text/html');
          if (!f) return;
          ta.value = await f.text();
          if (!title.value && !/data-chapter/.test(ta.value)) title.value = f.name.replace(/\.[^.]+$/, '');
          reparse();
        } }, '② .html 파일 선택')),
      h('label', { class: 'field' }, h('span', null, 'HTML 코드'), ta), info,
      h('div', { class: 'row' },
        h('label', { class: 'field' }, h('span', null, '수업'), course),
        h('label', { class: 'field' }, h('span', null, '챕터 제목'), title)),
      S.note ? h('label', { class: 'check' }, append, `새 노트 대신, 지금 열린 노트("${S.note.title}") 끝에 이어붙이기`) : null),
    actions: [
      { label: '취소', onclick: close => close() },
      { label: '불러오기', kind: 'primary', onclick: async () => {
        reparse();
        if (!parsed || !parsed.blocks.length) { toast('불러올 내용이 없음'); return; }
        if (append.checked && S.note) {
          S.note.blocks.push(...parsed.blocks);
          Editor.touch();
          m.close();
          App.setMode('edit');
          toast(`블록 ${parsed.blocks.length}개 이어붙임`);
          return;
        }
        const c = await App.ensureCourse(course.value.trim() || '미분류');
        const note = await App.createNote(c.id, title.value.trim() || '제목 없음', parsed.blocks);
        m.close();
        S.mode = 'edit';
        App.go('n', note.id);
      } }],
  });
}

/* ---------- 프로젝트 파일 (.snote.json) ---------- */
async function collectImages(notes) {
  const images = {};
  for (const n of notes) for (const b of n.blocks) {
    if (!b.image || images[b.image]) continue;
    const rec = await DB.get('images', b.image);
    if (rec) images[b.image] = await blobToDataURL(rec.blob);
  }
  return images;
}

async function exportProject(note) {
  await Editor.flush();
  const c = S.courses.find(x => x.id === note.courseId);
  const data = { app: 'studynote', version: 1, kind: 'note', course: c ? { name: c.name, color: c.color } : null, note, images: await collectImages([note]) };
  download(new Blob([JSON.stringify(data)], { type: 'application/json' }), `${safeName(c ? c.name + ' - ' : '')}${safeName(note.title)}.snote.json`);
  toast('프로젝트 파일 저장됨 — 이 파일을 다시 열면 이어서 편집 가능');
}

async function exportCourse(c) {
  await Editor.flush();
  const notes = App.notesOf(c.id);
  const data = { app: 'studynote', version: 1, kind: 'course', course: { name: c.name, color: c.color, coverImg: c.coverImg }, notes, images: await collectImages(notes) };
  download(new Blob([JSON.stringify(data)], { type: 'application/json' }), `${safeName(c.name)}.snote.json`);
  toast(`"${c.name}" 수업 파일 저장됨 (노트 ${notes.length}개)`);
}

async function exportBackup() {
  await Editor.flush();
  const data = { app: 'studynote', version: 1, kind: 'library', courses: S.courses, notes: S.notes, prompts: Prompts.list(), buddy: await Buddy.exportData(), settings: exportSettings(), calendar: Cal.exportData(), images: await collectImages(S.notes) };
  download(new Blob([JSON.stringify(data)], { type: 'application/json' }), `슝터디-백업-${fmtDate(Date.now()).replace(/\./g, '')}.snote.json`);
}

// 파일 하나를 { kind, items:[{note, course}] } 형태로 통일 (note / course / library)
function readSnote(data, fileName) {
  if (!data || data.app !== 'studynote') return null;
  const cinfo = c => c ? { name: c.name, color: c.color, coverImg: c.coverImg } : null;
  let items = [];
  if (data.kind === 'library') items = (data.notes || []).map(n => ({ note: n, course: cinfo((data.courses || []).find(c => c.id === n.courseId)) }));
  else if (data.kind === 'course') items = (data.notes || []).map(n => ({ note: n, course: cinfo(data.course) }));
  else if (data.note) items = [{ note: data.note, course: cinfo(data.course) }];
  items = items.filter(x => x.note && Array.isArray(x.note.blocks));
  items.forEach(x => { if (!x.note.id) x.note.id = uid(); });
  // 백업 파일의 수업 순서 → 수업 안의 노트 순서대로
  const corder = new Map((data.courses || []).map(c => [c.name, c.order || 0]));
  const ck = x => x.course ? corder.get(x.course.name) || 0 : 0;
  items.sort((x, y) => ck(x) - ck(y) || (x.note.order || 0) - (y.note.order || 0));
  return { fileName, kind: data.kind === 'library' || data.kind === 'course' ? data.kind : 'note', data, items };
}

async function importProjectFile() {
  const files = await pickFile('.json,application/json', true);
  if (!files.length) return;
  const packs = [], bad = [];
  for (const f of files) {
    let pack = null;
    try { pack = readSnote(JSON.parse(await f.text()), f.name); } catch (e) { /* 아래에서 처리 */ }
    if (pack) packs.push(pack); else bad.push(f.name);
  }
  if (bad.length) toast(`슝터디 백업·수업·노트 파일이 아니라서 건너뜀: ${bad.join(', ')}`);
  if (!packs.length) return;
  await Editor.flush();
  openImportDialog(packs);
}

// 합치기: 같은 노트는 파일 내용으로 덮어쓰고, 없는 건 추가. 나머지는 그대로.
// 교체: 파일 단위로 바꿔치기 — 노트 파일은 그 노트, 수업 파일은 그 수업의 노트 전체,
//       전체 백업 파일은 지금 있는 모든 수업·노트를 지우고 파일 내용으로 바꿈.
function importPlan(packs, mode) {
  const del = new Set();
  if (mode === 'replace') {
    const wipeAll = packs.some(p => p.kind === 'library');
    const courseNames = new Set(packs.filter(p => p.kind === 'course').flatMap(p => p.items.map(x => x.course && x.course.name)));
    const noteIds = new Set(packs.filter(p => p.kind === 'note').map(p => p.items[0] && p.items[0].note.id));
    for (const n of S.notes) {
      const c = S.courses.find(x => x.id === n.courseId);
      if (wipeAll || (c && courseNames.has(c.name)) || noteIds.has(n.id)) del.add(n);
    }
  }
  const seen = new Set();
  let add = 0, over = 0;
  for (const p of packs) for (const { note } of p.items) {
    if (seen.has(note.id)) continue;
    seen.add(note.id);
    if (S.notes.some(n => n.id === note.id && !del.has(n))) over++; else add++;
  }
  // 교체로 지웠다가 같은 id로 다시 들어오는 노트는 "교체"로 셈
  const back = [...del].filter(n => seen.has(n.id)).length;
  return { del, add: add - back, over: over + back, removed: del.size - back, wipeAll: mode === 'replace' && packs.some(p => p.kind === 'library') };
}

function openImportDialog(packs) {
  const kindLabel = { note: '노트', course: '수업', library: '전체 백업' };
  const describe = p => {
    const courses = [...new Set(p.items.map(x => x.course ? x.course.name : '미분류'))];
    if (p.kind === 'note') return `노트 "${p.items[0] ? p.items[0].note.title : '?'}" (수업: ${courses[0] || '미분류'})`;
    if (p.kind === 'course') return `수업 "${courses[0] || '미분류'}" — 노트 ${p.items.length}개`;
    return `수업 ${courses.length}개 · 노트 ${p.items.length}개`;
  };
  const radio = (value, title, desc, checked) => h('label', { class: 'mode-opt' },
    h('input', { type: 'radio', name: 'import-mode', value, checked }),
    h('span', null, h('b', null, title), h('span', { class: 'hint' }, desc)));
  const modes = h('div', { class: 'mode-opts' },
    radio('merge', '합치기 (덮어쓰기)', '같은 노트는 파일 내용으로 덮어쓰고, 없는 노트는 추가. 파일에 없는 기존 노트는 그대로 둠.', true),
    radio('replace', '교체', '노트 파일 → 그 노트, 수업 파일 → 그 수업 전체, 전체 백업 → 지금 있는 모든 수업·노트를 지우고 파일 내용으로 바꿈.', false));
  const summary = h('div', { class: 'hint' });
  const mode = () => modes.querySelector('input:checked').value;
  const okBtn = () => m.box.querySelector('.modal-foot .btn.primary');
  const upd = () => {
    const pl = importPlan(packs, mode());
    summary.className = 'hint' + (pl.removed ? ' bad' : ' ok');
    summary.textContent = `새로 추가 ${pl.add}개 · 덮어쓰기/교체 ${pl.over}개` + (pl.removed ? ` · 삭제 ${pl.removed}개 (파일에 없는 기존 노트)` : '')
      + (pl.wipeAll ? ' — 전체 백업 교체라서 지금 있는 수업도 모두 정리됨' : '');
    if (okBtn()) {
      okBtn().textContent = mode() === 'replace' ? '교체하기' : '합치기';
      okBtn().classList.toggle('danger-bg', !!pl.removed);
    }
  };
  modes.addEventListener('change', upd);
  const m = openModal({
    title: `파일 불러오기 (${packs.length}개)`, wide: true,
    body: h('div', null,
      h('ul', { class: 'import-files' }, packs.map(p => h('li', null,
        h('span', { class: 'tag' }, kindLabel[p.kind]), h('span', { class: 'nm' }, p.fileName), h('span', { class: 'hint' }, describe(p))))),
      h('div', { class: 'field' }, h('span', null, '불러오는 방식'), modes),
      summary),
    actions: [
      { label: '취소', onclick: close => close() },
      { label: '합치기', kind: 'primary', onclick: async close => {
        const md = mode(), pl = importPlan(packs, md);
        if (pl.removed && !await askConfirm('교체 확인', `파일에 없는 기존 노트 ${pl.removed}개가 삭제됨. 되돌릴 수 없음.`, '교체', true)) return;
        close();
        await applyImport(packs, pl);
      } }],
  });
  upd();
}

async function applyImport(packs, plan) {
  for (const p of packs) for (const [id, url] of Object.entries(p.data.images || {})) await Images.add(dataURLToBlob(url), id);
  for (const p of packs) Prompts.merge(p.data.prompts);
  for (const p of packs) if (p.data.buddy) await Buddy.importData(p.data.buddy);
  for (const p of packs) { if (p.data.settings) importSettings(p.data.settings); if (p.data.calendar) Cal.importData(p.data.calendar); }
  for (const n of plan.del) await DB.del('notes', n.id);
  S.notes = S.notes.filter(n => !plan.del.has(n));
  if (plan.wipeAll) {
    for (const c of S.courses) await DB.del('courses', c.id);
    S.courses = [];
  }
  const done = new Map();
  for (const p of packs) for (const { note, course } of p.items) {
    const c = await App.ensureCourse(course ? course.name : '미분류', course && course.color);
    if (course && course.coverImg && !c.coverImg) { c.coverImg = course.coverImg; await DB.put('courses', c); }
    const exist = S.notes.find(n => n.id === note.id);
    if (exist) {
      const order = exist.courseId === c.id ? exist.order : App.notesOf(c.id).length;
      Object.assign(exist, note, { courseId: c.id, order });
      await DB.put('notes', exist);
      done.set(exist.id, exist);
    } else {
      note.courseId = c.id;
      note.order = App.notesOf(c.id).length;
      S.notes.push(note);
      await DB.put('notes', note);
      done.set(note.id, note);
    }
  }
  if (plan.del.size) Images.gc(S.notes).catch(() => { });
  const list = [...done.values()];
  toast(`노트 ${list.length}개 불러옴` + (plan.removed ? ` · ${plan.removed}개 삭제` : ''));
  const courseIds = new Set(list.map(n => n.courseId));
  if (list.length === 1) { S.mode = 'edit'; App.go('n', list[0].id); }
  else if (courseIds.size === 1) App.go('c', [...courseIds][0]);
  else App.go();
}

/* ---------- PDF (브라우저 인쇄) ---------- */
const PAPER = {
  A4: [210, 297, 'A4 (210×297mm)'],
  B5: [176, 250, 'B5 (176×250mm)'],
  Letter: [216, 279, 'Letter'],
  iPad: [210, 280, '태블릿 3:4'],
  wide: [167, 297, '9:16 세로 / 16:9 가로'],
  custom: [210, 297, '직접 입력'],
};
function pageDefaults(note) {
  return Object.assign({ size: 'A4', orient: 'portrait', margin: 15, cw: 210, ch: 297, avoid: true, lang: 'ko', expand: true, fontPt: 11 }, note.page);
}

function openPdfDialog() {
  const note = S.note, p = pageDefaults(note);
  const sel = (opts, val) => h('select', null, opts.map(([v, t]) => h('option', { value: v, selected: v === String(val) }, t)));
  const size = sel(Object.entries(PAPER).map(([k, v]) => [k, v[2]]), p.size);
  const orient = sel([['portrait', '세로'], ['landscape', '가로']], p.orient);
  const cw = h('input', { type: 'number', value: p.cw, min: 50 }), ch = h('input', { type: 'number', value: p.ch, min: 50 });
  const custom = h('div', { class: 'row' }, h('label', { class: 'field' }, h('span', null, '너비 (mm)'), cw), h('label', { class: 'field' }, h('span', null, '높이 (mm)'), ch));
  const margin = h('input', { type: 'number', value: p.margin, min: 0, max: 50 });
  const fontPt = h('input', { type: 'number', value: p.fontPt, min: 7, max: 20, step: 0.5 });
  const lang = sel([['ko', '한국어만'], ['both', '한국어 + 영어 (줄마다 아래에)'], ['split', '좌우 분할 (한국어 | 영어)'], ['en', '영어만']], p.lang);
  const expand = h('input', { type: 'checkbox', checked: p.expand });
  const avoid = h('input', { type: 'checkbox', checked: p.avoid });
  const showCustom = () => { custom.style.display = size.value === 'custom' ? '' : 'none'; };
  size.onchange = showCustom;
  showCustom();
  const nBreaks = note.blocks.filter(b => b.breakBefore).length;
  const read = () => ({ size: size.value, orient: orient.value, cw: +cw.value || 210, ch: +ch.value || 297, margin: +margin.value || 0, fontPt: +fontPt.value || 11, lang: lang.value, expand: expand.checked, avoid: avoid.checked });
  const m = openModal({
    title: 'PDF로 내보내기',
    body: h('div', null,
      h('div', { class: 'row' }, h('label', { class: 'field' }, h('span', null, '페이지 크기·비율'), size), h('label', { class: 'field' }, h('span', null, '방향'), orient)),
      custom,
      h('div', { class: 'row' }, h('label', { class: 'field' }, h('span', null, '여백 (mm)'), margin), h('label', { class: 'field' }, h('span', null, '기본 글씨 크기 (pt)'), fontPt)),
      h('label', { class: 'field' }, h('span', null, '언어'), lang),
      h('label', { class: 'check' }, expand, '접기 블록을 모두 펼쳐서 내보내기'),
      h('label', { class: 'check' }, avoid, '블록이 페이지 경계에서 잘리지 않게 (통째로 다음 페이지로)'),
      h('p', { class: 'hint' }, `직접 지정한 페이지 나눔: ${nBreaks}곳. 편집 모드에서 블록 선택 → "페이지 나눔" 버튼으로 지정.`),
      h('p', { class: 'hint' }, '인쇄 창이 뜨면 대상을 "PDF로 저장"으로 선택. 머리글/바닥글은 끄는 걸 추천. (아이패드: 공유 → 파일에 저장)')),
    actions: [
      { label: '취소', onclick: close => close() },
      { label: 'PDF 만들기', kind: 'primary', onclick: async () => {
        note.page = read();
        Editor.touch();
        m.close();
        await printNote(note);
      } }],
  });
}

async function printNote(note) {
  const p = pageDefaults(note);
  let [w, ht] = p.size === 'custom' ? [p.cw, p.ch] : PAPER[p.size];
  if (p.orient === 'landscape') [w, ht] = [Math.max(w, ht), Math.min(w, ht)];
  else[w, ht] = [Math.min(w, ht), Math.max(w, ht)];
  $('#page-style').textContent = `@page { size: ${w}mm ${ht}mm; margin: ${p.margin}mm; } @media print { #print-root { font-size: ${p.fontPt}pt; } }`;
  const root = $('#print-root');
  const course = S.courses.find(c => c.id === note.courseId);
  const pending = [];
  root.className = 'paper lang-' + p.lang + (p.avoid ? ' avoid' : '');
  root.innerHTML = '';
  root.append(h('div', { class: 'doc-course' }, course ? course.name : ''), h('h1', { class: 'doc-title' }, note.title),
    ...Study.build(note, { lang: p.lang, print: true, expand: p.expand, pending }));
  await Promise.all(pending);
  await Promise.all($$('img', root).map(img => img.decode ? img.decode().catch(() => { }) : null));
  const old = document.title;
  document.title = safeName((course ? course.name + ' - ' : '') + note.title);
  window.print();
  setTimeout(() => { document.title = old; }, 1000);
}
