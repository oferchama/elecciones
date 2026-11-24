/* La Moncloa: interfaz */
(function () {
  'use strict';
  const E = window.Engine, C = window.Charts;
  const BASE = window.SCENARIOS.spain;
  let S = BASE, M = E.model(S);
  function useScenario(presetId, seed, pos) { S = E.deriveScenario(BASE, presetId, seed, pos); M = E.model(S); }
  const SAVE_KEY = 'moncloa-save-v1';

  let st = null;
  const ui = { tab: 'overview', drawer: null, draft: null, filter: '', queue: [], nav: [], navIdx: -1 };

  // ── Utilidades ──────────────────────────────────────────────
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = (x, d = 1) => {
    const s = Math.abs(x).toFixed(d).split('.');
    s[0] = s[0].length > 4 ? s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') : s[0];
    return (x < 0 && Number(Math.abs(x).toFixed(d)) !== 0 ? '−' : '') + s.join(',');
  };
  const pct = (x, d = 1) => nf(x * 100, d) + ' %';
  const eur = (bn) => {
    const a = Math.abs(bn), sg = bn < 0 ? '−' : '';
    if (a > 0 && a < 0.95) return sg + nf(a * 1000, a < 0.1 ? 1 : 0).replace(/,0$/, '') + ' M€';
    if (a >= 1000) return sg + nf(a / 1000, 2) + ' bill. €';
    return sg + nf(a, a >= 100 ? 0 : 1) + ' mil M€';
  };
  const signed = (x, d = 1) => (x > 0 ? '+' : x < 0 ? '−' : '±') + nf(Math.abs(x), d);
  const nameOf = (id) => (S.sims[id] ? S.sims[id].name : S.groups[id] ? S.groups[id].name : M.policyById[id] ? M.policyById[id].name : id);
  const kindOf = (id) => (S.sims[id] ? 'sim' : S.groups[id] ? 'group' : null);
  const partyInfo = (id) => (id === 'player' ? { id, name: st.player.name, short: st.player.short, color: st.player.color } : S.parties.find((p) => p.id === id));
  const dateLabel = (y, q) => `T${q} ${y}`;
  const shortLabel = (lbl) => lbl.replace(' 20', " '");
  const quarters = (n) => `${n} trimestre${n === 1 ? '' : 's'}`;
  const moodColor = (h) => (h < 0.38 ? 'var(--bad)' : h < 0.47 ? 'var(--warn)' : 'var(--good)');
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(v)); } catch (e) { /* almacenamiento no disponible */ } },
    clear() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* nada */ } },
  };
  const save = () => store.set(E.serialise(st));

  function simTone(id, deltaTurns = 4) {
    const s = S.sims[id];
    const h = st.history.sims[id] || [];
    const prev = h.length > deltaTurns ? h[h.length - 1 - deltaTurns] : h[0];
    const d = st.sims[id] - (prev == null ? st.sims[id] : prev);
    if (!s.good || Math.abs(d) < 0.004) return { d, cls: 'faint', arrow: '→' };
    const better = s.good === 'high' ? d > 0 : d < 0;
    return { d, cls: better ? 'good' : 'bad', arrow: d > 0 ? '↑' : '↓' };
  }
  const trendArrow = (d, eps = 0.005, mult = 100, dec = 1) => (Math.abs(d) < eps ? '<span class="trend faint">→</span>' : `<span class="trend ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${nf(Math.abs(d * mult), dec)}</span>`);
  const toneColor = (cls) => (cls === 'good' ? 'var(--good)' : cls === 'bad' ? 'var(--bad)' : 'var(--ink-3)');

  function meter(p, ps) {
    if (!ps.active && p.availableFrom && st.year < p.availableFrom) return `<span class="meter off">Desde ${p.availableFrom}</span>`;
    if (!ps.active) return `<span class="meter off">No vigente</span>`;
    const n = Math.round(ps.v * 5 + 0.0001);
    let h = '';
    for (let i = 0; i < 5; i++) h += `<i class="${i < Math.max(1, n) ? 'on' : ''}"></i>`;
    return `<span class="meter" title="${esc(E.levelLabel(p, ps.v))}">${h}</span>`;
  }

  function toast(msg, kind = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.innerHTML = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; }, 3800);
    setTimeout(() => el.remove(), 4200);
  }

  // ── Cabecera ────────────────────────────────────────────────
  function renderHeader() {
    const v = st.lastVote;
    const b = st.lastBudget;
    const left = st.nextElectionTurn - st.turn;
    const P = st.history.polls;
    const dp = P.length > 1 ? P[P.length - 1].shares.player - P[P.length - 2].shares.player : 0;
    $('#hdr-party').textContent = `${st.player.leader} · ${st.player.name}`;
    $('#hdr-stats').innerHTML = `
      <div class="chip"><span class="k">Fecha</span><span class="v">${dateLabel(st.year, st.quarter)}</span></div>
      <div class="chip" data-action="tab" data-tab="parliament" title="Tu intención de voto"><span class="k">Encuestas</span><span class="v">${pct(v.shares.player)} <span class="trend ${dp >= 0 ? 'good' : 'bad'}">${dp >= 0 ? '▲' : '▼'}</span></span></div>
      <div class="chip opt" data-action="tab" data-tab="voters"><span class="k">Aprobación</span><span class="v">${pct(v.approval, 0)}</span></div>
      <div class="chip opt" data-action="tab" data-tab="news"><span class="k">Puntos</span><span class="v">${st.score || 0}</span></div>
      <div class="chip" title="Capital político: +${nf(st.capitalIncome || 0)} por trimestre"><span class="k">Capital</span><span class="v">${Math.floor(st.capital)}</span></div>
      <div class="chip opt" data-action="tab" data-tab="budget"><span class="k">${b.deficit >= 0 ? 'Déficit' : 'Superávit'}</span><span class="v ${b.deficit / st.gdp > 0.03 ? 'bad' : b.deficit < 0 ? 'good' : ''}">${eur(Math.abs(b.deficit))} <span class="sub">${pct(Math.abs(b.deficit) / st.gdp)}</span></span></div>
      <div class="chip opt" data-action="tab" data-tab="budget"><span class="k">Deuda</span><span class="v">${pct(st.debt / st.gdp, 0)}</span></div>
      <div class="chip" data-action="tab" data-tab="parliament"><span class="k">Elecciones</span><span class="v ${left <= 2 ? 'warn' : ''}">${left <= 0 ? 'Ahora' : left + ' trim.'}</span></div>`;
    $('#btn-next').disabled = !!st.gameOver;
  }

  const TABS = [
    ['overview', 'Resumen'], ['policies', 'Políticas'], ['indicators', 'País'], ['voters', 'Votantes'],
    ['parliament', 'Parlamento'], ['budget', 'Presupuesto'], ['news', 'Noticias'],
  ];
  function renderTabs() {
    const bad = S.situations.filter((s) => s.bad && st.situations[s.id]).length;
    const bar = $('#tabs');
    const keep = bar.scrollLeft;
    bar.innerHTML = TABS.map(([id, label]) => `<button class="tab" role="tab" data-action="tab" data-tab="${id}" aria-selected="${ui.tab === id}">${label}${id === 'indicators' && bad ? `<span class="badge" title="Crisis activas">${bad}</span>` : ''}</button>`).join('');
    // En móvil las pestañas no caben: la activa siempre a la vista, y un degradado si quedan más a la derecha
    bar.scrollLeft = keep;
    const act = bar.querySelector('[aria-selected="true"]');
    if (act && (act.offsetLeft < bar.scrollLeft || act.offsetLeft + act.offsetWidth > bar.scrollLeft + bar.clientWidth)) bar.scrollLeft = act.offsetLeft - 24;
    const edge = () => bar.classList.toggle('more-r', bar.scrollLeft + bar.clientWidth < bar.scrollWidth - 4);
    edge();
    if (!bar._edge) { bar._edge = true; bar.addEventListener('scroll', edge, { passive: true }); window.addEventListener('resize', edge); }
  }

  // ── Resumen ─────────────────────────────────────────────────
  // Situaciones y sucesos, juntos, en una sola franja
  function nowStrip() {
    const sits = S.situations.filter((s) => st.situations[s.id]);
    const evs = E.activeEvents(st, S);
    if (!sits.length && !evs.length) return '';
    const items = sits.map((s) => `<button class="sit ${s.bad ? 'bad' : 'good'}" data-action="open" data-kind="situation" data-id="${s.id}">${esc(s.name)}</button>`)
      .concat(evs.map((e) => `<button class="sit event" data-action="open" data-kind="event" data-id="${e.id}">${esc(e.title)} <span class="faint small">· ${quarters(e.left)}</span></button>`));
    return `<div class="now-strip"><span class="now-h">Ahora mismo</span><div class="sit-list">${items.join('')}</div></div>`;
  }

  function viewOverview() {
    const v = st.lastVote;
    const proj = v.projected;
    const inv = E.investiture(st, S, proj);
    const left = st.nextElectionTurn - st.turn;
    const keys = ['growth', 'unemployment', 'inflation', 'housing', 'riskPremium', 'tension', 'health', 'water'];
    const kpis = keys.map((id) => {
      const s = S.sims[id], t = simTone(id);
      return `<button class="kpi" data-action="open" data-kind="sim" data-id="${id}">
        <span class="k">${esc(s.name)}</span>
        <span class="v">${s.fmt(st.sims[id])} <span class="trend ${t.cls}">${t.arrow}</span></span>
        ${C.sparkline(st.history.sims[id], { color: toneColor(t.cls), w: 140, h: 26 })}
      </button>`;
    }).join('');
    const bh = st.history.budget;
    const defs = wageKpi() + `
      <button class="kpi" data-action="tab" data-tab="budget"><span class="k">Déficit</span><span class="v">${pct(st.lastBudget.deficit / st.gdp)}</span>${C.sparkline(bh.map((x) => x.deficit), { color: 'var(--ink-3)', w: 140, h: 26 })}</button>
      <button class="kpi" data-action="tab" data-tab="budget"><span class="k">Deuda pública</span><span class="v">${pct(st.debt / st.gdp, 0)}</span>${C.sparkline(bh.map((x) => x.debt), { color: 'var(--ink-3)', w: 140, h: 26 })}</button>`;
    const groups = M.groupIds.filter((g) => !S.groups[g].hidden).map((g) => ({ g, h: st.groupHappy[g], size: v.groupStats[g].size })).filter((x) => x.size > 0.02);
    groups.sort((a, b) => a.h - b.h);
    const angry = groups.slice(0, 4), happy = groups.slice(-4).reverse();
    const grpRow = (x) => `<tr class="click" data-action="open" data-kind="group" data-id="${x.g}"><td>${esc(S.groups[x.g].name)}</td><td style="width:45%"><div class="mood"><div class="bar"><b style="width:${(x.h * 100).toFixed(0)}%;background:${moodColor(x.h)}"></b></div><span class="small num">${(x.h * 100).toFixed(0)}</span></div></td></tr>`;
    return `
      ${nowStrip()}
      <div class="section-title"><h2>Estado de la nación</h2></div>
      <div class="kpis">${kpis}${defs}</div>
      <div class="section-title"><h2>Elecciones</h2></div>
      <div class="hero">
        <div class="card hero-main">
          <div class="row between wrap">
            <div>
              <div class="muted small">Intención de voto · ${esc(st.player.name)}</div>
              <div class="row" style="align-items:baseline;gap:12px"><span class="big-num">${pct(v.shares.player)}</span><span class="muted">${proj.player} escaños</span></div>
            </div>
            <div style="text-align:right">
              <div class="muted small">${left > 0 ? `Elecciones en ${quarters(left)}` : 'Elecciones este trimestre'}</div>
              <div class="row" style="justify-content:flex-end;gap:6px;margin-top:4px"><span class="vote-pill ${inv.success ? 'yes' : 'no'}">${inv.success ? 'Seguirías gobernando' : 'Perderías el Gobierno'}</span><button class="btn sm ghost" data-action="tab" data-tab="parliament">Ver</button></div>
            </div>
          </div>
          ${pollChart(260)}
        </div>
        <div class="card"><div class="card-h"><h3>Si hoy hubiera elecciones</h3><span class="faint small">Según las encuestas</span></div>${coalitionBlock(inv)}${hemi(proj)}${legend(proj)}</div>
      </div>
      ${goalsCard()}
      <div class="ov-grid" style="margin-top:24px">
        ${socialCard()}
        <div class="ov-side">
          <div class="card"><div class="card-h"><h3>Los más descontentos</h3></div><table class="tbl">${angry.map(grpRow).join('')}</table></div>
          <div class="card"><div class="card-h"><h3>Los más satisfechos</h3></div><table class="tbl">${happy.map(grpRow).join('')}</table></div>
        </div>
      </div>
      <div class="grid g2" style="margin-top:16px">${risksCard()}</div>`;
  }

  function pollChart(h = 240) {
    const polls = st.history.polls;
    const latest = polls[polls.length - 1].shares;
    const ids = Object.keys(latest).filter((k) => k === 'player' || latest[k] > 0.025);
    const series = ids.map((id) => {
      const p = partyInfo(id);
      return { name: p.name, label: p.short, color: p.color, bold: id === 'player', values: polls.map((x) => x.shares[id] * 100) };
    });
    return C.lineChart(series, polls.map((x) => shortLabel(x.label)), { h, yMin: 0, yFmt: (v) => nf(v, 0) + ' %', aria: 'Evolución de las encuestas' });
  }

  function orderedParties(seats) {
    const pos = E.playerPosition(st, S);
    return E.allParties(S).map((p) => ({ ...partyInfo(p.id), lr: p.isPlayer ? pos.lr : p.lr, n: seats[p.id] || 0 })).filter((p) => p.n > 0).sort((a, b) => a.lr - b.lr);
  }
  function hemi(seats, opts = {}) {
    const parts = orderedParties(seats).map((p) => ({ id: p.id, color: p.color, n: p.n, label: p.short }));
    return C.hemicycle(parts, S.chamberSeats, { w: opts.w || 420, center: String(seats.player || 0), centerSub: 'escaños ' + esc(st.player.short) });
  }
  function legend(seats) {
    return `<div class="legend">${orderedParties(seats).map((p) => `<span><i class="dot" style="background:${p.color}"></i>${esc(p.short)} <b>${p.n}</b></span>`).join('')}</div>`;
  }

  function newsList(items) {
    if (!items.length) return '<div class="faint">Todavía no hay noticias.</div>';
    return `<div class="news-list">${items.map((n) => `<div class="news ${n.kind}"><div class="when">${dateLabel(n.year, n.quarter)}</div><div><div class="t">${esc(n.title)}</div><div class="d">${esc(n.text)}</div></div></div>`).join('')}</div>`;
  }

  function targetsCard() {
    const gs = st.lastVote.groupStats;
    const ids = M.groupIds.filter((g) => !S.groups[g].hidden && gs[g].size > 0.01);
    const swing = ids.map((g) => ({ g, v: gs[g].size * (1 - gs[g].player) * gs[g].swing })).sort((a, b) => b.v - a.v).slice(0, 5);
    const risk = ids.map((g) => ({ g, v: gs[g].size * gs[g].player * gs[g].risk })).sort((a, b) => b.v - a.v).slice(0, 5);
    const angry = ids.map((g) => ({ g, v: gs[g].unhappyDefect || 0, over: (gs[g].unhappyDefect || 0) / gs[g].size })).filter((x) => x.v > 0.02).sort((a, b) => b.over - a.over).slice(0, 5);
    const row = (x, txt) => `<tr class="click" data-action="open" data-kind="group" data-id="${x.g}"><td>${esc(S.groups[x.g].name)}</td><td class="num small">${txt}</td></tr>`;
    return `<div class="card">
      <div class="card-h"><h3>Voto en juego</h3></div>
      <div class="muted small">Podrían votarte</div>
      <table class="tbl" style="margin-bottom:12px">${swing.map((x) => row(x, `${pct(x.v, 1)} del electorado`)).join('')}</table>
      <div class="muted small">Podrían abandonarte</div>
      <table class="tbl" style="margin-bottom:12px">${risk.map((x) => row(x, `${pct(x.v, 1)} del electorado`)).join('')}</table>
      ${angry.length ? `<div class="muted small">Los más desencantados</div>
      <table class="tbl">${angry.map((x) => row(x, `${nf(x.over, 1)}× su peso`)).join('')}</table>` : ''}
    </div>`;
  }

  const moodPts = (x) => signed(x * 100, 1);
  function analysisHtml(a, opts = {}) {
    if (!a) return '<div class="faint">Aún no hay elecciones anteriores con las que comparar.</div>';
    const dShare = a.shareNow - a.shareBefore;
    const flows = (obj) => Object.entries(obj).filter(([, v]) => v > 0.001).sort((x, y) => y[1] - x[1]);
    const lost = flows(a.lost), gained = flows(a.gained);
    const flowList = (list, sign) => list.length ? list.map(([id, v]) => { const p = partyInfo(id); return `<span class="row small"><i class="dot" style="background:${p.color}"></i>${esc(p.short)} <b class="${sign > 0 ? 'good' : 'bad'}">${sign > 0 ? '+' : '−'}${nf(v * 100, 1)}</b></span>`; }).join('') : '<span class="faint small">ninguno</span>';
    const dLr = a.posNow.lr - a.posBefore.lr, dCen = a.posNow.cen - a.posBefore.cen;
    const shifts = [];
    if (Math.abs(dLr) > 0.02) shifts.push(`más a la ${dLr > 0 ? 'derecha' : 'izquierda'}`);
    if (Math.abs(dCen) > 0.02) shifts.push(`más ${dCen > 0 ? 'centralista' : 'autonomista'}`);
    const drivers = [
      ...a.topCauses.map((c) => ({ name: c.name, kind: c.kind, id: c.id, delta: c.delta })),
      { name: 'Desgaste del Gobierno', kind: 'fatigue', delta: a.fatigueMood },
      { name: a.adaptation < 0 ? 'Los votantes se acostumbran a lo bueno' : 'Los votantes perdonan y olvidan', kind: 'adaptation', delta: a.adaptation },
    ].filter((d) => Math.abs(d.delta) > 0.0005).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)).slice(0, opts.max || 8);
    const scale = Math.max(0.01, ...drivers.map((d) => Math.abs(d.delta)));
    const kindLbl = { policy: 'política', sim: '', situation: 'situación', event: 'suceso', fatigue: 'tiempo en el poder', adaptation: '' };
    const groups = a.groups.slice().sort((x, y) => x.impact - y.impact);
    const losers = groups.filter((g) => g.impact < -0.001).slice(0, 4), winners = groups.filter((g) => g.impact > 0.001).reverse().slice(0, 3);
    const gRow = (g) => `<tr class="click" data-action="open" data-kind="group" data-id="${g.id}"><td>${esc(S.groups[g.id].name)}</td><td class="num small" data-label="Te votan">${pct(g.supportBefore, 0)} → <b>${pct(g.supportNow, 0)}</b></td><td class="num small ${g.dMood >= 0 ? 'good' : 'bad'}" data-label="Ánimo">${moodPts(g.dMood)}</td></tr>`;
    return `
      <div class="stat-row" style="margin-bottom:12px">
        <div class="stat"><div class="k">Tu voto</div><div class="v">${pct(a.shareBefore)} → ${pct(a.shareNow)} <span class="small ${dShare >= 0 ? 'good' : 'bad'}">${signed(dShare * 100)}</span></div></div>
        <div class="stat"><div class="k">Ánimo medio</div><div class="v">${(a.moodBefore * 100).toFixed(0)} → ${(a.moodNow * 100).toFixed(0)}</div></div>
        <div class="stat"><div class="k">Tu posición</div><div class="v small" style="font-size:13px">${shifts.length ? shifts.join(', ') : 'sin cambios'}</div></div>
      </div>
      <div class="grid g2">
        <div>
          <h3>Qué ha movido el ánimo</h3>
          <div class="faint small" style="margin-bottom:6px">Desde ${dateLabel(a.since.year, a.since.quarter)}</div>
          <div class="fx-list">${drivers.map((d) => fxRow(d.id || d.kind, d.delta, { kind: ['policy', 'sim', 'situation', 'event'].includes(d.kind) ? d.kind : 'none', id: d.id || '', name: d.name, kindLabel: kindLbl[d.kind] || '', scale, right: `<span class="${d.delta >= 0 ? 'good' : 'bad'}">${moodPts(d.delta)}</span>` })).join('') || '<div class="faint small">Nada destacable.</div>'}</div>
        </div>
        <div>
          <h3>Adónde han ido tus votantes</h3>
          <div class="small muted">Perdidos a favor de</div><div class="row wrap" style="gap:4px 12px;margin:4px 0 8px">${flowList(lost, -1)}</div>
          <div class="small muted">Ganados a</div><div class="row wrap" style="gap:4px 12px;margin:4px 0 12px">${flowList(gained, 1)}</div>
          ${losers.length ? `<h3 style="margin-top:6px">Grupos que más te han costado</h3><table class="tbl stack">${losers.map(gRow).join('')}</table>` : ''}
          ${winners.length && !opts.compact ? `<h3 style="margin-top:12px">Grupos que has ganado</h3><table class="tbl stack">${winners.map(gRow).join('')}</table>` : ''}
        </div>
      </div>`;
  }

  function changeEffects(c) {
    const p = M.policyById[c.id];
    const f = (st2, v) => (st2.active ? v : 0);
    const curve = { l: (v) => v, sqrt: (v) => Math.sqrt(v), sq: (v) => v * v };
    const out = p._fx.map((e) => ({ t: e.t, d: e.a * (curve[e.c](f(c.to, c.to.v)) - curve[e.c](f(c.from, c.from.v))) })).filter((x) => Math.abs(x.d) > 0.002);
    return { sims: out.filter((x) => kindOf(x.t) === 'sim').sort((a, b) => Math.abs(b.d) - Math.abs(a.d)), groups: out.filter((x) => kindOf(x.t) === 'group').sort((a, b) => a.d - b.d) };
  }
  function changesCard() {
    const now = st.changes || [];
    const real = now.filter((c) => c.from.active !== c.to.active || Math.abs(c.from.v - c.to.v) > 0.004);
    const list = real.length ? real : (st.lastChanges || []);
    if (!list.length) return '';
    const isNow = real.length > 0;
    const lvl = (p, x) => (x.active ? E.levelLabel(p, x.v) : 'No vigente');
    let totalBudget = 0, totalCap = 0;
    const rows = list.map((c) => {
      const p = M.policyById[c.id];
      const after = c.to.active ? E.policyBudget(st, S, p, c.to.v) : 0;
      const before = c.from.active ? E.policyBudget(st, S, p, c.from.v) : 0;
      const bd = p.budget ? (after - before) * (p.budget[0] === 'rev' ? 1 : -1) : 0;
      totalBudget += bd; totalCap += c.cost;
      const fx = changeEffects(c);
      const simTxt = fx.sims.slice(0, 4).map((x) => { const good = signColorForSim(x.t, x.d).includes('good'); return `<span class="${good ? 'good' : 'bad'}">${x.d > 0 ? '▲' : '▼'} ${esc(nameOf(x.t))}</span>`; }).join(' · ');
      const up = fx.groups.filter((x) => x.d > 0).slice(-3).reverse(), down = fx.groups.filter((x) => x.d < 0).slice(0, 3);
      const gTxt = (arr) => arr.map((x) => `${esc(nameOf(x.t))} <b>${signed(x.d * 100, 0)}</b>`).join(', ');
      return `<tr class="click" data-action="open" data-kind="policy" data-id="${c.id}">
        <td><b>${esc(p.name)}</b><div class="small muted">${esc(lvl(p, c.from))} → <b>${esc(lvl(p, c.to))}</b></div></td>
        <td class="small" data-label="Indicadores">${simTxt || '<span class="faint">–</span>'}</td>
        <td class="small" data-label="Votantes">${up.length ? '<span class="good">Contentos:</span> ' + gTxt(up) : ''}${up.length && down.length ? '<br>' : ''}${down.length ? '<span class="bad">Molestos:</span> ' + gTxt(down) : ''}</td>
        <td class="num small ${bd > 0.0005 ? 'good' : bd < -0.0005 ? 'bad' : 'faint'}" data-label="Presupuesto">${Math.abs(bd) < 0.0005 ? '–' : (bd > 0 ? '+' : '−') + eur(Math.abs(bd)) + '/año'}</td>
        <td class="num small" data-label="Capital">${c.cost}</td></tr>`;
    }).join('');
    return `<div class="card" style="margin-bottom:16px">
      <div class="card-h"><h3>${isNow ? 'Cambios de este trimestre' : 'Cambios del trimestre pasado (' + dateLabel(list[0].year, list[0].quarter) + ')'}</h3>
        <span class="faint small">${list.length} ${list.length > 1 ? 'políticas' : 'política'} · ${totalCap} de capital · presupuesto ${Math.abs(totalBudget) < 0.0005 ? 'neutro' : (totalBudget > 0 ? '+' : '−') + eur(Math.abs(totalBudget)) + '/año'}</span></div>
      <table class="tbl stack"><thead><tr><th>Política</th><th>Indicadores</th><th>Ánimo de los votantes</th><th class="num">Presupuesto</th><th class="num">Capital</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  }

  function promisesCard() {
    const ps = st.promises || [];
    const kept = ps.filter((p) => p.status === 'kept').length, broken = ps.filter((p) => p.status === 'broken').length;
    const rows = ps.map((p) => {
      const c = E.promiseCheck(st, S, p);
      const mark = p.status === 'kept' ? '✓' : p.status === 'broken' ? '✗' : '';
      const info = p.status === 'open' ? (p.keep ? 'Compromiso: no lo rompas' : esc(c.now) + ' <span class="faint">/ ' + esc(c.target) + '</span>') : p.status === 'kept' ? 'Cumplida' : 'Incumplida';
      return `<div class="goal ${p.status === 'kept' ? 'done' : p.status === 'broken' ? 'failed' : ''}"><span class="goal-mark">${mark}</span><span class="goal-t">${esc(p.title)}</span><span class="goal-v small">${info}</span></div>`;
    }).join('');
    const due = st.nextElectionTurn - st.turn;
    return `<div class="section-title"><h2>Tus promesas</h2><span class="faint small">${kept} cumplidas · ${broken} incumplidas · se juzgan ${due > 0 ? 'en ' + quarters(due) : 'ahora'}</span></div><div class="goals">${rows}</div>`;
  }

  function goalsCard() {
    if ((st.promises || []).length) return promisesCard();
    const goals = st.goals || [];
    if (!goals.length) return '';
    const done = goals.filter((g) => (st.goalsDone || {})[g.id]).length;
    const rows = goals.map((g) => {
      const gs = E.goalStatus(st, S, g);
      const fin = (st.goalsDone || {})[g.id];
      return `<div class="goal ${fin ? 'done' : ''}">
        <span class="goal-mark">${fin ? '✓' : ''}</span>
        <span class="goal-t">${esc(g.title)}</span>
        <span class="goal-v small">${fin ? dateLabel(fin.year, fin.quarter) : g.win ? '' : esc(gs.now) + ' <span class="faint">/ ' + esc(gs.target) + '</span>'}</span>
      </div>`;
    }).join('');
    return `<div class="section-title"><h2>Tu mandato</h2><span class="faint small">${done} de ${goals.length} logrados · ${st.score || 0} puntos</span></div><div class="goals">${rows}</div>`;
  }

  // ── Políticas ───────────────────────────────────────────────
  function viewPolicies() {
    const f = ui.filter.trim().toLowerCase();
    const changed = new Set(st.changedThisTurn || []);
    const cats = Object.keys(S.policyCats).map((cid) => {
      const cat = S.policyCats[cid];
      const pols = S.policies.filter((p) => p.cat === cid && (!f || (p.name + ' ' + p.desc).toLowerCase().includes(f)));
      if (!pols.length) return '';
      const spend = pols.reduce((a, p) => a + (p.budget && st.policies[p.id].active ? E.policyBudget(st, S, p, st.policies[p.id].v) * (p.budget[0] === 'rev' ? 0 : 1) : 0), 0);
      return `<div class="card pol-cat">
        <div class="card-h"><h3>${esc(cat.name)}</h3><span class="faint small">${spend > 0.5 ? eur(spend) + '/año' : ''}</span></div>
        ${pols.map((p) => {
          const ps = st.policies[p.id];
          const sel = ui.drawer && ui.drawer.kind === 'policy' && ui.drawer.id === p.id;
          return `<button class="pol ${ps.active ? '' : 'off'} ${sel ? 'sel' : ''} ${changed.has(p.id) ? 'changed' : ''}" data-action="open" data-kind="policy" data-id="${p.id}">
            <span class="n">${esc(p.name)}</span>${meter(p, ps)}
            <span class="l">${ps.active ? esc(E.levelLabel(p, ps.v)) : ''}</span>
          </button>`;
        }).join('')}
      </div>`;
    }).join('');
    return `
      <div class="toolbar">
        <input class="search" type="search" placeholder="Buscar políticas… (vivienda, IRPF, nuclear)" value="${esc(ui.filter)}" data-input="filter" aria-label="Buscar políticas" />
        <span class="muted small">Capital político: <b>${Math.floor(st.capital)}</b> · +${nf(st.capitalIncome || 0)} por trimestre</span>
      </div>
      ${changesCard()}
      <div class="pol-grid">${cats || '<div class="faint">Ninguna política coincide.</div>'}</div>`;
  }

  // ── País ────────────────────────────────────────────────────
  const SIM_CATS = [['Economy', 'Economía'], ['Society', 'Sociedad'], ['Environment', 'Medio ambiente'], ['World', 'Fuerzas que no controlas']];
  function viewIndicators() {
    return `
      ${nowStrip()}
      ${SIM_CATS.map(([c, title]) => {
        const ids = M.simIds.filter((id) => S.sims[id].cat === c && !S.sims[id].hidden);
        return `<div class="section-title"><h2>${title}</h2></div>
        <div class="kpis">${c === 'Economy' ? wageKpi() : ''}${ids.map((id) => {
          const s = S.sims[id], t = simTone(id);
          return `<button class="kpi" data-action="open" data-kind="sim" data-id="${id}">
            <span class="k">${esc(s.name)}</span>
            <span class="v">${s.fmt(st.sims[id])} <span class="trend ${t.cls}">${t.arrow}</span></span>
            <span class="faint small">${esc(s.unit)}</span>
            ${C.sparkline(st.history.sims[id], { color: toneColor(t.cls), w: 140, h: 26 })}
          </button>`;
        }).join('')}</div>`;
      }).join('')}
      <div class="section-title"><h2>Situaciones posibles</h2></div>
      <div class="sit-list">${S.situations.filter((s) => !st.situations[s.id]).map((s) => `<button class="sit ${s.bad ? 'bad' : 'good'}" style="opacity:.55" data-action="open" data-kind="situation" data-id="${s.id}">${esc(s.name)}</button>`).join('')}</div>`;
  }

  // ── Votantes ────────────────────────────────────────────────
  function viewVoters() {
    const v = st.lastVote;
    const rows = M.groupIds.filter((g) => !S.groups[g].hidden).map((g) => ({ g, h: st.groupHappy[g], ...v.groupStats[g] })).filter((x) => x.size > 0.005).sort((a, b) => b.size - a.size);
    return `
      <div class="grid g3" style="margin-bottom:16px">
        <div class="card"><div class="muted small">Aprobación</div><div class="big-num">${pct(v.approval, 0)}</div></div>
        <div class="card"><div class="muted small">Participación prevista</div><div class="big-num">${pct(v.turnout, 0)}</div></div>
        <div class="card"><div class="muted small">Tu posición</div>${positionMap()}</div>
      </div>
      <div class="card">
        <div class="card-h"><h3>Grupos de votantes</h3><span class="faint small">Tendencias del último año</span></div>
        <div class="grp-table">
          <div class="grp-head"><span>Grupo</span><span>Tamaño</span><span>Ánimo</span><span>Te votan</span><span>Persuadibles</span></div>
          ${rows.map((x) => {
            const h = st.history.groups[x.g] || [];
            const prev = h.length > 4 ? h[h.length - 5] : h[0];
            const d = x.h - prev;
            return `<button class="grp-row" data-action="open" data-kind="group" data-id="${x.g}">
              <span class="g-name">${esc(S.groups[x.g].name)}</span>
              <span class="g-size"><span class="lbl">Tamaño</span>${pct(x.size, 1)} ${trendArrow(sizeTrend(x.g), 0.0005, 100, 1)}</span>
              <span class="g-mood"><span class="lbl">Ánimo</span><span class="mood"><span class="bar"><b style="width:${(x.h * 100).toFixed(0)}%;background:${moodColor(x.h)}"></b></span><span class="small num">${(x.h * 100).toFixed(0)}</span><span class="small ${Math.abs(d) < 0.005 ? 'faint' : d > 0 ? 'good' : 'bad'}">${Math.abs(d) < 0.005 ? '→' : signed(d * 100, 0)}</span></span></span>
              <span class="g-vote"><span class="lbl">Te votan</span>${pct(x.player, 0)}</span>
              <span class="g-swing"><span class="lbl">Persuadibles</span>${pct(x.swing || 0, 0)}</span>
            </button>`;
          }).join('')}
        </div>
      </div>
      <div class="grid g2" style="margin-top:16px">${targetsCard()}</div>
      <div class="section-title"><h2>Por comunidades</h2></div>
      ${regionsSection()}`;
  }

  function positionMap() {
    const w = 260, h = 150;
    const pos = E.playerPosition(st, S);
    const X = (lr) => 14 + ((lr + 1) / 2) * (w - 28), Y = (c) => 12 + ((1 - c) / 2) * (h - 30);
    const dots = E.allParties(S).map((p) => {
      const info = partyInfo(p.id);
      const lr = p.isPlayer ? pos.lr : p.lr, cen = p.isPlayer ? pos.cen : p.cen;
      return `<g><circle cx="${X(lr)}" cy="${Y(cen)}" r="${p.isPlayer ? 7 : 5}" fill="${info.color}" stroke="var(--surface)" stroke-width="1.5"><title>${esc(info.name)}</title></circle>${p.isPlayer || (p.target || 0) > 0.08 ? `<text x="${X(lr)}" y="${Y(cen) - 9}" text-anchor="middle" font-size="10" font-weight="700" fill="var(--ink-2)">${esc(info.short)}</text>` : ''}</g>`;
    }).join('');
    return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto;display:block;margin-top:6px">
      <rect x="14" y="12" width="${w - 28}" height="${h - 30}" fill="var(--surface-2)"/>
      <line x1="${w / 2}" x2="${w / 2}" y1="12" y2="${h - 18}" stroke="var(--line)"/><line x1="14" x2="${w - 14}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--line)"/>
      <text x="16" y="${h - 4}" font-size="9.5" fill="var(--ink-3)">← Izquierda</text><text x="${w - 16}" y="${h - 4}" font-size="9.5" fill="var(--ink-3)" text-anchor="end">Derecha →</text>
      <text x="${w / 2}" y="9" font-size="9.5" fill="var(--ink-3)" text-anchor="middle">Centralista</text><text x="${w / 2}" y="${h - 4}" font-size="9.5" fill="var(--ink-3)" text-anchor="middle">Autonomista</text>
      ${dots}</svg>`;
  }

  // ── Parlamento ──────────────────────────────────────────────
  function flowCard() {
    const f = E.voteFlows(st, S);
    if (!f) return '';
    const pos = E.perceivedPosition(st, S);
    const lrOf = (id) => (id === 'player' ? pos.lr : (S.parties.find((p) => p.id === id) || { lr: 0 }).lr);
    const big = new Set(Object.keys(Object.assign({}, f.from, f.to)).filter((id) => Math.max(f.from[id] || 0, f.to[id] || 0) >= 0.02 || id === 'player'));
    const key = (id) => (big.has(id) ? id : '_others');
    const agg = {};
    f.links.forEach((l) => { const k = key(l.s) + '>' + key(l.t); agg[k] = (agg[k] || 0) + l.v; });
    const links = Object.entries(agg).map(([k, v]) => { const [a, b] = k.split('>'); return { s: a, t: b, v }; });
    const tot = (side, id) => links.filter((l) => l[side] === id).reduce((a, l) => a + l.v, 0);
    const info = (id) => (id === '_others' ? { short: 'Otros', name: 'Partidos regionales y pequeños', color: 'var(--ink-3)' } : partyInfo(id));
    const order = [...new Set(links.flatMap((l) => [l.s, l.t]))].sort((a, b) => (a === '_others' ? 1 : b === '_others' ? -1 : lrOf(a) - lrOf(b)));
    const node = (side) => order.filter((id) => tot(side, id) > 0.001).map((id) => ({ id, label: esc(info(id).short), sub: pct(tot(side, id), 1), color: info(id).color, value: tot(side, id) }));
    links.forEach((l) => { l.color = info(l.s).color; l.title = `${esc(info(l.s).short)} → ${esc(info(l.t).short)}: ${pct(l.v, 1)} de los votantes`; });
    const kept = links.find((l) => l.s === 'player' && l.t === 'player');
    const fromP = tot('s', 'player');
    const lostTo = links.filter((l) => l.s === 'player' && l.t !== 'player' && l.v > 0.003).sort((a, b) => b.v - a.v);
    const wonFrom = links.filter((l) => l.t === 'player' && l.s !== 'player' && l.v > 0.003).sort((a, b) => b.v - a.v);
    const list = (arr, side) => arr.slice(0, 3).map((l) => `<b>${esc(info(l[side]).short)}</b> ${nf(l.v * 100, 1)} pts`).join(', ');
    return `<div class="card" style="margin-top:16px">
      <div class="card-h"><h3>Transferencias de voto</h3><span class="faint small">${dateLabel(f.since.year, f.since.quarter)} → hoy</span></div>
      <p class="muted small" style="margin:0 0 10px">${fromP ? `El <b>${pct((kept ? kept.v : 0) / fromP, 0)}</b> de tus votantes repetiría.` : ''}
        ${lostTo.length ? ` Pierdes votos hacia ${list(lostTo, 't')}.` : ''}${wonFrom.length ? ` Ganas votos de ${list(wonFrom, 's')}.` : ''}</p>
      <div class="row between small faint" style="margin-bottom:4px"><span>Últimas elecciones</span><span>Hoy</span></div>
      ${C.sankey(node('s'), node('t'), links, { w: 960, h: 300, labelWidth: 90, aria: 'Transferencias de voto entre partidos' })}
    </div>`;
  }

  function coalitionBlock(I) {
    const verdict = I.yes >= S.majority ? ['good', 'Mayoría absoluta de apoyos'] : I.yes > I.no ? ['good', 'Investidura en segunda votación'] : ['bad', 'Sin apoyos suficientes para gobernar'];
    const backers = I.detail.filter((d) => d.seats && (d.id === 'player' || d.vote === 'yes')).sort((a, b) => b.seats - a.seats).map((d) => esc(partyInfo(d.id).short)).join(' · ');
    return `<div class="coal">
        <div class="coal-item yes"><span class="coal-n">${I.yes}</span><span class="coal-l">a favor</span></div>
        <div class="coal-item abst"><span class="coal-n">${I.abstain}</span><span class="coal-l">abstención</span></div>
        <div class="coal-item no"><span class="coal-n">${I.no}</span><span class="coal-l">en contra</span></div>
      </div>
      <div class="majority-bar" title="Mayoría: ${S.majority}"><span style="width:${(I.yes / S.chamberSeats * 100).toFixed(2)}%;background:var(--good)"></span><span style="width:${(I.abstain / S.chamberSeats * 100).toFixed(2)}%;background:var(--ink-3);opacity:.4"></span><span style="width:${(I.no / S.chamberSeats * 100).toFixed(2)}%;background:var(--bad)"></span></div>
      <div class="coal-verdict ${verdict[0]}">${verdict[1]}</div>
      <div class="faint small">Te apoyan: ${backers}</div>`;
  }

  function viewParliament() {
    const seats = st.seats;
    const inv = E.investiture(st, S, seats);
    const proj = st.lastVote.projected;
    const invP = E.investiture(st, S, proj);
    const order = orderedParties(Object.fromEntries(E.allParties(S).map((p) => [p.id, Math.max(1, seats[p.id] || 0)])));
    const VOTE = { yes: 'A favor', no: 'En contra', abstain: 'Abstención' };
    const rows = order.map((p) => {
      const d = invP.detail.find((x) => x.id === p.id);
      const reasons = (d.reasons || []).map((r) => `<div class="small ${r.ok ? 'good' : 'bad'}">${r.ok ? '✓' : '✗'} ${esc(r.text)}</div>`).join('');
      const dSeats = (proj[p.id] || 0) - (seats[p.id] || 0);
      return `<tr>
        <td><div class="row"><i class="dot" style="background:${p.color}"></i><b>${esc(p.name)}</b> <span class="faint small">${esc(p.short)}</span></div>${reasons}</td>
        <td class="num" data-label="Escaños">${seats[p.id] || 0}</td>
        <td class="num" data-label="Previsión">${proj[p.id] || 0} ${dSeats ? `<span class="small ${dSeats > 0 ? 'good' : 'bad'}">${signed(dSeats, 0)}</span>` : ''}</td>
        <td class="num" data-label="Encuesta">${pct(st.lastVote.shares[p.id] || 0)}</td>
        <td class="num" data-label="Postura">${p.id === 'player' ? '<span class="vote-pill yes">Tú</span>' : `<span class="vote-pill ${d.vote}">${VOTE[d.vote]}</span>`}</td></tr>`;
    }).join('');
    const left = st.nextElectionTurn - st.turn;
    const canSnap = st.turn - st.lastElectionTurn >= 4 && left > 1;
    return `
      <div class="grid g2">
        <div class="card"><div class="card-h"><h3>Congreso actual</h3><span class="faint small">Elegido en ${dateLabel(st.lastElection.year, st.lastElection.quarter)}</span></div>${coalitionBlock(inv)}${hemi(seats)}${legend(seats)}</div>
        <div class="card"><div class="card-h"><h3>Si hoy hubiera elecciones</h3><span class="faint small">Según las encuestas</span></div>${coalitionBlock(invP)}${hemi(proj)}${legend(proj)}</div>
      </div>
      ${flowCard()}
      <div class="card" style="margin-top:16px">
        <div class="card-h"><h3>Partidos</h3></div>
        <table class="tbl stack"><thead><tr><th>Partido</th><th class="num">Escaños</th><th class="num">Previsión</th><th class="num">Encuesta</th><th class="num">Postura</th></tr></thead><tbody>${rows}</tbody></table>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-h"><h3>Desde las últimas elecciones</h3></div>
        ${analysisHtml(E.electionAnalysis(st, S))}
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-h"><h3>Evolución de las encuestas</h3></div>${pollChart(240)}
      </div>
      <div class="card" style="margin-top:16px">
        <div class="row between wrap"><div><h3>Elecciones anticipadas</h3><div class="muted small">Disuelve las Cortes. España vota el próximo trimestre.</div></div>
        <button class="btn" data-action="snap" ${canSnap ? '' : 'disabled'}>Convocar elecciones</button></div>
      </div>`;
  }

  // ── Presupuesto ─────────────────────────────────────────────
  function revenueCard() {
    const b = st.lastBudget, mac = b.macro, m0 = st.macro0;
    if (!mac || !m0) return '';
    const chg = (a, z) => { const d = a / z - 1; return `<span class="small ${d >= 0 ? 'good' : 'bad'}">${signed(d * 100, 1)} %</span>`; };
    const rows = b.rev.filter((x) => x.base && x.v >= 0.05).map((x) => `<tr class="click" data-action="open" data-kind="policy" data-id="${x.id}"><td>${esc(x.name)}</td>
        <td class="num small" data-label="Desde que gobiernas">${chg(x.scale, 1)}</td><td class="num" data-label="Recaudación">${eur(x.v)}</td></tr>`).join('');
    return `<div class="card" style="margin-top:16px">
      <div class="card-h"><h3>Recaudación</h3><span class="faint small">Cambio desde que gobiernas</span></div>
      <div class="kpis" style="margin-bottom:14px">
        <div class="kpi"><span class="k">Ocupados</span><span class="v">${nf(mac.employed, 1)} M</span><span class="faint small">${chg(mac.employed, m0.employed)}</span></div>
        <div class="kpi"><span class="k">Salario medio</span><span class="v">${nf(mac.avgWage, 1)} mil €</span><span class="faint small">${chg(mac.avgWage, m0.avgWage)}</span></div>
        <div class="kpi"><span class="k">Masa salarial</span><span class="v">${eur(mac.wageBill)}</span><span class="faint small">${chg(mac.wageBill, m0.wageBill)}</span></div>
        <div class="kpi"><span class="k">Consumo</span><span class="v">${eur(mac.consumption)}</span><span class="faint small">${chg(mac.consumption, m0.consumption)}</span></div>
        <div class="kpi"><span class="k">Excedente empresarial</span><span class="v">${eur(mac.profits)}</span><span class="faint small">${chg(mac.profits, m0.profits)}</span></div>
      </div>
      <table class="tbl stack"><thead><tr><th>Impuesto</th><th class="num">Desde que gobiernas</th><th class="num">Recaudación/año</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  }

  function viewBudget() {
    const b = st.lastBudget;
    const bh = st.history.budget;
    const labels = st.history.polls.map((x) => shortLabel(x.label));
    const maxV = Math.max(...b.rev.map((x) => x.v), ...b.spend.map((x) => x.v));
    const list = (items, color) => `<table class="tbl">${items.filter((x) => Math.abs(x.v) >= 0.001).map((x) => `<tr ${x.id[0] !== '_' ? `class="click" data-action="open" data-kind="policy" data-id="${x.id}"` : ''}>
      <td>${esc(x.name)}</td><td style="width:34%"><div class="bar"><b style="width:${Math.max(0.5, (Math.abs(x.v) / maxV) * 100).toFixed(1)}%;background:${x.v < 0 ? 'var(--good)' : color}"></b></div></td><td class="num">${eur(x.v)}</td></tr>`).join('')}</table>`;
    return `
      <div class="kpis" style="margin-bottom:16px">
        <div class="kpi"><span class="k">Ingresos</span><span class="v">${eur(b.revenue)}</span><span class="faint small">${pct(b.revenue / st.gdp)} del PIB</span></div>
        <div class="kpi"><span class="k">Gastos</span><span class="v">${eur(b.spending)}</span><span class="faint small">${pct(b.spending / st.gdp)} del PIB</span></div>
        <div class="kpi"><span class="k">${b.deficit >= 0 ? 'Déficit' : 'Superávit'}</span><span class="v ${b.deficit / st.gdp > 0.03 ? 'bad' : b.deficit < 0 ? 'good' : ''}">${pct(Math.abs(b.deficit) / st.gdp)}</span><span class="faint small">${eur(Math.abs(b.deficit))}/año · límite UE 3 %</span></div>
        <div class="kpi"><span class="k">Deuda pública</span><span class="v">${pct(st.debt / st.gdp, 0)}</span><span class="faint small">${eur(st.debt)}</span></div>
        <div class="kpi"><span class="k">Intereses</span><span class="v">${eur(b.interest)}</span><span class="faint small">tipo medio ${pct(st.effRate, 2)}</span></div>
        <div class="kpi"><span class="k">PIB</span><span class="v">${eur(st.gdp)}</span><span class="faint small">nominal, anual</span></div>
      </div>
      <div class="grid g2">
        <div class="card"><div class="card-h"><h3>Deuda pública</h3><span class="faint small">% del PIB</span></div>
          ${C.lineChart([{ label: 'Deuda', color: 'var(--accent)', values: bh.map((x) => x.debt * 100), bold: true }], labels, { h: 180, yMin: Math.min(60, ...bh.map((x) => x.debt * 100)), yFmt: (v) => nf(v, 0) + ' %' })}
        </div>
        <div class="card"><div class="card-h"><h3>Déficit</h3><span class="faint small">% del PIB</span></div>
          ${C.lineChart([{ label: 'Déficit', color: 'var(--warn)', values: bh.map((x) => x.deficit * 100), bold: true }], labels, { h: 180, yMin: Math.min(0, ...bh.map((x) => x.deficit * 100)), refLine: 3, yFmt: (v) => nf(v, 1) + ' %' })}
        </div>
      </div>
      <div class="grid g2" style="margin-top:16px">
        <div class="card"><div class="card-h"><h3>Ingresos</h3><span class="faint small">${eur(b.revenue)}/año</span></div>${list(b.rev, 'var(--good)')}</div>
        <div class="card"><div class="card-h"><h3>Gastos</h3><span class="faint small">${eur(b.spending)}/año</span></div>${list(b.spend, 'var(--accent)')}</div>
      </div>
      ${revenueCard()}`;
  }

  // ── Territorio ──────────────────────────────────────────────
  function regionStats() {
    const v = st.lastVote, order = v.partyOrder, regs = {};
    S.provinces.forEach((prov, pi) => {
      const r = (regs[prov.region] = regs[prov.region] || { seats: 0, votes: order.map(() => 0), proj: {} });
      r.seats += prov.seats;
      v.byProv[pi].forEach((x, k) => (r.votes[k] += x));
      Object.entries(v.byProvSeats[pi]).forEach(([id, n]) => (r.proj[id] = (r.proj[id] || 0) + n));
    });
    Object.values(regs).forEach((r) => {
      r.tot = r.votes.reduce((a, b) => a + b, 0) || 1;
      let lead = 0; r.votes.forEach((x, i) => { if (x > r.votes[lead]) lead = i; });
      r.lead = order[lead]; r.leadShare = r.votes[lead] / r.tot; r.mine = r.votes[0] / r.tot;
    });
    return regs;
  }

  const MAP = { data: null, loading: false, failed: false, mode: 'lead' };
  function mapReady() { return window.d3 && window.topojson && S.map && d3[S.map.projection]; }
  function loadMap() {
    if (MAP.data || MAP.loading || MAP.failed) return;
    if (!mapReady()) { MAP.failed = true; return; }
    MAP.loading = true;
    fetch(S.map.url).then((r) => r.json()).then((j) => { MAP.data = j; })
      .catch(() => { MAP.failed = true; })
      .finally(() => { MAP.loading = false; if (ui.tab === 'voters') renderView(); });
  }
  function mapCard(regs) {
    if (!S.map) return '';
    loadMap();
    const head = `<div class="card-h"><h3>Mapa por comunidades</h3><div class="seg" style="width:auto">${[['lead', 'Partido más votado'], ['player', 'Tu voto']].map(([m, l]) => `<button aria-pressed="${MAP.mode === m}" data-action="map-mode" data-m="${m}">${l}</button>`).join('')}</div></div>`;
    if (MAP.failed) return `<div class="card">${head}<div class="chart-empty">Mapa no disponible sin conexión.</div></div>`;
    if (!MAP.data) return `<div class="card">${head}<div class="chart-empty">Cargando el mapa…</div></div>`;
    const topo = MAP.data;
    const feats = topojson.feature(topo, topo.objects[S.map.regionsObject]);
    feats.features = feats.features.filter((f) => S.map.regionCodes[f.id]);
    const w = 640, h = 500;
    const proj = d3[S.map.projection]().fitSize([w, h], feats);
    const path = d3.geoPath(proj);
    const pColor = st.player.color;
    const leaders = {};
    const shapes = feats.features.map((f) => {
      const key = S.map.regionCodes[f.id], r = regs[key];
      if (!r) return '';
      const lp = partyInfo(r.lead);
      leaders[r.lead] = (leaders[r.lead] || 0) + 1;
      const fill = MAP.mode === 'lead' ? lp.color : pColor;
      const op = MAP.mode === 'lead' ? Math.max(0.35, Math.min(1, 0.2 + (r.leadShare - 0.2) * 2.4)) : Math.max(0.06, Math.min(1, r.mine / 0.5));
      return `<path class="prov" d="${path(f)}" fill="${fill}" fill-opacity="${op.toFixed(2)}"><title>${esc(S.regions[key].name)} (${r.seats} escaños)\nGana ${esc(lp.short)} con el ${pct(r.leadShare, 0)}. Tú: ${pct(r.mine, 0)} y ${r.proj.player || 0} escaños</title></path>`;
    }).join('');
    const canary = feats.features.filter((f) => (S.map.inset || []).includes(f.id)).map((f) => path.bounds(f));
    let frame = '';
    if (canary.length) {
      const x0 = Math.min(...canary.map((b) => b[0][0])) - 8, y0 = Math.min(...canary.map((b) => b[0][1])) - 8;
      const x1 = Math.max(...canary.map((b) => b[1][0])) + 8, y1 = Math.max(...canary.map((b) => b[1][1])) + 8;
      frame = `<path class="frame" d="M${x0.toFixed(1)},${y0.toFixed(1)}H${x1.toFixed(1)}V${y1.toFixed(1)}H${x0.toFixed(1)}Z"/>`;
    }
    const lg = MAP.mode === 'lead'
      ? Object.entries(leaders).sort((a, b) => b[1] - a[1]).map(([id, n]) => `<span><i class="dot" style="background:${partyInfo(id).color}"></i>${esc(partyInfo(id).short)} ${n}</span>`).join('')
      : `<span><i class="dot" style="background:${pColor};opacity:.15"></i>5 %</span><span><i class="dot" style="background:${pColor};opacity:.5"></i>25 %</span><span><i class="dot" style="background:${pColor}"></i>50 % o más</span>`;
    return `<div class="card">${head}
      <svg class="spain-map" viewBox="0 0 ${w} ${h}" role="img" aria-label="Mapa de España por comunidades autónomas">${shapes}${frame}</svg>
      <div class="map-legend">${MAP.mode === 'lead' ? '<span class="faint">Comunidades ganadas:</span>' : '<span class="faint">Tu porcentaje de voto:</span>'}${lg}</div>
      <div class="map-credit">Límites: © Instituto Geográfico Nacional (CC BY 4.0), vía es-atlas.</div></div>`;
  }

  // El mapa y la tabla por comunidades, dentro de Votantes
  function regionsSection() {
    const regs = regionStats();
    const order = st.lastVote.partyOrder;
    const rows = Object.keys(S.regions).filter((k) => regs[k]).map((k) => {
      const r = regs[k];
      const leadP = partyInfo(r.lead);
      const stack = order.map((id, i) => ({ id, s: r.votes[i] / r.tot })).filter((x) => x.s > 0.01).sort((a, b) => b.s - a.s);
      return `<tr>
        <td><b>${esc(S.regions[k].name)}</b></td>
        <td class="num" data-label="Escaños">${r.seats}</td>
        <td class="num" data-label="Tus escaños"><b>${r.proj.player || 0}</b></td>
        <td style="min-width:180px" data-label="Reparto"><div class="majority-bar nomark" style="height:12px">${stack.map((x) => `<span title="${esc(partyInfo(x.id).short)} ${pct(x.s)}" style="width:${(x.s * 100).toFixed(1)}%;background:${partyInfo(x.id).color}"></span>`).join('')}</div></td>
        <td class="num" data-label="Tu voto">${pct(r.mine)}</td>
        <td data-label="Gana"><span class="row"><i class="dot" style="background:${leadP.color}"></i>${esc(leadP.short)}</span></td></tr>`;
    }).join('');
    return `${mapCard(regs)}<div class="card" style="margin-top:16px">
      <div class="card-h"><h3>Por comunidades autónomas</h3><span class="faint small">Si hoy hubiera elecciones</span></div>
      <table class="tbl stack"><thead><tr><th>Comunidad</th><th class="num">Escaños</th><th class="num">Tus escaños</th><th>Reparto</th><th class="num">Tu voto</th><th>Gana</th></tr></thead><tbody>${rows}</tbody></table>
    </div>`;
  }

  // ── Noticias y logros ───────────────────────────────────────
  const KIND_LABEL = { broken: 'Revés', goal: 'Objetivo', milestone: 'Hito', crisis: 'Fin de la crisis', group: 'Votantes', polls: 'Encuestas', good: 'Buenas noticias', win: 'Elecciones' };
  const ptsLabel = (p) => `${p >= 0 ? '+' : '−'}${Math.abs(p)} puntos`;
  function viewNews() {
    // Pocas entradas por defecto, para que las redes se vean sin bajar mucho
    const SHORT = window.innerWidth <= 560 ? 2 : 3;
    const allAch = st.achievements || [];
    const ach = ui.newsAll ? allAch : allAch.slice(0, SHORT);
    const news = ui.newsAll ? st.news : st.news.slice(0, SHORT);
    const hidden = Math.max(0, allAch.length - ach.length) + Math.max(0, st.news.length - news.length);
    const toggle = ui.newsAll
      ? '<button class="btn sm ghost news-more" data-action="news-all" data-v="0">Mostrar menos</button>'
      : hidden ? `<button class="btn sm ghost news-more" data-action="news-all" data-v="1">Ver todo (${hidden} más)</button>` : '';
    return `<div class="grid g2">
      <div class="card"><div class="card-h"><h3>Logros</h3><span class="faint small">${st.score || 0} puntos</span></div>
        ${ach.length ? `<div class="news-list">${ach.map((a) => `<div class="news"><div class="when">${dateLabel(a.year, a.quarter)}</div><div><div class="t">${esc(a.title)}</div><div class="d"><span class="kind-tag">${KIND_LABEL[a.kind] || ''}</span> ${ptsLabel(a.points)}${a.capital ? `, +${a.capital} de capital` : ''}</div></div></div>`).join('')}</div>` : '<div class="chart-empty">Todavía nada.</div>'}
      </div>
      <div class="card"><div class="card-h"><h3>Noticias</h3></div>${newsList(news)}</div>
    </div>
    ${toggle}
    ${socialSection()}`;
  }

  // ── En las redes ────────────────────────────────────────────
  const ICON = {
    reply: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    repost: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h11l-3-3M17 17H6l3 3M18 7v6M6 17v-6"/></svg>',
    like: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  };
  const compact = (n) => (n >= 1e6 ? nf(n / 1e6, 1) + ' M' : n >= 1e4 ? nf(n / 1e3, 0) + ' mil' : n >= 1000 ? nf(n / 1e3, 1) + ' mil' : String(n));
  const initials = (name) => name.split(/\s+/).filter((w) => !/^(de|la|del|el)$/i.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const richText = (t) => esc(t).replace(/\n/g, '<br>').replace(/(^|[\s(])([#@][\wÁÉÍÓÚÜÑáéíóúüñ]+)/g, '$1<span class="sp-tag">$2</span>');
  function avatar(a) {
    return `<span class="sp-av ${a.kind === 'media' || a.kind === 'bot' ? 'sq' : ''}" style="background:${a.color}" aria-hidden="true">${a.kind === 'bot' ? '⚙' : esc(initials(a.name))}</span>`;
  }
  function postHtml(p, reply) {
    const a = p.a;
    const badge = a.verified ? '<span class="sp-ok" title="Cuenta verificada">✓</span>' : '';
    const party = a.party ? `<span class="sp-party" style="color:${a.color}">${esc(a.party)}</span>` : '';
    return `<article class="sp${reply ? ' sp-reply' : ''}">
      ${avatar(a)}
      <div class="sp-body">
        <div class="sp-head"><b class="sp-name">${esc(a.name)}</b>${badge}${party}<span class="sp-handle">@${esc(a.handle)}</span>${reply ? '' : `<span class="sp-ago">· ${esc(p.ago)}</span>`}</div>
        ${a.bio && !reply ? `<div class="sp-bio">${esc(a.bio)}</div>` : ''}
        <div class="sp-text">${richText(p.text)}</div>
        ${reply ? '' : `<div class="sp-acts"><span title="Respuestas">${ICON.reply}${compact(p.replies)}</span><span title="Compartidos">${ICON.repost}${compact(p.reposts)}</span><span title="Me gusta">${ICON.like}${compact(p.likes)}</span></div>`}
        ${p.reply ? postHtml(p.reply, true) : ''}
      </div>
    </article>`;
  }
  // Lo último de las redes, en el resumen
  function socialCard() {
    const posts = st.social || [];
    if (!posts.length) return '<div></div>';
    const latest = posts.filter((p) => p.turn === posts[0].turn).slice(0, 5);
    return `<div class="card sp-feed sp-compact"><div class="card-h"><h3>En las redes</h3><button class="btn sm ghost" data-action="tab" data-tab="news">Ver más</button></div>
      ${latest.map((p) => postHtml(p)).join('')}</div>`;
  }
  function socialSection() {
    const posts = st.social || [];
    if (!posts.length) return '';
    const turns = [...new Set(posts.map((p) => p.turn))];
    const shown = ui.socialAll ? turns : turns.slice(0, 2);
    const blocks = shown.map((t) => {
      const list = posts.filter((p) => p.turn === t);
      return `<div class="sp-q">${dateLabel(list[0].year, list[0].quarter)}</div>${list.map((p) => postHtml(p)).join('')}`;
    }).join('');
    const more = turns.length > shown.length ? '<button class="btn sm ghost sp-more" data-action="social-more">Ver trimestres anteriores</button>' : '';
    const tr = window.Social.trends(st, S, M);
    return `<div class="section-title"><h2>En las redes</h2></div>
      <div class="social">
        <div class="card sp-feed">${blocks}${more}</div>
        <aside class="card sp-trends"><div class="card-h"><h3>Tendencias en España</h3></div>
          ${tr.map((x, i) => `<div class="sp-tr"><span class="faint small">${i + 1} · ${esc(x.note)}</span><b>${esc(x.tag)}</b></div>`).join('')}
          <div class="faint small sp-note">Cuentas, medios y políticos inventados.</div>
        </aside>
      </div>`;
  }


  // Anuncio tipo portada para los logros
  function herald(list) {
    const host = $('#heralds');
    list.slice(0, 3).forEach((a, i) => {
      const el = document.createElement('div');
      el.className = 'herald k-' + a.kind;
      el.style.animationDelay = (i * 0.25) + 's';
      el.innerHTML = `<div class="herald-top"><span>${KIND_LABEL[a.kind] || 'Última hora'}</span><span>${dateLabel(a.year, a.quarter)}</span></div>
        <div class="herald-h">${esc(a.title)}</div>
        ${a.text ? `<div class="herald-d">${esc(a.text)}</div>` : ''}
        <div class="herald-f">${ptsLabel(a.points)}${a.capital ? ` · +${a.capital} de capital político` : ''}</div>`;
      el.addEventListener('click', () => el.remove());
      host.appendChild(el);
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 7000 + i * 600);
    });
    if (list.length > 3) toast(`Y ${list.length - 3} logros más en Noticias`, 'good');
  }

  // ── Panel lateral ───────────────────────────────────────────
  function fxRow(target, amount, opts = {}) {
    const k = kindOf(target);
    const w = Math.min(50, (Math.abs(amount) / (opts.scale || 0.5)) * 50);
    const color = opts.color || (amount >= 0 ? 'var(--good)' : 'var(--bad)');
    const style = amount >= 0 ? `left:50%;width:${w}%` : `left:${50 - w}%;width:${w}%`;
    const delta = opts.delta != null && Math.abs(opts.delta) > 0.0005 ? `<span class="${opts.delta > 0 ? 'good' : 'bad'}">${signed(opts.delta * 100, 1)}</span>` : opts.right || '';
    return `<button class="fx ${opts.dim ? 'dim' : ''}" data-action="open" data-kind="${opts.kind || k}" data-id="${opts.id || target}">
      <span class="nm">${esc(opts.name || nameOf(target))}<span class="kind">${opts.kindLabel || (k === 'group' ? 'votantes' : '')}</span></span>
      <span class="fxbar"><b style="${style};background:${color}"></b></span>
      <span class="delta">${delta}</span></button>`;
  }

  function signColorForSim(target, amount) {
    const s = S.sims[target];
    if (!s || !s.good) return amount >= 0 ? 'var(--good)' : 'var(--bad)';
    const good = s.good === 'high' ? amount > 0 : amount < 0;
    return good ? 'var(--good)' : 'var(--bad)';
  }
  const closeBtn = '<button class="btn ghost icon dr-close" data-action="close-drawer" aria-label="Cerrar">✕</button>';

  function drawerPolicy(id) {
    const p = M.policyById[id], cur = st.policies[id];
    if (!ui.draft || ui.draft.id !== id) ui.draft = { id, active: cur.active, v: cur.v };
    const d = ui.draft;
    const cat = S.policyCats[p.cat];
    const partnerNotes = S.parties.filter((pt) => (pt.partner.demands || []).some((x) => x[0] === id)).map((pt) => {
      const dem = pt.partner.demands.find((x) => x[0] === id);
      const seats = st.seats[pt.id] || 0;
      return `<div class="note ${dem[2] < 0 ? 'bad' : ''}"><b>${esc(pt.name)}</b> (${seats} escaños) ${dem[2] > 0 ? `exige «${esc(E.levelLabel(p, dem[1]))}» o más para apoyarte.` : 'te retirará su apoyo si la aplicas.'}</div>`;
    }).join('');
    return `
      <div class="dr-head">${drawerNav()}
        <div class="eyebrow">${esc(cat.name)}</div>
        <h2>${esc(p.name)}</h2>
        ${closeBtn}
      </div>
      <div class="dr-body">
        <p class="muted" style="margin:0">${esc(p.desc)}</p>
        <div class="slider-box">
          <div class="row between"><span class="small muted">${cur.active ? 'Ahora: ' + esc(E.levelLabel(p, cur.v)) : 'No vigente'}</span></div>
          <div id="pol-live">${policyLive(id)}</div>
          <input type="range" min="0" max="100" step="1" value="${Math.round(d.v * 100)}" data-input="policy-v" aria-label="Nivel" ${d.active ? '' : 'disabled'} />
          ${p.levels ? `<div class="ticks">${p.levels.map((l) => `<span>${esc(l)}</span>`).join('')}</div>` : ''}
          <div class="row wrap" id="pol-actions">${policyActions(id)}</div>
        </div>
        ${partnerNotes ? `<div class="demands">${partnerNotes}</div>` : ''}
        <div id="pol-effects">${policyEffects(id)}</div>
      </div>`;
  }

  function policyLive(id) {
    const p = M.policyById[id], cur = st.policies[id], d = ui.draft;
    const cost = E.changeCost(st, S, id, d.active, d.v);
    const bNow = cur.active ? E.policyBudget(st, S, p, cur.v) : 0;
    const bNew = d.active ? E.policyBudget(st, S, p, d.v) : 0;
    const isRev = p.budget && p.budget[0] === 'rev';
    const bDelta = (bNew - bNow) * (isRev ? 1 : -1);
    return `
      <div class="lvl">${d.active ? esc(E.levelLabel(p, d.v)) : 'No vigente'}</div>
      ${p.budget ? `<div class="cost-line"><span class="muted">${isRev ? 'Recauda' : bNew < 0 ? 'Ahorra' : 'Cuesta'}</span><b>${eur(Math.abs(bNew))}/año</b></div>` : '<div class="cost-line"><span class="muted">Presupuesto</span><b class="faint">Sin coste directo</b></div>'}
      ${p.budget && Math.abs(bDelta) > 0.05 ? `<div class="cost-line"><span class="muted">Efecto del cambio</span><b class="${bDelta > 0 ? 'good' : 'bad'}">${bDelta > 0 ? '+' : '−'}${eur(Math.abs(bDelta))}/año</b></div>` : ''}
      <div class="cost-line"><span class="muted">Capital político</span><b class="${cost > st.capital ? 'bad' : ''}">${cost ? cost + ' de ' + Math.floor(st.capital) : '–'}</b></div>`;
  }

  function policyActions(id) {
    const p = M.policyById[id], cur = st.policies[id], d = ui.draft;
    const cost = E.changeCost(st, S, id, d.active, d.v);
    const can = cost <= st.capital;
    if (!cur.active && !E.policyAvailable(st, S, id)) return `<button class="btn" disabled>No disponible hasta ${p.availableFrom}</button>`;
    if (!cur.active && !d.active) return `<button class="btn primary" data-action="pol-draft-on">Aprobar…</button>`;
    if (!cur.active && d.active) return `<button class="btn primary" data-action="pol-apply" ${can ? '' : 'disabled'}>Aprobar (${cost})</button><button class="btn ghost" data-action="pol-reset">Cancelar</button>`;
    const changed = Math.abs(d.v - cur.v) >= 0.005;
    const abolishCost = E.changeCost(st, S, id, false, 0);
    return `<button class="btn primary" data-action="pol-apply" ${changed && can ? '' : 'disabled'}>${changed ? `Aplicar (${cost})` : 'Mueve el control para cambiarla'}</button>
      ${changed ? '<button class="btn ghost" data-action="pol-reset">Deshacer</button>' : ''}
      <button class="btn ghost danger" data-action="pol-abolish" ${abolishCost <= st.capital ? '' : 'disabled'}>Derogar (${abolishCost})</button>`;
  }

  function policyEffects(id) {
    const p = M.policyById[id], d = ui.draft, cur = st.policies[id];
    const prev = E.previewGroups(st, S, id, d.active, d.v);
    const showDelta = d.active !== cur.active || Math.abs(d.v - cur.v) >= 0.005;
    const sims = p._fx.filter((e) => kindOf(e.t) === 'sim').sort((a, b) => Math.abs(b.a) - Math.abs(a.a));
    const grps = p._fx.filter((e) => kindOf(e.t) === 'group').sort((a, b) => b.a - a.a);
    return `
      ${sims.length ? `<div><h3>Efectos en el país</h3><div class="fx-list">${sims.map((e) => fxRow(e.t, e.a, { color: signColorForSim(e.t, e.a), scale: 0.3, right: showDelta && Math.abs(prev[e.t]) > 0.0005 ? `<span class="${signColorForSim(e.t, prev[e.t]).includes('good') ? 'good' : 'bad'}">${prev[e.t] > 0 ? '▲' : '▼'}</span>` : '' })).join('')}</div></div>` : ''}
      ${grps.length ? `<div><h3>Reacción de los votantes</h3><div class="fx-list">${grps.map((e) => fxRow(e.t, e.a, { scale: 0.5, delta: showDelta ? prev[e.t] : null })).join('')}</div></div>` : ''}
      ${sizeOutputsHtml(id)}`;
  }

  const SIM_CAT_NAME = Object.fromEntries(SIM_CATS);
  function drawerSim(id) {
    const s = S.sims[id];
    const inputs = E.explain(st, S, id);
    const outs = E.outputs(S, 'sim', id);
    const t = simTone(id);
    const hist = st.history.sims[id] || [];
    const labels = st.history.polls.map((x) => shortLabel(x.label));
    const scale = Math.max(0.15, ...inputs.map((x) => Math.abs(x.amount)));
    const kindLbl = { policy: 'política', situation: 'situación', event: 'suceso' };
    return `
      <div class="dr-head">${drawerNav()}<div class="eyebrow">${esc(SIM_CAT_NAME[s.cat] || '')} · Indicador</div><h2>${esc(s.name)}</h2>${closeBtn}</div>
      <div class="dr-body">
        <div class="row" style="align-items:baseline;gap:10px"><span class="big-num" style="font-size:36px">${s.fmt(st.sims[id])}</span><span class="trend ${t.cls}">${t.arrow} en un año</span></div>
        <div class="faint small" style="margin-top:-12px">${esc(s.unit)}</div>
        <p class="muted" style="margin:0">${esc(s.desc)}</p>
        ${hist.length > 1 ? C.lineChart([{ label: '', color: toneColor(t.cls), values: hist.map((v) => v * 100), bold: true }], labels, { h: 140, padR: 10, yMin: Math.max(0, Math.min(...hist) * 100 - 5), yMax: Math.max(...hist) * 100 + 5, yFmt: () => '' }) : ''}
        ${inputs.length ? `<div><h3>Qué lo mueve</h3><div class="fx-list">${inputs.map((x) => fxRow(x.id, x.amount, { kind: x.kind, id: x.id, name: x.name, kindLabel: kindLbl[x.kind] || '', dim: !x.active, scale, color: signColorForSim(id, x.amount), right: x.active ? '' : '<span class="faint small">inactivo</span>' })).join('')}</div></div>` : ''}
        ${outs.length && !s.hidden ? `<div><h3>A qué afecta</h3><div class="fx-list">${outs.slice().sort((a, b) => Math.abs(b.a) - Math.abs(a.a)).map((e) => fxRow(e.t, e.a, { color: kindOf(e.t) === 'sim' ? signColorForSim(e.t, e.a) : undefined, scale: 0.5 })).join('')}</div></div>` : ''}
        ${sizeOutputsHtml(id)}
      </div>`;
  }

  function drawerGroup(id) {
    const g = S.groups[id];
    const inputs = E.explain(st, S, id);
    const gs = st.lastVote.groupStats[id];
    const h = st.groupHappy[id];
    const scale = Math.max(0.2, ...inputs.map((x) => Math.abs(x.amount)));
    const likes = inputs.filter((x) => x.amount > 0), dislikes = inputs.filter((x) => x.amount < 0);
    const kindLbl = { policy: 'política', situation: 'situación', event: 'suceso' };
    const row = (x) => fxRow(x.id, x.amount, { kind: x.kind, id: x.id, name: x.name, kindLabel: kindLbl[x.kind] || '', dim: !x.active, scale, right: x.active ? '' : '<span class="faint small">inactivo</span>' });
    return `
      <div class="dr-head">${drawerNav()}<div class="eyebrow">Grupo de votantes</div><h2>${esc(g.name)}</h2>${closeBtn}</div>
      <div class="dr-body">
        <div class="stat-row">
          <div class="stat"><div class="k">Ánimo</div><div class="v" style="color:${moodColor(h)}">${(h * 100).toFixed(0)}/100</div></div>
          <div class="stat"><div class="k">Tamaño</div><div class="v">${pct(gs.size, 1)} ${trendArrow(sizeTrend(id), 0.001)}</div></div>
          <div class="stat"><div class="k">Te votan</div><div class="v">${pct(gs.player, 0)}</div></div>
          <div class="stat"><div class="k">Persuadibles</div><div class="v">${pct(gs.swing || 0, 0)}</div></div>
          <div class="stat"><div class="k">Dudan</div><div class="v">${pct(gs.risk || 0, 0)}</div></div>
        </div>
        <p class="muted" style="margin:0">${esc(g.desc || '')}</p>
        ${C.lineChart([{ label: '', color: moodColor(h), values: (st.history.groups[id] || []).map((v) => v * 100), bold: true }], st.history.polls.map((x) => shortLabel(x.label)), { h: 120, padR: 10, yMin: 0, yMax: 100, refLine: 50, yFmt: (v) => nf(v, 0) })}
        ${likes.length ? `<div><h3>Qué les gusta</h3><div class="fx-list">${likes.map(row).join('')}</div></div>` : ''}
        ${dislikes.length ? `<div><h3>Qué les disgusta</h3><div class="fx-list">${dislikes.map(row).join('')}</div></div>` : ''}
        ${groupSizeHtml(id)}
      </div>`;
  }

  function sizeTrend(id, n = 4) {
    const h = (st.history.groupSize || {})[id] || [];
    if (h.length < 2) return 0;
    return h[h.length - 1] - h[Math.max(0, h.length - 1 - n)];
  }
  function groupSizeHtml(id) {
    const drivers = E.sizeDrivers(st, S, id);
    const h = (st.history.groupSize || {})[id] || [];
    const labels = st.history.polls.map((x) => shortLabel(x.label));
    const first = h[0], now = h[h.length - 1] || 0;
    const scale = Math.max(0.03, ...drivers.map((d) => Math.abs(d.contribution)));
    return `<div>
      <h3>Tamaño del grupo</h3>
      <div class="muted small" style="margin-bottom:6px">${pct(now, 1)} del electorado${first != null && h.length > 1 ? ` · ${pct(first, 1)} al principio (${signed((now - first) * 100, 1)} pts)` : ''}</div>
      ${h.length > 1 ? C.lineChart([{ label: '', color: 'var(--info)', values: h.map((v) => v * 100), bold: true }], labels, { h: 110, padR: 10, yMin: Math.max(0, Math.min(...h) * 100 - 1), yMax: Math.max(...h) * 100 + 1, yFmt: (v) => nf(v, 1) + ' %' }) : ''}
      ${drivers.length ? `<h3 style="margin-top:14px">Qué cambia su tamaño</h3>
      <div class="fx-list">${drivers.map((d) => fxRow(d.id, d.contribution, { kind: d.kind === 'time' ? 'none' : d.kind, id: d.id, name: d.name, kindLabel: d.kind === 'policy' ? 'política' : d.kind === 'time' ? 'tendencia' : '', scale, color: 'var(--info)', right: `<span class="small ${Math.abs(d.contribution) < 0.002 ? 'faint' : ''}">${signed(d.contribution * 100, 0)} %</span>` })).join('')}</div>` : ''}
    </div>`;
  }

  function drawerEvent(id) {
    const ev = E.activeEvents(st, S).find((e) => e.id === id);
    const e = M.eventById[id];
    const scale = Math.max(0.1, ...ev.fx.map((f) => Math.abs(f.a)));
    return `
      <div class="dr-head">${drawerNav()}<div class="eyebrow">Suceso · quedan ${quarters(ev.left)}</div><h2>${esc(ev.title)}</h2>${closeBtn}</div>
      <div class="dr-body">
        <p class="muted" style="margin:0">${esc(e ? e.text : '')}</p>
        ${ev.label ? `<div class="note">Tu decisión: <b>${esc(ev.label)}</b></div>` : ''}
        <div><h3>Efectos ahora</h3><div class="fx-list">${ev.fx.map((f) => fxRow(f.t, f.now, { color: kindOf(f.t) === 'sim' ? signColorForSim(f.t, f.now) : undefined, scale })).join('')}</div></div>
      </div>`;
  }

  function wageKpi() {
    const mac = st.lastBudget.macro, h = st.history.budget;
    if (!mac) return '';
    const real = h.map((x) => (x.avgWage || mac.avgWage) / (x.prices || 1));
    const d = real.length > 4 ? real[real.length - 1] / real[real.length - 5] - 1 : 0;
    const cls = Math.abs(d) < 0.002 ? 'faint' : d > 0 ? 'good' : 'bad';
    return `<button class="kpi" data-action="open" data-kind="wage" data-id="avgWage">
      <span class="k">Salario medio</span>
      <span class="v">${nf(mac.avgWage, 1)} mil € <span class="trend ${cls}">${cls === 'faint' ? '→' : d > 0 ? '↑' : '↓'}</span></span>
      <span class="faint small">por trabajador y año</span>
      ${C.sparkline(h.map((x) => x.avgWage || mac.avgWage), { color: toneColor(cls), w: 140, h: 26 })}
    </button>`;
  }

  function drawerWage() {
    const mac = st.lastBudget.macro, h = st.history.budget;
    const prices = st.priceLevel || 1;
    const real = mac.avgWage / prices;
    const labels = st.history.polls.map((x) => shortLabel(x.label));
    const wd = E.wageDrivers(st, S);
    const drivers = wd.items.filter((d) => Math.abs(d.c) >= 0.05);
    const scale = Math.max(1, ...drivers.map((d) => Math.abs(d.c)));
    const rw = S.sims.realWage;
    const affects = rw ? rw._fx.slice().sort((a, b) => b.a - a.a) : [];
    return `
      <div class="dr-head">${drawerNav()}<div class="eyebrow">Economía · Indicador</div><h2>Salario medio</h2>${closeBtn}</div>
      <div class="dr-body">
        <div class="stat-row">
          <div class="stat"><div class="k">Nominal</div><div class="v">${nf(mac.avgWage, 1)} mil €</div></div>
          <div class="stat"><div class="k">Real (€ de ${S.startYear})</div><div class="v">${nf(real, 1)} mil €</div></div>
          <div class="stat"><div class="k">Precios desde ${S.startYear}</div><div class="v">${signed((prices - 1) * 100, 1)} %</div></div>
        </div>
        ${h.length > 1 ? C.lineChart([
          { label: 'Nominal', color: 'var(--info)', values: h.map((x) => x.avgWage || mac.avgWage), bold: true },
          { label: 'Real', color: 'var(--good)', values: h.map((x) => (x.avgWage || mac.avgWage) / (x.prices || 1)) },
        ], labels, { h: 150, yMin: Math.min(...h.map((x) => (x.avgWage || mac.avgWage) / (x.prices || 1))) * 0.97, yFmt: (v) => nf(v, 0) + ' mil €', padR: 50 }) : ''}
        <div><h3>Qué lo mueve</h3>
          ${drivers.length ? `<div class="fx-list">${drivers.map((d) => fxRow(d.id, d.c, { kind: d.kind, id: d.id, name: d.name, kindLabel: d.kind === 'policy' ? 'política' : '', scale, right: `<span class="${d.c >= 0 ? 'good' : 'bad'}">${signed(d.c, 1)} %</span>` })).join('')}</div>` : '<div class="faint small">Sin cambios todavía.</div>'}
          <div class="faint small" style="margin-top:6px">Desde ${dateLabel(S.startYear, 1)}: ${signed(wd.total, 1)} %</div>
        </div>
        <div><h3>A qué afecta</h3><div class="fx-list">
          ${affects.map((e) => fxRow(e.t, e.a, { scale: 0.4 })).join('')}
          ${['incomeTax', 'socialContrib'].filter((pid) => M.policyById[pid]).map((pid) => fxRow(pid, 0.3, { kind: 'policy', id: pid, name: 'Recaudación: ' + M.policyById[pid].name, kindLabel: 'presupuesto', scale: 0.4, color: 'var(--good)' })).join('')}
        </div></div>
      </div>`;
  }

  function sizeOutputsHtml(srcId) {
    const outs = (M.sizeOutputs[srcId] || []).filter((o) => !S.groups[o.g].hidden);
    if (!outs.length) return '';
    return `<div><h3>Cambia el tamaño de</h3><div class="fx-list">${outs.sort((a, b) => Math.abs(b.a) - Math.abs(a.a)).map((o) => fxRow(o.g, o.a, { scale: 2, color: 'var(--info)', right: `<span class="faint small">${o.a > 0 ? 'crece' : 'mengua'}</span>` })).join('')}</div></div>`;
  }

  function drawerSituation(id) {
    const s = M.situationById[id];
    const on = st.situations[id];
    const trig = ['housing', 'water', 'growth', 'unemployment', 'tension', 'riskPremium', 'deficitRatio', 'tourism', 'energy', 'crime', 'birthrate', 'productivity', 'corruption'].find((k) => s.trigger({ ...st.sims, [k]: -999 }) === -999) || null;
    const ts = trig && S.sims[trig];
    return `
      <div class="dr-head">${drawerNav()}<div class="eyebrow">Situación · ${on ? (s.bad ? 'Crisis activa' : 'Activa') : 'Inactiva'}</div><h2>${esc(s.name)}</h2>${closeBtn}</div>
      <div class="dr-body">
        <p class="muted" style="margin:0">${esc(s.desc)}</p>
        ${ts && !ts.hidden ? `<button class="btn" data-action="open" data-kind="sim" data-id="${trig}">Ver ${esc(ts.name.toLowerCase())}: ${ts.fmt(st.sims[trig])} →</button>` : ''}
        <div><h3>Mientras dure</h3><div class="fx-list">${s._fx.map((e) => fxRow(e.t, e.a, { color: kindOf(e.t) === 'sim' ? signColorForSim(e.t, e.a) : undefined, scale: 0.25 })).join('')}${s.capital ? `<div class="small bad" style="padding:6px">${s.capital} de capital político por trimestre</div>` : ''}</div></div>
      </div>`;
  }

  function renderDrawer() {
    const el = $('#drawer');
    if (!ui.drawer) { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); return; }
    const { kind, id } = ui.drawer;
    if (kind === 'event' && !E.activeEvents(st, S).some((e) => e.id === id)) { ui.drawer = null; el.classList.remove('open'); return; }
    el.innerHTML = kind === 'policy' ? drawerPolicy(id) : kind === 'sim' ? drawerSim(id) : kind === 'group' ? drawerGroup(id) : kind === 'situation' ? drawerSituation(id) : kind === 'event' ? drawerEvent(id) : kind === 'wage' ? drawerWage() : '';
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
  }

  function drawerNav() {
    const back = ui.navIdx > 0, fwd = ui.navIdx < ui.nav.length - 1;
    const lbl = (n) => { if (!n) return ''; const o = n.kind === 'policy' ? M.policyById[n.id] : n.kind === 'sim' ? S.sims[n.id] : n.kind === 'group' ? S.groups[n.id] : n.kind === 'situation' ? M.situationById[n.id] : n.kind === 'wage' ? { name: 'Salario medio' } : M.eventById[n.id]; return o ? (o.name || o.title) : ''; };
    return `<div class="dr-nav"><button class="btn ghost icon sm" data-action="nav-back" ${back ? '' : 'disabled'} title="${back ? 'Volver a ' + esc(lbl(ui.nav[ui.navIdx - 1])) : 'Atrás'}" aria-label="Atrás">←</button><button class="btn ghost icon sm" data-action="nav-fwd" ${fwd ? '' : 'disabled'} title="${fwd ? 'Ir a ' + esc(lbl(ui.nav[ui.navIdx + 1])) : 'Adelante'}" aria-label="Adelante">→</button></div>`;
  }
  function navGo(delta) {
    const i = ui.navIdx + delta;
    if (i < 0 || i >= ui.nav.length) return;
    ui.navIdx = i;
    ui.drawer = Object.assign({}, ui.nav[i]);
    ui.draft = null;
    renderDrawer();
    $('#drawer').scrollTop = 0;
    if (ui.tab === 'policies') renderView();
  }
  function openDrawer(kind, id) {
    if (!['policy', 'sim', 'group', 'situation', 'event', 'wage'].includes(kind)) return;
    if (kind === 'event' && !E.activeEvents(st, S).some((e) => e.id === id)) return;
    if (kind === 'sim' && S.sims[id] && S.sims[id].drawer === 'wage') { kind = 'wage'; id = 'avgWage'; }
    else if (kind === 'sim' && S.sims[id] && S.sims[id].hidden) { ui.tab = 'budget'; ui.drawer = null; render(); return; }
    const cur = ui.nav[ui.navIdx];
    if (!ui.drawer || !cur || cur.kind !== kind || cur.id !== id) {
      if (!ui.drawer) { ui.nav = []; ui.navIdx = -1; }
      ui.nav = ui.nav.slice(0, ui.navIdx + 1);
      ui.nav.push({ kind, id });
      if (ui.nav.length > 40) ui.nav.shift();
      ui.navIdx = ui.nav.length - 1;
    }
    ui.drawer = { kind, id };
    if (kind !== 'policy') ui.draft = null;
    renderDrawer();
    $('#drawer').scrollTop = 0;
    if (ui.tab === 'policies') renderView();
  }

  // ── Render principal ────────────────────────────────────────
  function renderView() {
    const fns = { overview: viewOverview, policies: viewPolicies, indicators: viewIndicators, voters: viewVoters, parliament: viewParliament, budget: viewBudget, news: viewNews };
    $('#view').innerHTML = fns[ui.tab]();
  }
  function render() { renderHeader(); renderTabs(); renderView(); renderDrawer(); }

  // ── Ventanas ────────────────────────────────────────────────
  function modal(html, opts = {}) {
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal-wrap" ${opts.dismiss ? 'data-action="modal-bg"' : ''}><div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
    const f = root.querySelector('.modal button');
    if (f) f.focus({ preventScroll: true });
  }
  function closeModal() { $('#modal-root').innerHTML = ''; nextInQueue(); }
  function nextInQueue() { const next = ui.queue.shift(); if (next) next(); }

  function whyNote(id) {
    const w = st.lastEventWhy && st.lastEventWhy.id === id ? st.lastEventWhy.why : [];
    return w.length ? `<div class="note"><b>Factores:</b> ${w.map(esc).join('; ')}.</div>` : '';
  }
  function risksCard() {
    const risks = E.eventRisks(st, S).filter((r) => r.p >= 0.04).slice(0, 6);
    if (!risks.length) return '';
    return `<div class="card"><div class="card-h"><h3>Riesgos para el próximo trimestre</h3></div>
      <table class="tbl">${risks.map((r) => `<tr><td><b>${esc(r.title)}</b>${r.why.length ? `<div class="small muted">${r.why.map(esc).join(' · ')}</div>` : ''}</td>
        <td style="width:90px"><div class="bar"><b style="width:${Math.min(100, r.p * 250).toFixed(0)}%;background:${r.p > 0.15 ? 'var(--bad)' : 'var(--warn)'}"></b></div></td><td class="num small" style="width:44px">${Math.round(r.p * 100)} %</td></tr>`).join('')}</table></div>`;
  }

  function showDilemma() {
    const e = M.eventById[st.pendingDilemma];
    if (!e) return;
    modal(`
      <div class="modal-head"><div class="eyebrow">Hay que decidir · ${dateLabel(st.year, st.quarter)}</div><h2>${esc(e.title)}</h2></div>
      <div class="modal-body">
        <p style="margin:0">${esc(e.text)}</p>
        ${whyNote(e.id)}
        ${e.choices.map((c, i) => `<button class="choice" data-action="dilemma" data-i="${i}"><b>${esc(c.label)}</b><span class="muted small">${esc(c.desc || '')}</span>
          <span class="small faint">${[c.cost ? `Cuesta ${eur(c.cost)}` : '', c.capital ? `${c.capital} de capital` : ''].filter(Boolean).join(' · ')}</span></button>`).join('')}
      </div>`);
  }

  function showEvent(id) {
    const e = M.eventById[id];
    modal(`
      <div class="modal-head"><div class="eyebrow">Última hora · ${dateLabel(st.year, st.quarter)}</div><h2>${esc(e.title)}</h2></div>
      <div class="modal-body"><p style="margin:0">${esc(e.text)}</p>
        ${whyNote(id)}
        <div class="fx-list">${(e._fx || []).map((f) => fxRow(f.t, f.a, { color: kindOf(f.t) === 'sim' ? signColorForSim(f.t, f.a) : undefined, scale: 0.15 })).join('')}</div>
        <div class="faint small">${e.capital ? `${e.capital} de capital político.` : ''}${e.revenue ? ` ${e.revenue > 0 ? '+' : ''}${eur(e.revenue)} extraordinarios.` : ''}</div></div>
      <div class="modal-foot"><button class="btn primary" data-action="close-modal">Continuar</button></div>`);
  }

  function groupNames(fx, sign) {
    return E.parseFx(fx).filter((f) => (sign > 0 ? f.a > 0 : f.a < 0)).map((f) => (S.groups[f.t] ? S.groups[f.t].name : f.t)).join(', ');
  }
  function showCampaign() {
    if (!st.pendingCampaign) return;
    ui.camp = ui.camp && ui.camp.turn === st.turn ? ui.camp : { turn: st.turn, promises: [] };
    const c = ui.camp;
    const opts = E.campaignOptions(st, S);
    const settled = (st.promises || []).filter((p) => p.status !== 'open' && p.settledTurn != null && st.turn - p.settledTurn <= 1);
    const left = st.nextElectionTurn - st.turn;
    const scroll = $('#modal-root .modal') ? $('#modal-root .modal').scrollTop : 0;
    modal(`
      <div class="modal-head"><div class="eyebrow">Campaña electoral</div><h2>España vota en ${quarters(left)}</h2></div>
      <div class="modal-body">
        ${settled.length ? `<div><h3>Tu balance</h3><div class="goals">${settled.map((p) => `<div class="goal ${p.status === 'kept' ? 'done' : 'failed'}"><span class="goal-mark">${p.status === 'kept' ? '✓' : '✗'}</span><span class="goal-t">${esc(p.title)}</span><span class="goal-v small">${p.status === 'kept' ? 'Cumplida' : 'Incumplida'}</span></div>`).join('')}</div></div>` : ''}
        <div><div class="row between"><h3>Promesas</h3><span class="faint small">${c.promises.length} de 3</span></div>
          ${st.brokenPromises ? '<div class="note bad small" style="margin:6px 0">Los votantes recuerdan las promesas que incumpliste. Te creerán menos.</div>' : ''}
          <div class="promise-grid">${opts.map((p) => {
            const on = c.promises.includes(p.id);
            const plus = groupNames(p.groups, 1), minus = groupNames(p.groups, -1);
            return `<button class="promise" aria-pressed="${on}" data-action="camp-promise" data-id="${p.id}" ${!on && c.promises.length >= 3 ? 'disabled' : ''}>
              <span class="kind-tag">${p.keep ? 'Compromiso' : 'Objetivo'}</span>
              <b>${esc(p.title)}</b>
              <span class="small good">${esc(plus)}</span>${minus ? `<span class="small bad">${esc(minus)}</span>` : ''}</button>`;
          }).join('')}</div>
        </div>
      </div>
      <div class="modal-foot"><button class="btn primary" data-action="camp-launch">Arrancar la campaña</button></div>`, { wide: true });
    const m = $('#modal-root .modal'); if (m) m.scrollTop = scroll;
  }

  function showElection(r) {
    const prev = st.history.elections && st.history.elections.length > 1 ? st.history.elections[st.history.elections.length - 2].seats : null;
    const order = orderedParties(r.seats).sort((a, b) => b.n - a.n);
    const inv = r.invest;
    const title = r.outcome === 'won' ? (r.seats.player >= S.majority ? 'Mayoría absoluta' : 'Sigues en La Moncloa') : r.outcome === 'hung' ? 'Parlamento bloqueado' : 'Derrota';
    const VOTE = { yes: 'sí', no: 'no', abstain: 'abst.' };
    modal(`
      <div class="modal-head"><div class="eyebrow">Elecciones generales · ${dateLabel(r.year, r.quarter)}</div><h2>${title}</h2></div>
      <div class="modal-body">
        <div class="grid g2" style="align-items:center">
          <div>${hemi(r.seats, { w: 380 })}</div>
          <table class="tbl"><thead><tr><th>Partido</th><th class="num">Voto</th><th class="num">Escaños</th></tr></thead><tbody>
          ${order.map((p) => { const d = prev ? p.n - (prev[p.id] || 0) : null; return `<tr><td><span class="row"><i class="dot" style="background:${p.color}"></i>${esc(p.short)}</span></td><td class="num">${pct(r.shares[p.id] || 0)}</td><td class="num"><b>${p.n}</b> ${d ? `<span class="small ${d > 0 ? 'good' : 'bad'}">${signed(d, 0)}</span>` : ''}</td></tr>`; }).join('')}
          </tbody></table>
        </div>
        <div><h3>Investidura</h3>
          <div class="row wrap small" style="gap:6px 12px;margin:6px 0">${inv.detail.filter((d) => d.seats).map((d) => `<span class="vote-pill ${d.id === 'player' ? 'yes' : d.vote}">${esc(partyInfo(d.id).short)} ${d.seats} ${d.id === 'player' ? 'sí' : VOTE[d.vote]}</span>`).join('')}</div>
          <div class="muted small">Sí ${inv.yes} · No ${inv.no} · Abstención ${inv.abstain}. ${inv.success ? (inv.round === 1 ? 'Aprobada en primera votación por mayoría absoluta.' : 'Aprobada en segunda votación por mayoría simple.') : 'Rechazada.'}</div>
        </div>
        <div class="muted small">Participación: ${pct(r.turnout, 0)}.</div>
        ${r.analysis ? `<div style="border-top:1px solid var(--line);padding-top:14px"><h2 style="font-size:19px;margin-bottom:10px">Por qué este resultado</h2>${analysisHtml(r.analysis, { compact: true, max: 6 })}</div>` : ''}
      </div>
      <div class="modal-foot"><button class="btn primary" data-action="close-modal">${r.outcome === 'won' ? 'Formar gobierno' : r.outcome === 'hung' ? 'Volver a la campaña' : 'Continuar'}</button></div>`, { wide: true });
  }

  function showGameOver() {
    const g = st.gameOver;
    modal(`
      <div class="modal-head"><div class="eyebrow">Fin de la partida · ${dateLabel(st.year, st.quarter)}</div><h2>${esc(g.title)}</h2></div>
      <div class="modal-body"><p style="margin:0">${esc(g.text)}</p>
        <div class="stat-row">
          <div class="stat"><div class="k">En el poder</div><div class="v">${nf(st.turn / 4, 1)} años</div></div>
          <div class="stat"><div class="k">Elecciones ganadas</div><div class="v">${st.electionsWon}</div></div>
          <div class="stat"><div class="k">Puntos</div><div class="v">${st.score || 0}</div></div>
          <div class="stat"><div class="k">Logros</div><div class="v">${(st.achievements || []).length}</div></div>
          <div class="stat"><div class="k">Deuda final</div><div class="v">${pct(st.debt / st.gdp, 0)}</div></div>
          <div class="stat"><div class="k">Paro</div><div class="v">${S.sims.unemployment.fmt(st.sims.unemployment)}</div></div>
        </div></div>
      <div class="modal-foot"><button class="btn" data-action="close-modal">Cerrar</button><button class="btn primary" data-action="new-game">Nueva partida</button></div>`);
  }

  function showHelp() {
    modal(`
      <div class="modal-head"><div class="eyebrow">Cómo se juega</div><h2>Gobernar España</h2></div>
      <div class="modal-body muted">
        <p style="margin:0">Presides un gobierno en minoría. Cada turno es un trimestre y una legislatura dura cuatro años.</p>
        <p style="margin:0">Cambia las políticas para transformar el país. Cada cambio cuesta capital político, que ganas cada trimestre.</p>
        <p style="margin:0">Mantén contentos a los votantes, a tus socios en el Congreso y las cuentas bajo control.</p>
        <p style="margin:0">Si pierdes las elecciones o una moción de censura, se acaba la partida.</p>
        <p class="small faint" style="margin:8px 0 0">La partida se guarda solo en este navegador. ¿Ideas o errores? Escríbenos a <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
      </div>
      <div class="modal-foot"><button class="btn primary" data-action="close-modal">Entendido</button></div>`, { dismiss: true });
  }

  function showMenu() {
    const ex = $('.menu');
    if (ex) { ex.remove(); return; }
    const m = document.createElement('div');
    m.className = 'menu';
    m.innerHTML = `<button data-action="new-game-confirm">Nueva partida…</button><button data-action="theme">Modo claro u oscuro</button><button data-action="export">Descargar la partida</button><button data-action="import">Cargar una partida…</button><a class="menu-link" href="mailto:${CONTACT}">Contacto: ${CONTACT}</a><a class="menu-link" href="https://regalitogames.com/" target="_blank" rel="noopener">Más juegos de Regalito Games ↗</a>`;
    document.body.appendChild(m);
    setTimeout(() => document.addEventListener('click', function off(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('click', off); } }), 0);
  }

  // ── Pantalla de inicio ──────────────────────────────────────
  const CONTACT = 'hello@regalitogames.com';
  function siteFooter() {
    return `<footer class="site-foot">
      <span>Un juego de <a href="https://regalitogames.com/" target="_blank" rel="noopener">Regalito Games</a></span>
      <span>Contacto: <a href="mailto:${CONTACT}">${CONTACT}</a></span>
      <span>Partidos, personajes y medios ficticios. La partida se guarda solo en tu navegador. Sin cookies: solo contamos cuántas visitas llegan, sin saber quién eres.</span>
    </footer>`;
  }
  const COLORS = ['#d7263d', '#b0233a', '#7a2ea8', '#e4572e', '#e89f00', '#119da4', '#2a9d3f', '#ff6f91', '#1f5ea8', '#2a4d8f', '#c08b00'];
  const DIFF = { easy: 'Fácil', normal: 'Normal', hard: 'Difícil' };
  function showStart() {
    $('#app').hidden = true;
    const saved = store.get();
    const cfg = { name: BASE.playerDefaults.name, short: BASE.playerDefaults.short, leader: '', color: COLORS[0], difficulty: 'normal', preset: 'reality' };
    const root = $('#modal-root');
    const draw = () => {
      root.innerHTML = `<div class="start"><div class="start-card">
        <div>
          <h1>La Moncloa</h1>
          <p class="tag">Un simulador político. Eres el presidente del Gobierno de España.</p>
          <h3 class="start-h">Escenario</h3>
          <div class="presets">${BASE.presets.map((p) => `<button class="preset" aria-pressed="${cfg.preset === p.id}" data-action="cfg-preset" data-p="${p.id}">
            <span class="row between"><b>${esc(p.name)}</b><span class="faint small">${p.id === 'random' ? '' : p.year}</span></span>
            <span class="local">${esc(p.difficulty)}</span>
            <span class="small muted">${esc(p.desc)}</span></button>`).join('')}</div>
        </div>
        <div class="card form">
          ${saved && saved.version === 3 && !saved.gameOver ? `<button class="btn primary" data-action="continue">Continuar: ${esc(saved.player.name)}, ${dateLabel(saved.year, saved.quarter)}</button>` : ''}
          <div class="field"><label for="f-name">Nombre del partido</label><input id="f-name" type="text" maxlength="40" value="${esc(cfg.name)}" data-cfg="name"></div>
          <div class="row" style="gap:10px">
            <div class="field" style="width:110px"><label for="f-short">Siglas</label><input id="f-short" type="text" maxlength="5" value="${esc(cfg.short)}" data-cfg="short"></div>
            <div class="field" style="flex:1"><label for="f-leader">Tu nombre</label><input id="f-leader" type="text" maxlength="40" placeholder="Por ejemplo, Carmen Ortega" value="${esc(cfg.leader)}" data-cfg="leader"></div>
          </div>
          <div class="field"><label>Ideología</label><div class="opt-grid c5">${BASE.positions.lr.map((o) => `<button aria-pressed="${cfg.posLr === o.id}" data-action="cfg-pos" data-axis="posLr" data-v="${o.id}" title="${esc(o.desc || '')}">${esc(o.name)}</button>`).join('')}</div></div>
          <div class="field"><label>Modelo territorial</label><div class="opt-grid c3">${BASE.positions.cen.map((o) => `<button aria-pressed="${cfg.posCen === o.id}" data-action="cfg-pos" data-axis="posCen" data-v="${o.id}" title="${esc(o.desc || '')}">${esc(o.name)}</button>`).join('')}</div></div>
          ${positionSummary(cfg)}
          <div class="field"><label>Color del partido</label><div class="swatches">${COLORS.map((c) => `<button class="swatch" style="background:${c}" aria-label="Color ${c}" aria-pressed="${cfg.color === c}" data-action="cfg-color" data-c="${c}"></button>`).join('')}</div></div>
          <div class="field"><label>Dificultad</label><div class="seg">${['easy', 'normal', 'hard'].map((d) => `<button aria-pressed="${cfg.difficulty === d}" data-action="cfg-diff" data-d="${d}">${DIFF[d]}</button>`).join('')}</div></div>
          <button class="btn primary" data-action="start" style="padding:12px">Empezar</button>
        </div>
      </div>${siteFooter()}</div>`;
    };
    draw();
    ui.startCfg = cfg;
    ui.redrawStart = draw;
    applyAccent(cfg.color);
  }

  // El color del partido tiñe la interfaz
  function applyAccent(color) {
    const r = document.documentElement.style;
    if (!color) { r.removeProperty('--accent'); r.removeProperty('--accent-ink'); r.removeProperty('--accent-text'); return; }
    const n = parseInt(color.slice(1), 16), R = (n >> 16) & 255, G = (n >> 8) & 255, B = n & 255;
    const lum = (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255;
    r.setProperty('--accent', color);
    r.setProperty('--accent-ink', lum > 0.6 ? '#141414' : '#ffffff');
    r.setProperty('--accent-text', lum > 0.55 ? 'var(--ink)' : color);
  }

  function previewScenario(cfg) {
    return E.deriveScenario(BASE, cfg.preset || 'reality', 1, cfg.posLr || cfg.posCen ? { lr: cfg.posLr || null, cen: cfg.posCen || null } : null);
  }
  function positionSummary(cfg) {
    const X = previewScenario(cfg);
    const pd = X.playerDefaults;
    const side = pd.lr <= -0.5 ? 'De izquierda' : pd.lr <= -0.15 ? 'De centroizquierda' : pd.lr < 0.15 ? 'De centro' : pd.lr < 0.6 ? 'De centroderecha' : 'De derecha';
    const terr = pd.cen >= 0.6 ? 'centralista' : pd.cen <= -0.25 ? 'autonomista' : 'moderado en lo territorial';
    const rival = X.parties.slice().sort((a, b) => b.target - a.target)[0];
    return `<div class="faint small">${side} y ${terr}. Rival principal: ${esc(rival.name)}.</div>`;
  }

  function startGame(cfg) {
    $('#modal-root').innerHTML = '';
    useScenario(cfg.preset || 'reality', Math.floor(Math.random() * 2 ** 31), cfg.posLr || cfg.posCen ? { lr: cfg.posLr || null, cen: cfg.posCen || null } : null);
    st = E.newGame(S, { partyName: cfg.name || S.playerDefaults.name, partyShort: (cfg.short || 'TÚ').toUpperCase(), color: cfg.color, leader: cfg.leader || 'El presidente', difficulty: cfg.difficulty });
    applyAccent(st.player.color);
    window.Social.update(st, S, M, {}, { opening: true });
    ui.tab = 'overview'; ui.drawer = null; ui.draft = null;
    save();
    $('#app').hidden = false;
    render();
    showHelp();
  }

  function loadGame(saved) {
    useScenario(saved.presetId || 'reality', saved.presetSeed || 0, saved.presetPos || null);
    st = E.restore(S, saved);
    st.pendingInvestiture = false;
    if (!st.social) window.Social.update(st, S, M, {}, {});
    applyAccent(st.player.color);
    $('#modal-root').innerHTML = '';
    $('#app').hidden = false;
    render();
    if (st.pendingDilemma) showDilemma();
    else if (st.pendingCampaign) showCampaign();
  }

  function syncPartyDefaults() {
    if (ui.startCfg.nameEdited) return;
    const pd = previewScenario(ui.startCfg).playerDefaults;
    Object.assign(ui.startCfg, { name: pd.name, short: pd.short, color: pd.color });
    applyAccent(ui.startCfg.color);
  }

  // ── Turno ───────────────────────────────────────────────────
  function nextTurn() {
    if (st.gameOver) { showGameOver(); return; }
    if (st.pendingDilemma) { showDilemma(); return; }
    if (st.pendingCampaign) { showCampaign(); return; }
    const btn = $('#btn-next');
    btn.disabled = true;
    const rep = E.step(st, S);
    window.Social.update(st, S, M, rep);
    ui.draft = null;
    save();
    render();
    btn.disabled = !!st.gameOver;
    rep.situations.forEach((s) => {
      const sit = M.situationById[s.id];
      if (sit.bad && s.on) toast(`Comienza: <b>${esc(sit.name)}</b>`, 'bad');
      if (!sit.bad && !s.on) toast(`Se acaba: <b>${esc(sit.name)}</b>`, 'bad');
    });
    (rep.unlocked || []).forEach((id) => toast(`Nueva opción: <b>${esc(M.policyById[id].name)}</b>`));
    const wins = (rep.achievements || []).filter((a) => a.kind !== 'win');
    if (wins.length) herald(wins);
    const q = [];
    rep.events.forEach((e) => q.push(() => (e.dilemma ? showDilemma() : showEvent(e.id))));
    if (rep.election) q.push(() => showElection(rep.election));
    if (rep.campaign && !rep.election) q.push(() => showCampaign());
    if (rep.election && st.pendingCampaign) q.push(() => showCampaign());
    if (st.gameOver) q.push(() => showGameOver());
    ui.queue = q;
    nextInQueue();
  }

  // ── Eventos de la interfaz ──────────────────────────────────
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-action]');
    if (!t) return;
    switch (t.dataset.action) {
      case 'tab': ui.tab = t.dataset.tab; render(); window.scrollTo({ top: 0 }); break;
      case 'open': openDrawer(t.dataset.kind, t.dataset.id); break;
      case 'close-drawer': ui.drawer = null; ui.draft = null; renderDrawer(); if (ui.tab === 'policies') renderView(); break;
      case 'nav-back': navGo(-1); break;
      case 'nav-fwd': navGo(1); break;
      case 'map-mode': MAP.mode = t.dataset.m; renderView(); break;
      case 'social-more': ui.socialAll = true; renderView(); break;
      case 'news-all': ui.newsAll = t.dataset.v === '1'; renderView(); break;
      case 'cfg-preset': ui.startCfg.preset = t.dataset.p; syncPartyDefaults(); ui.redrawStart(); break;
      case 'cfg-pos': ui.startCfg[t.dataset.axis] = ui.startCfg[t.dataset.axis] === t.dataset.v ? '' : t.dataset.v; syncPartyDefaults(); ui.redrawStart(); break;
      case 'next': nextTurn(); break;
      case 'help': showHelp(); break;
      case 'menu': ev.stopPropagation(); showMenu(); break;
      case 'pol-draft-on': ui.draft.active = true; if (ui.draft.v < 0.05) ui.draft.v = 0.5; renderDrawer(); break;
      case 'pol-reset': ui.draft = null; renderDrawer(); break;
      case 'pol-apply': {
        const d = ui.draft;
        const r = E.applyPolicy(st, S, d.id, d.active, d.v);
        if (!r.ok) { toast(r.reason, 'bad'); break; }
        toast(`<b>${esc(M.policyById[d.id].name)}</b> actualizada · −${r.cost} de capital`);
        ui.draft = null; save(); render();
        break;
      }
      case 'pol-abolish': {
        const id = ui.drawer.id;
        const r = E.applyPolicy(st, S, id, false, 0);
        if (!r.ok) { toast(r.reason, 'bad'); break; }
        toast(`<b>${esc(M.policyById[id].name)}</b> derogada · −${r.cost} de capital`);
        ui.draft = null; save(); render();
        break;
      }
      case 'dilemma': E.resolveDilemma(st, S, +t.dataset.i); save(); render(); closeModal(); break;
      case 'camp-promise': { const c = ui.camp; const id = t.dataset.id; c.promises = c.promises.includes(id) ? c.promises.filter((x) => x !== id) : c.promises.concat(id).slice(0, 3); showCampaign(); break; }
      case 'camp-launch': E.launchCampaign(st, S, ui.camp); ui.camp = null; save(); render(); toast('Arranca la campaña'); closeModal(); break;
      case 'close-modal': closeModal(); break;
      case 'modal-bg': if (ev.target === t) closeModal(); break;
      case 'snap': {
        const r = E.callSnapElection(st, S);
        if (!r.ok) toast(r.reason, 'bad'); else { toast('Cortes disueltas. Elecciones el próximo trimestre.'); save(); render(); showCampaign(); }
        break;
      }
      case 'continue': loadGame(store.get()); break;
      case 'start': startGame(ui.startCfg); break;
      case 'cfg-color': ui.startCfg.color = t.dataset.c; applyAccent(t.dataset.c); ui.redrawStart(); break;
      case 'cfg-diff': ui.startCfg.difficulty = t.dataset.d; ui.redrawStart(); break;
      case 'new-game': store.clear(); ui.queue = []; showStart(); break;
      case 'new-game-confirm': $('.menu') && $('.menu').remove(); if (confirm('¿Abandonar este gobierno y empezar una partida nueva?')) { store.clear(); ui.drawer = null; showStart(); } break;
      case 'theme': {
        const r = document.documentElement;
        const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
        r.dataset.theme = dark ? 'light' : 'dark';
        try { localStorage.setItem('moncloa-theme', r.dataset.theme); } catch (e) { /* nada */ }
        $('.menu') && $('.menu').remove();
        break;
      }
      case 'export': {
        const blob = new Blob([JSON.stringify(E.serialise(st))], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `moncloa-${st.year}-T${st.quarter}.json`; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        $('.menu') && $('.menu').remove();
        break;
      }
      case 'import': {
        $('.menu') && $('.menu').remove();
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'application/json';
        inp.onchange = () => {
          const f = inp.files[0]; if (!f) return;
          f.text().then((txt) => { try { const data = JSON.parse(txt); if (data.version !== 3) throw new Error('old'); loadGame(data); save(); toast('Partida cargada'); } catch (e) { toast('Ese archivo no es una partida válida', 'bad'); } });
        };
        inp.click();
        break;
      }
      default: break;
    }
  });

  document.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.dataset.cfg) { ui.startCfg[t.dataset.cfg] = t.value; if (t.dataset.cfg !== 'leader') ui.startCfg.nameEdited = true; return; }
    if (t.dataset.input === 'filter') {
      ui.filter = t.value;
      const pos = t.selectionStart;
      renderView();
      const n = $('.search'); n.focus(); n.setSelectionRange(pos, pos);
      return;
    }
    if (t.dataset.input === 'policy-v' && ui.draft) {
      ui.draft.v = +t.value / 100;
      $('#pol-live').innerHTML = policyLive(ui.draft.id);
      $('#pol-actions').innerHTML = policyActions(ui.draft.id);
      $('#pol-effects').innerHTML = policyEffects(ui.draft.id);
    }
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      if ($('#modal-root .modal-wrap[data-action="modal-bg"]')) closeModal();
      else if (ui.drawer) { ui.drawer = null; ui.draft = null; renderDrawer(); if (ui.tab === 'policies') renderView(); }
    }
  });

  // ── Visitas ─────────────────────────────────────────────────
  // Un aviso por cada carga de la página, con la etiqueta de campaña del enlace
  // (utm_content, si no utm_campaign, si no utm_source). Lo cuenta el contador
  // de Regalito Games: un día, un evento, una etiqueta y un número. Nada se
  // guarda en el dispositivo del jugador ni se sabe quién es. Solo en la web
  // publicada, para que las pruebas en local no cuenten.
  function countVisit() {
    if (location.hostname !== 'elecciones.regalitogames.com') return;
    try {
      const q = new URLSearchParams(location.search);
      const tag = (q.get('utm_content') || q.get('utm_campaign') || q.get('utm_source') || '').slice(0, 40) || null;
      const body = JSON.stringify({ event: 'moncloa', tag });
      const url = 'https://regalitogames.com/api/tick';
      if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }));
      else fetch(url, { method: 'POST', body, mode: 'no-cors', keepalive: true }).catch(() => {});
    } catch (e) { /* una cifra nunca debe romper el juego */ }
  }

  // ── Arranque ────────────────────────────────────────────────
  countVisit();
  try { const th = localStorage.getItem('moncloa-theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) { /* nada */ }
  const saved = store.get();
  if (saved && saved.version === 3 && !saved.gameOver && saved.scenario === S.id && new URLSearchParams(location.search).has('continue')) loadGame(saved);
  else showStart();
})();
