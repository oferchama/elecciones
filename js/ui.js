/* La Moncloa: user interface */
(function () {
  'use strict';
  const E = window.Engine, C = window.Charts;
  const BASE = window.SCENARIOS.spain;
  let S = BASE, M = E.model(S);
  function useScenario(presetId, seed, pos) { S = E.deriveScenario(BASE, presetId, seed, pos); M = E.model(S); }
  const SAVE_KEY = 'moncloa-save-v1';

  let st = null;
  const ui = { tab: 'overview', drawer: null, draft: null, filter: '', queue: [], nav: [], navIdx: -1 };

  // ── Helpers ─────────────────────────────────────────────────
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pct = (x, d = 1) => (x * 100).toFixed(d) + '%';
  const eur = (x) => { const a = Math.abs(x), sg = x < 0 ? '−' : ''; if (a > 0 && a < 0.95) return sg + '€' + (a * 1000).toFixed(a < 0.1 ? 1 : 0).replace(/\.0$/, '') + 'M'; return sg + '€' + a.toFixed(a >= 100 ? 0 : 1) + 'bn'; };
  const signed = (x, d = 1) => (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x).toFixed(d);
  const nameOf = (id) => (S.sims[id] ? S.sims[id].name : S.groups[id] ? S.groups[id].name : id);
  const kindOf = (id) => (S.sims[id] ? 'sim' : S.groups[id] ? 'group' : null);
  const partyInfo = (id) => (id === 'player' ? { id, name: st.player.name, short: st.player.short, color: st.player.color } : S.parties.find((p) => p.id === id));
  const dateLabel = (y, q) => `Q${q} ${y}`;
  const moodColor = (h) => (h < 0.38 ? 'var(--bad)' : h < 0.47 ? 'var(--warn)' : 'var(--good)');
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return null; } },
    set(v) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(v)); } catch (e) { /* storage may be unavailable */ } },
    clear() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } },
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
  const trendArrow = (d, eps = 0.005, mult = 100, dec = 1) => (Math.abs(d) < eps ? '<span class="trend faint">→</span>' : `<span class="trend ${d > 0 ? 'up' : 'down'}">${d > 0 ? '▲' : '▼'} ${Math.abs(d * mult).toFixed(dec)}</span>`);
  const toneColor = (cls) => (cls === 'good' ? 'var(--good)' : cls === 'bad' ? 'var(--bad)' : 'var(--ink-3)');

  function meter(p, ps) {
    if (!ps.active && p.availableFrom && st.year < p.availableFrom) return `<span class="meter off">From ${p.availableFrom}</span>`;
    if (!ps.active) return `<span class="meter off">Not in force</span>`;
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

  // ── Header ──────────────────────────────────────────────────
  function renderHeader() {
    const v = st.lastVote;
    const b = st.lastBudget;
    const left = st.nextElectionTurn - st.turn;
    const P = st.history.polls;
    const dp = P.length > 1 ? P[P.length - 1].shares.player - P[P.length - 2].shares.player : 0;
    $('#hdr-party').textContent = `${st.player.leader} · ${st.player.name}`;
    $('#hdr-stats').innerHTML = `
      <div class="chip"><span class="k">Date</span><span class="v">${dateLabel(st.year, st.quarter)}</span></div>
      <div class="chip" data-action="tab" data-tab="parliament" title="Your national vote intention"><span class="k">Polls</span><span class="v">${pct(v.shares.player)} <span class="trend ${dp >= 0 ? 'good' : 'bad'}">${dp >= 0 ? '▲' : '▼'}</span></span></div>
      <div class="chip opt" data-action="tab" data-tab="voters" title="Share of voters broadly satisfied with the government"><span class="k">Approval</span><span class="v">${pct(v.approval, 0)}</span></div>
      <div class="chip opt" data-action="tab" data-tab="news" title="Points from goals, milestones and elections"><span class="k">Score</span><span class="v">${st.score || 0}</span></div>
      <div class="chip" title="Political capital: spend it to change policies. Income: +${st.capitalIncome || '…'}/quarter"><span class="k">Capital</span><span class="v">${Math.floor(st.capital)}</span></div>
      <div class="chip opt" data-action="tab" data-tab="budget" title="Annual budget ${b.deficit >= 0 ? 'deficit' : 'surplus'}"><span class="k">${b.deficit >= 0 ? 'Deficit' : 'Surplus'}</span><span class="v ${b.deficit / st.gdp > 0.03 ? 'bad' : b.deficit < 0 ? 'good' : ''}">${eur(Math.abs(b.deficit))} <span class="sub">${pct(Math.abs(b.deficit) / st.gdp)}</span></span></div>
      <div class="chip opt" data-action="tab" data-tab="budget"><span class="k">Debt</span><span class="v">${pct(st.debt / st.gdp, 0)}</span></div>
      <div class="chip" data-action="tab" data-tab="parliament"><span class="k">Election</span><span class="v ${left <= 2 ? 'warn' : ''}">${left <= 0 ? 'Now' : left === 1 ? 'Next qtr' : left + ' qtrs'}</span></div>`;
    $('#btn-next').disabled = !!st.gameOver;
  }

  const TABS = [
    ['overview', 'Overview'], ['policies', 'Policies'], ['indicators', 'Country'], ['voters', 'Voters'],
    ['parliament', 'Parliament'], ['budget', 'Budget'], ['regions', 'Regions'], ['news', 'News'],
  ];
  function renderTabs() {
    const bad = S.situations.filter((s) => s.bad && st.situations[s.id]).length;
    $('#tabs').innerHTML = TABS.map(([id, label]) => `<button class="tab" role="tab" data-action="tab" data-tab="${id}" aria-selected="${ui.tab === id}">${label}${id === 'indicators' && bad ? `<span class="badge" title="Active crises">${bad}</span>` : ''}</button>`).join('');
  }

  // ── Views ───────────────────────────────────────────────────
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
      <button class="kpi" data-action="tab" data-tab="budget"><span class="k">Budget deficit</span><span class="v">${pct(st.lastBudget.deficit / st.gdp)}</span>${C.sparkline(bh.map((x) => x.deficit), { color: 'var(--ink-3)', w: 140, h: 26 })}</button>
      <button class="kpi" data-action="tab" data-tab="budget"><span class="k">Public debt</span><span class="v">${pct(st.debt / st.gdp, 0)}</span>${C.sparkline(bh.map((x) => x.debt), { color: 'var(--ink-3)', w: 140, h: 26 })}</button>`;
    const sits = S.situations.filter((s) => st.situations[s.id]);
    const groups = M.groupIds.filter((g) => !S.groups[g].hidden).map((g) => ({ g, h: st.groupHappy[g], size: v.groupStats[g].size })).filter((x) => x.size > 0.02);
    groups.sort((a, b) => a.h - b.h);
    const angry = groups.slice(0, 4), happy = groups.slice(-4).reverse();
    const grpRow = (x) => `<tr class="click" data-action="open" data-kind="group" data-id="${x.g}"><td>${esc(S.groups[x.g].name)}</td><td style="width:45%"><div class="mood"><div class="bar"><b style="width:${(x.h * 100).toFixed(0)}%;background:${moodColor(x.h)}"></b></div><span class="small num">${(x.h * 100).toFixed(0)}</span></div></td></tr>`;
    return `
      <div class="hero">
        <div class="card hero-main">
          <div class="row between wrap">
            <div>
              <div class="muted small">Vote intention · ${esc(st.player.name)}</div>
              <div class="row" style="align-items:baseline;gap:12px"><span class="big-num">${pct(v.shares.player)}</span><span class="muted">${proj.player} projected seats</span></div>
            </div>
            <div style="text-align:right">
              <div class="muted small">${left > 0 ? `General election in ${left} quarter${left > 1 ? 's' : ''}` : 'Election this quarter'}</div>
              <div class="row" style="justify-content:flex-end;gap:6px;margin-top:4px"><span class="vote-pill ${inv.success ? 'yes' : 'no'}">${inv.success ? 'Would be re-invested' : 'Would lose investiture'}</span><button class="btn sm ghost" data-action="tab" data-tab="parliament">Why?</button></div>
            </div>
          </div>
          ${pollChart(260)}
        </div>
        <div class="card">
          <div class="card-h"><h3>Projected Congress</h3><span class="faint small">${S.chamberSeats} seats · majority ${S.majority}</span></div>
          ${hemi(proj, { w: 420 })}
          ${legend(proj)}
        </div>
      </div>
      ${goalsCard()}
      <div class="section-title"><h2>State of the nation</h2></div>
      <div class="kpis">${kpis}${defs}</div>
      ${sits.length ? `<div class="section-title"><h2>Situations</h2></div><div class="sit-list">${sits.map((s) => `<button class="sit ${s.bad ? 'bad' : 'good'}" data-action="open" data-kind="situation" data-id="${s.id}">${esc(s.name)}</button>`).join('')}</div>` : ''}
      ${eventsSection()}
      <div class="grid g3" style="margin-top:24px">
        <div class="card"><div class="card-h"><h3>Angriest voters</h3></div><table class="tbl">${angry.map(grpRow).join('')}</table></div>
        <div class="card"><div class="card-h"><h3>Happiest voters</h3></div><table class="tbl">${happy.map(grpRow).join('')}</table></div>
        <div class="card"><div class="card-h"><h3>Latest news</h3><button class="btn sm ghost" data-action="tab" data-tab="news">All</button></div>${newsList(st.news.slice(0, 4))}</div>
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
    return C.lineChart(series, polls.map((x) => x.label.replace(' 20', " '")), { h, yMin: 0, yFmt: (v) => v.toFixed(0) + '%', aria: 'Poll history' });
  }

  function orderedParties(seats) {
    const pos = E.playerPosition(st, S);
    return E.allParties(S).map((p) => ({ ...partyInfo(p.id), lr: p.isPlayer ? pos.lr : p.lr, n: seats[p.id] || 0 })).filter((p) => p.n > 0).sort((a, b) => a.lr - b.lr);
  }
  function hemi(seats, opts = {}) {
    const parts = orderedParties(seats).map((p) => ({ id: p.id, color: p.color, n: p.n, label: p.short }));
    return C.hemicycle(parts, S.chamberSeats, { w: opts.w || 420, center: opts.center != null ? opts.center : String(seats.player || 0), centerSub: opts.centerSub || esc(st.player.short) + ' seats' });
  }
  function legend(seats) {
    return `<div class="legend">${orderedParties(seats).map((p) => `<span><i class="dot" style="background:${p.color}"></i>${esc(p.short)} <b>${p.n}</b></span>`).join('')}</div>`;
  }

  function newsList(items) {
    if (!items.length) return '<div class="faint">No news yet.</div>';
    return `<div class="news-list">${items.map((n) => `<div class="news ${n.kind}"><div class="when">${dateLabel(n.year, n.quarter)}</div><div><div class="t">${esc(n.title)}</div><div class="d">${esc(n.text)}</div></div></div>`).join('')}</div>`;
  }

  // ── Shared explanation widgets ──────────────────────────────
  function eventsSection() {
    const evs = E.activeEvents(st, S);
    if (!evs.length) return '';
    return `<div class="section-title"><h2>Current events</h2></div>
      <div class="sit-list">${evs.map((e) => `<button class="sit event" data-action="open" data-kind="event" data-id="${e.id}" title="${esc(e.label ? 'Your decision: ' + e.label : '')}">${esc(e.title)} <span class="faint small">· ${e.left} qtr${e.left > 1 ? 's' : ''} left</span></button>`).join('')}</div>`;
  }

  function targetsCard() {
    const gs = st.lastVote.groupStats;
    const ids = M.groupIds.filter((g) => !S.groups[g].hidden && gs[g].size > 0.01);
    const swing = ids.map((g) => ({ g, v: gs[g].size * (1 - gs[g].player) * gs[g].swing })).sort((a, b) => b.v - a.v).slice(0, 5);
    const risk = ids.map((g) => ({ g, v: gs[g].size * gs[g].player * gs[g].risk })).sort((a, b) => b.v - a.v).slice(0, 5);
    const angry = ids.map((g) => ({ g, v: gs[g].unhappyDefect || 0, over: (gs[g].unhappyDefect || 0) / gs[g].size })).filter((x) => x.v > 0.02).sort((a, b) => b.over - a.over).slice(0, 5);
    const row = (x, txt) => `<tr class="click" data-action="open" data-kind="group" data-id="${x.g}"><td>${esc(S.groups[x.g].name)}</td><td class="num small">${txt}</td></tr>`;
    return `<div class="card">
      <div class="card-h"><h3>Swing voters</h3></div>
      <div class="muted small">Could switch to you</div>
      <table class="tbl" style="margin-bottom:12px">${swing.map((x) => row(x, `${pct(x.v, 1)} of electorate`)).join('')}</table>
      <div class="muted small">Could leave you</div>
      <table class="tbl" style="margin-bottom:12px">${risk.map((x) => row(x, `${pct(x.v, 1)} of electorate`)).join('')}</table>
      ${angry.length ? `<div class="muted small">Most disaffected</div>
      <table class="tbl">${angry.map((x) => row(x, `${x.over.toFixed(1)}× their share`)).join('')}</table>` : ''}
    </div>`;
  }

  const moodPts = (x) => signed(x * 100, 1);
  function analysisHtml(a, opts = {}) {
    if (!a) return '<div class="faint">No previous election to compare with yet.</div>';
    const dShare = a.shareNow - a.shareBefore;
    const flows = (obj) => Object.entries(obj).filter(([, v]) => v > 0.001).sort((x, y) => y[1] - x[1]);
    const lost = flows(a.lost), gained = flows(a.gained);
    const flowList = (list, sign) => list.length ? list.map(([id, v]) => { const p = partyInfo(id); return `<span class="row small"><i class="dot" style="background:${p.color}"></i>${esc(p.short)} <b class="${sign > 0 ? 'good' : 'bad'}">${sign > 0 ? '+' : '−'}${(v * 100).toFixed(1)}</b></span>`; }).join('') : '<span class="faint small">none</span>';
    const dLr = a.posNow.lr - a.posBefore.lr, dCen = a.posNow.cen - a.posBefore.cen;
    const shifts = [];
    if (Math.abs(dLr) > 0.02) shifts.push(`moved ${dLr > 0 ? 'right' : 'left'} (${signed(dLr * 100, 0)})`);
    if (Math.abs(dCen) > 0.02) shifts.push(`became more ${dCen > 0 ? 'centralist' : 'pro-devolution'} (${signed(dCen * 100, 0)})`);
    const drivers = [
      ...a.topCauses.map((c) => ({ name: c.name, kind: c.kind, id: c.id, delta: c.delta })),
      { name: 'Government fatigue', kind: 'fatigue', delta: a.fatigueMood },
      { name: a.adaptation < 0 ? 'Voters got used to the good times' : 'Voters forgave past grievances', kind: 'adaptation', delta: a.adaptation },
    ].filter((d) => Math.abs(d.delta) > 0.0005).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)).slice(0, opts.max || 8);
    const scale = Math.max(0.01, ...drivers.map((d) => Math.abs(d.delta)));
    const kindLbl = { policy: 'policy', sim: '', situation: 'situation', event: 'event', fatigue: 'time in office', adaptation: '' };
    const groups = a.groups.slice().sort((x, y) => x.impact - y.impact);
    const losers = groups.filter((g) => g.impact < -0.001).slice(0, 4), winners = groups.filter((g) => g.impact > 0.001).reverse().slice(0, 3);
    const gRow = (g) => `<tr class="click" data-action="open" data-kind="group" data-id="${g.id}"><td>${esc(S.groups[g.id].name)}</td><td class="num small">${pct(g.supportBefore, 0)} → <b>${pct(g.supportNow, 0)}</b></td><td class="num small ${g.dMood >= 0 ? 'good' : 'bad'}">mood ${moodPts(g.dMood)}</td><td class="num small ${g.sizeNow >= g.sizeBefore ? '' : ''}">size ${pct(g.sizeBefore, 0)}→${pct(g.sizeNow, 0)}</td></tr>`;
    return `
      <div class="stat-row" style="margin-bottom:12px">
        <div class="stat"><div class="k">Your vote</div><div class="v">${pct(a.shareBefore)} → ${pct(a.shareNow)} <span class="small ${dShare >= 0 ? 'good' : 'bad'}">${signed(dShare * 100)}</span></div></div>
        <div class="stat"><div class="k">Avg. voter mood</div><div class="v">${(a.moodBefore * 100).toFixed(0)} → ${(a.moodNow * 100).toFixed(0)}</div></div>
        <div class="stat"><div class="k">Your position</div><div class="v small" style="font-size:13px">${shifts.length ? shifts.join(', ') : 'unchanged'}</div></div>
      </div>
      <div class="grid g2">
        <div>
          <h3>What changed voters' mood</h3>
          <div class="faint small" style="margin-bottom:6px">Since ${dateLabel(a.since.year, a.since.quarter)}</div>
          <div class="fx-list">${drivers.map((d) => fxRow(d.id || d.kind, d.delta, { kind: ['policy', 'sim', 'situation', 'event'].includes(d.kind) ? d.kind : 'none', id: d.id || '', name: d.name, kindLabel: kindLbl[d.kind] || '', scale, right: `<span class="${d.delta >= 0 ? 'good' : 'bad'}">${moodPts(d.delta)}</span>` })).join('') || '<div class="faint small">Nothing significant.</div>'}</div>
        </div>
        <div>
          <h3>Where your voters went</h3>
          <div class="small muted">Lost to</div><div class="row wrap" style="gap:4px 12px;margin:4px 0 8px">${flowList(lost, -1)}</div>
          <div class="small muted">Won from</div><div class="row wrap" style="gap:4px 12px;margin:4px 0 12px">${flowList(gained, 1)}</div>
          ${losers.length ? `<h3 style="margin-top:6px">Groups that cost you most</h3><table class="tbl">${losers.map(gRow).join('')}</table>` : ''}
          ${winners.length && !opts.compact ? `<h3 style="margin-top:12px">Groups you won over</h3><table class="tbl">${winners.map(gRow).join('')}</table>` : ''}
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
    const lvl = (p, x) => (x.active ? E.levelLabel(p, x.v) : 'Not in force');
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
        <td class="small">${simTxt || '<span class="faint">–</span>'}</td>
        <td class="small">${up.length ? '<span class="good">Pleased:</span> ' + gTxt(up) : ''}${up.length && down.length ? '<br>' : ''}${down.length ? '<span class="bad">Angered:</span> ' + gTxt(down) : ''}</td>
        <td class="num small ${bd > 0.0005 ? 'good' : bd < -0.0005 ? 'bad' : 'faint'}">${Math.abs(bd) < 0.0005 ? '–' : (bd > 0 ? '+' : '−') + eur(Math.abs(bd)) + '/yr'}</td>
        <td class="num small">${c.cost}</td></tr>`;
    }).join('');
    return `<div class="card" style="margin-bottom:16px">
      <div class="card-h"><h3>${isNow ? 'Changes this quarter' : 'Changes last quarter (' + dateLabel(list[0].year, list[0].quarter) + ')'}</h3>
        <span class="faint small">${list.length} polic${list.length > 1 ? 'ies' : 'y'} · ${totalCap} capital · budget ${Math.abs(totalBudget) < 0.0005 ? 'neutral' : (totalBudget > 0 ? '+' : '−') + eur(Math.abs(totalBudget)) + '/yr'}</span></div>
      <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Policy</th><th>Pushes indicators</th><th>Voter mood (points)</th><th class="num">Budget</th><th class="num">Capital</th></tr></thead><tbody>${rows}</tbody></table></div>
      
    </div>`;
  }

  function promisesCard() {
    const ps = st.promises || [];
    const kept = ps.filter((p) => p.status === 'kept').length, broken = ps.filter((p) => p.status === 'broken').length;
    const rows = ps.map((p) => {
      const c = E.promiseCheck(st, S, p);
      const mark = p.status === 'kept' ? '✓' : p.status === 'broken' ? '✗' : '';
      const info = p.status === 'open' ? (p.keep ? 'Pledge: do not break it' : esc(c.now) + ' <span class="faint">/ ' + esc(c.target) + '</span>') : p.status === 'kept' ? 'Kept' : 'Broken';
      return `<div class="goal ${p.status === 'kept' ? 'done' : p.status === 'broken' ? 'failed' : ''}"><span class="goal-mark">${mark}</span><span class="goal-t">${esc(p.title)}</span><span class="goal-v small">${info}</span></div>`;
    }).join('');
    const due = st.nextElectionTurn - st.turn;
    return `<div class="section-title"><h2>Your promises</h2><span class="faint small">${kept} kept · ${broken} broken · judged ${due > 0 ? 'in ' + due + ' quarters' : 'now'}</span></div><div class="goals">${rows}</div>`;
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
    return `<div class="section-title"><h2>Your mandate</h2><span class="faint small">${done} of ${goals.length} achieved · ${st.score || 0} points</span></div><div class="goals">${rows}</div>`;
  }

  function viewPolicies() {
    const f = ui.filter.trim().toLowerCase();
    const changed = new Set(st.changedThisTurn || []);
    const cats = Object.keys(S.policyCats).map((cid) => {
      const cat = S.policyCats[cid];
      const pols = S.policies.filter((p) => p.cat === cid && (!f || (p.name + ' ' + p.local + ' ' + p.desc).toLowerCase().includes(f)));
      if (!pols.length) return '';
      const spend = pols.reduce((a, p) => a + (p.budget && st.policies[p.id].active ? E.policyBudget(st, S, p, st.policies[p.id].v) * (p.budget[0] === 'rev' ? 0 : 1) : 0), 0);
      return `<div class="card pol-cat">
        <div class="card-h"><h3>${esc(cat.name)}</h3><span class="faint small">${spend > 0.5 ? eur(spend) + '/yr' : ''}</span></div>
        ${pols.map((p) => {
          const ps = st.policies[p.id];
          const sel = ui.drawer && ui.drawer.kind === 'policy' && ui.drawer.id === p.id;
          return `<button class="pol ${ps.active ? '' : 'off'} ${sel ? 'sel' : ''} ${changed.has(p.id) ? 'changed' : ''}" data-action="open" data-kind="policy" data-id="${p.id}">
            <span class="n">${esc(p.name)}</span>${meter(p, ps)}
            <span class="l">${esc(p.local)}${ps.active ? ' · ' + esc(E.levelLabel(p, ps.v)) : ''}</span>
          </button>`;
        }).join('')}
      </div>`;
    }).join('');
    return `
      <div class="toolbar">
        <input class="search" type="search" placeholder="Search policies… (e.g. housing, IRPF, nuclear)" value="${esc(ui.filter)}" data-input="filter" aria-label="Search policies" />
        <span class="muted small">Political capital: <b>${Math.floor(st.capital)}</b> · +${st.capitalIncome || '…'} per quarter</span>
      </div>
      ${changesCard()}
      <div class="pol-grid">${cats || '<div class="faint">No policies match.</div>'}</div>`;
  }

  function viewIndicators() {
    const cats = ['Economy', 'Society', 'Environment', 'World'];
    const sits = S.situations.filter((s) => st.situations[s.id]);
    return `
      ${sits.length ? `<div class="section-title"><h2>Active situations</h2></div><div class="sit-list">${sits.map((s) => `<button class="sit ${s.bad ? 'bad' : 'good'}" data-action="open" data-kind="situation" data-id="${s.id}">${esc(s.name)}</button>`).join('')}</div>` : ''}
      ${eventsSection()}
      ${cats.map((c) => {
        const ids = M.simIds.filter((id) => S.sims[id].cat === c && !S.sims[id].hidden);
        return `<div class="section-title"><h2>${c === 'World' ? 'Forces beyond your control' : c}</h2></div>
        <div class="kpis">${c === 'Economy' ? wageKpi() : ''}${ids.map((id) => {
          const s = S.sims[id], t = simTone(id);
          return `<button class="kpi" data-action="open" data-kind="sim" data-id="${id}">
            <span class="k">${esc(s.name)} <span class="faint">· ${esc(s.local)}</span></span>
            <span class="v">${s.fmt(st.sims[id])} <span class="trend ${t.cls}">${t.arrow}</span></span>
            <span class="faint small">${esc(s.unit)}</span>
            ${C.sparkline(st.history.sims[id], { color: toneColor(t.cls), w: 140, h: 26 })}
          </button>`;
        }).join('')}</div>`;
      }).join('')}
      <div class="section-title"><h2>Possible situations</h2></div>
      <div class="sit-list">${S.situations.filter((s) => !st.situations[s.id]).map((s) => `<button class="sit ${s.bad ? 'bad' : 'good'}" style="opacity:.55" data-action="open" data-kind="situation" data-id="${s.id}">${esc(s.name)}</button>`).join('')}</div>`;
  }

  function viewVoters() {
    const v = st.lastVote;
    const rows = M.groupIds.filter((g) => !S.groups[g].hidden).map((g) => ({ g, h: st.groupHappy[g], ...v.groupStats[g] })).filter((x) => x.size > 0.005).sort((a, b) => b.size - a.size);
    return `
      <div class="grid g3" style="margin-bottom:16px">
        <div class="card"><div class="muted small">Approval</div><div class="big-num">${pct(v.approval, 0)}</div></div>
        <div class="card"><div class="muted small">Expected turnout</div><div class="big-num">${pct(v.turnout, 0)}</div></div>
        <div class="card"><div class="muted small">Your position</div>${positionMap()}</div>
      </div>
      <div class="card">
        <div class="card-h"><h3>Voter groups</h3><span class="faint small">Trends: last 12 months</span></div>
        <div style="overflow-x:auto"><table class="tbl">
          <thead><tr><th>Group</th><th class="num">Size</th><th class="num">Size trend</th><th style="min-width:150px">Mood</th><th class="num">Mood trend</th><th class="num">Vote you</th><th class="num" title="Non-supporters close to switching to you">Persuadable</th></tr></thead>
          <tbody>${rows.map((x) => {
            const h = st.history.groups[x.g] || [];
            const prev = h.length > 4 ? h[h.length - 5] : h[0];
            const d = x.h - prev;
            return `<tr class="click" data-action="open" data-kind="group" data-id="${x.g}">
              <td><b>${esc(S.groups[x.g].name)}</b> <span class="local">${esc(S.groups[x.g].local)}</span></td>
              <td class="num">${pct(x.size, 1)}</td>
              <td class="num">${trendArrow(sizeTrend(x.g), 0.0005, 100, 1)}</td>
              <td><div class="mood"><div class="bar"><b style="width:${(x.h * 100).toFixed(0)}%;background:${moodColor(x.h)}"></b></div><span class="small num">${(x.h * 100).toFixed(0)}</span></div></td>
              <td class="num ${Math.abs(d) < 0.005 ? 'faint' : d > 0 ? 'good' : 'bad'}">${Math.abs(d) < 0.005 ? '→' : signed(d * 100, 0)}</td>
              <td class="num">${pct(x.player, 0)}</td>
              <td class="num">${pct(x.swing || 0, 0)}</td></tr>`;
          }).join('')}</tbody></table></div>
      </div>
      <div class="grid g2" style="margin-top:16px">
        ${targetsCard()}
      </div>`;
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
      <rect x="14" y="12" width="${w - 28}" height="${h - 30}" rx="8" fill="var(--surface-2)"/>
      <line x1="${w / 2}" x2="${w / 2}" y1="12" y2="${h - 18}" stroke="var(--line)"/><line x1="14" x2="${w - 14}" y1="${Y(0)}" y2="${Y(0)}" stroke="var(--line)"/>
      <text x="16" y="${h - 4}" font-size="9.5" fill="var(--ink-3)">← Left</text><text x="${w - 16}" y="${h - 4}" font-size="9.5" fill="var(--ink-3)" text-anchor="end">Right →</text>
      <text x="${w / 2}" y="9" font-size="9.5" fill="var(--ink-3)" text-anchor="middle">Centralist</text><text x="${w / 2}" y="${h - 4}" font-size="9.5" fill="var(--ink-3)" text-anchor="middle">Decentralist</text>
      ${dots}</svg>`;
  }

  function flowCard() {
    const f = E.voteFlows(st, S);
    if (!f) return '';
    const pos = E.perceivedPosition(st, S);
    const lrOf = (id) => (id === 'player' ? pos.lr : (S.parties.find((p) => p.id === id) || { lr: 0 }).lr);
    // Merge small parties into "Others" so the chart stays readable
    const big = new Set(Object.keys(Object.assign({}, f.from, f.to)).filter((id) => Math.max(f.from[id] || 0, f.to[id] || 0) >= 0.02 || id === 'player'));
    const key = (id) => (big.has(id) ? id : '_others');
    const agg = {};
    f.links.forEach((l) => { const k = key(l.s) + '>' + key(l.t); agg[k] = (agg[k] || 0) + l.v; });
    const links = Object.entries(agg).map(([k, v]) => { const [a, b] = k.split('>'); return { s: a, t: b, v }; });
    const tot = (side, id) => links.filter((l) => l[side] === id).reduce((a, l) => a + l.v, 0);
    const info = (id) => (id === '_others' ? { short: 'Others', name: 'Regional & small parties', color: 'var(--ink-3)' } : partyInfo(id));
    const order = [...new Set(links.flatMap((l) => [l.s, l.t]))].sort((a, b) => (a === '_others' ? 1 : b === '_others' ? -1 : lrOf(a) - lrOf(b)));
    const node = (side) => order.filter((id) => tot(side, id) > 0.001).map((id) => ({ id, label: esc(info(id).short), sub: pct(tot(side, id), 1), color: info(id).color, value: tot(side, id) }));
    links.forEach((l) => {
      l.color = info(l.s).color;
      l.title = `${esc(info(l.s).short)} → ${esc(info(l.t).short)}: ${pct(l.v, 1)} of voters`;
    });
    const kept = links.find((l) => l.s === 'player' && l.t === 'player');
    const fromP = tot('s', 'player');
    const lostTo = links.filter((l) => l.s === 'player' && l.t !== 'player' && l.v > 0.003).sort((a, b) => b.v - a.v);
    const wonFrom = links.filter((l) => l.t === 'player' && l.s !== 'player' && l.v > 0.003).sort((a, b) => b.v - a.v);
    const list = (arr, side) => arr.slice(0, 3).map((l) => `<b>${esc(info(l[side]).short)}</b> ${(l.v * 100).toFixed(1)} pts`).join(', ');
    return `<div class="card" style="margin-top:16px">
      <div class="card-h"><h3>Vote flows</h3><span class="faint small">${dateLabel(f.since.year, f.since.quarter)} → now</span></div>
      <p class="muted small" style="margin:0 0 10px">${fromP ? `<b>${pct((kept ? kept.v : 0) / fromP, 0)}</b> of the people who voted for you would do so again.` : ''}
        ${lostTo.length ? ` You are losing voters to ${list(lostTo, 't')}.` : ''}${wonFrom.length ? ` You are winning voters from ${list(wonFrom, 's')}.` : ''}</p>
      <div class="row between small faint" style="margin-bottom:4px"><span>Last election</span><span>Today</span></div>
      ${C.sankey(node('s'), node('t'), links, { w: 960, h: 300, labelWidth: 90, aria: 'Voter flows between parties' })}
    </div>`;
  }

  function viewParliament() {
    const seats = st.seats;
    const inv = E.investiture(st, S, seats);
    const proj = st.lastVote.projected;
    const invP = E.investiture(st, S, proj);
    const order = orderedParties(Object.fromEntries(E.allParties(S).map((p) => [p.id, Math.max(1, seats[p.id] || 0)])));
    const rows = order.map((p) => {
      const d = invP.detail.find((x) => x.id === p.id);
      const stance = d.vote;
      const reasons = (d.reasons || []).map((r) => `<div class="small ${r.ok ? 'good' : 'bad'}">${r.ok ? '✓' : '✗'} ${esc(r.text)}</div>`).join('');
      const dSeats = (proj[p.id] || 0) - (seats[p.id] || 0);
      return `<tr>
        <td><div class="row"><i class="dot" style="background:${p.color}"></i><b>${esc(p.name)}</b> <span class="faint small">${esc(p.short)}</span></div>${reasons}</td>
        <td class="num">${seats[p.id] || 0}</td><td class="num">${proj[p.id] || 0} ${dSeats ? `<span class="small ${dSeats > 0 ? 'good' : 'bad'}">${signed(dSeats, 0)}</span>` : ''}</td><td class="num">${pct(st.lastVote.shares[p.id] || 0)}</td>
        <td class="num">${p.id === 'player' ? '<span class="vote-pill yes">You</span>' : `<span class="vote-pill ${stance}">${stance}</span>`}</td></tr>`;
    }).join('');
    const bar = (I) => {
      const y = I.yes, a = I.abstain, n = I.no;
      return `<div class="majority-bar" title="${y} yes · ${a} abstain · ${n} no"><span style="width:${(y / 3.5).toFixed(2)}%;background:var(--good)"></span><span style="width:${(a / 3.5).toFixed(2)}%;background:var(--ink-3);opacity:.4"></span><span style="width:${(n / 3.5).toFixed(2)}%;background:var(--bad)"></span></div>`;
    };
    const verdict = (I) => (I.yes >= S.majority ? { cls: 'good', txt: 'Absolute majority' } : I.yes > I.no ? { cls: 'good', txt: 'Passes (more yes than no)' } : { cls: 'bad', txt: 'Fails' });
    const vNow = verdict(inv), vP = verdict(invP);
    const dS = (proj.player || 0) - (seats.player || 0);
    const left = st.nextElectionTurn - st.turn;
    const canSnap = st.turn - st.lastElectionTurn >= 4 && left > 1;
    return `
      <div class="grid g2">
        <div class="card"><div class="card-h"><h3>Congress today</h3><span class="faint small">${inv.yes} for · ${inv.no} against</span></div>${hemi(seats)}${legend(seats)}</div>
        <div class="card"><div class="card-h"><h3>If the election were today</h3><span class="faint small">${invP.yes} for · ${invP.no} against</span></div>${hemi(proj)}${legend(proj)}</div>
      </div>
      ${flowCard()}
      <div class="card" style="margin-top:16px">
        <div class="card-h"><h3>Parties</h3></div>
        <div style="overflow-x:auto"><table class="tbl"><thead><tr><th>Party</th><th class="num">Seats now</th><th class="num">Projected</th><th class="num">Poll</th><th class="num">Stance</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-h"><h3>Since the last election</h3></div>
        ${analysisHtml(E.electionAnalysis(st, S))}
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-h"><h3>Poll history</h3></div>${pollChart(240)}
      </div>
      <div class="card" style="margin-top:16px">
        <div class="row between wrap"><div><h3>Snap election</h3><div class="muted small">Dissolve the Cortes. Spain votes next quarter.</div></div>
        <button class="btn" data-action="snap" ${canSnap ? '' : 'disabled'}>Call snap election</button></div>
      </div>`;
  }

  function revenueCard() {
    const b = st.lastBudget, mac = b.macro, m0 = st.macro0;
    if (!mac || !m0) return '';
    const bh = st.history.budget;
    const labels = st.history.polls.map((x) => x.label.replace(' 20', " '"));
    const chg = (a, z) => { const d = a / z - 1; return `<span class="small ${d >= 0 ? 'good' : 'bad'}">${signed(d * 100, 1)}%</span>`; };
    const baseVal = { wages: mac.wageBill, wagesProg: mac.wageBill, consumption: mac.consumption, profits: mac.profits };
    const rows = b.rev.filter((x) => x.base && x.v >= 0.05).map((x) => {
      const p = M.policyById[x.id];
      const base = baseVal[x.base];
      const B = E.TAX_BASES[x.base] || { name: x.base };
      return `<tr class="click" data-action="open" data-kind="policy" data-id="${x.id}"><td>${esc(x.name)} <span class="local">${esc(p.local)}</span></td>
        <td class="num small">${chg(x.scale, 1)}</td><td class="num">${eur(x.v)}</td></tr>`;
    }).join('');
    return `<div class="card" style="margin-top:16px">
      <div class="card-h"><h3>Tax revenue</h3><span class="faint small">Recaudación · change since you took office</span></div>
      <div class="kpis" style="margin-bottom:14px">
        <div class="kpi"><span class="k">People in work</span><span class="v">${mac.employed.toFixed(1)}M</span><span class="faint small">${chg(mac.employed, m0.employed)}</span></div>
        <div class="kpi"><span class="k">Average pay</span><span class="v">€${mac.avgWage.toFixed(1)}k</span><span class="faint small">${chg(mac.avgWage, m0.avgWage)}</span></div>
        <div class="kpi"><span class="k">Total wage bill</span><span class="v">${eur(mac.wageBill)}</span><span class="faint small">${chg(mac.wageBill, m0.wageBill)}</span></div>
        <div class="kpi"><span class="k">Consumer spending</span><span class="v">${eur(mac.consumption)}</span><span class="faint small">${chg(mac.consumption, m0.consumption)}</span></div>
        <div class="kpi"><span class="k">Business surplus</span><span class="v">${eur(mac.profits)}</span><span class="faint small">${chg(mac.profits, m0.profits)}</span></div>
      </div>
      <div style="overflow-x:auto;margin-top:12px"><table class="tbl"><thead><tr><th>Tax</th><th class="num">Since you took office</th><th class="num">Revenue/yr</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div>`;
  }

  function viewBudget() {
    const b = st.lastBudget;
    const bh = st.history.budget;
    const labels = st.history.polls.map((x) => x.label.replace(' 20', " '"));
    const maxV = Math.max(...b.rev.map((x) => x.v), ...b.spend.map((x) => x.v));
    const list = (items, color) => `<table class="tbl">${items.filter((x) => Math.abs(x.v) >= 0.001).map((x) => `<tr ${x.id[0] !== '_' ? `class="click" data-action="open" data-kind="policy" data-id="${x.id}"` : ''}>
      <td>${esc(x.name)}</td><td style="width:38%"><div class="bar"><b style="width:${Math.max(0.5, (Math.abs(x.v) / maxV) * 100).toFixed(1)}%;background:${x.v < 0 ? 'var(--good)' : color}"></b></div></td><td class="num">${eur(x.v)}</td></tr>`).join('')}</table>`;
    return `
      <div class="kpis" style="margin-bottom:16px">
        <div class="kpi"><span class="k">Revenue</span><span class="v">${eur(b.revenue)}</span><span class="faint small">${pct(b.revenue / st.gdp)} of GDP</span></div>
        <div class="kpi"><span class="k">Spending</span><span class="v">${eur(b.spending)}</span><span class="faint small">${pct(b.spending / st.gdp)} of GDP</span></div>
        <div class="kpi"><span class="k">${b.deficit >= 0 ? 'Deficit' : 'Surplus'}</span><span class="v ${b.deficit / st.gdp > 0.03 ? 'bad' : b.deficit < 0 ? 'good' : ''}">${pct(Math.abs(b.deficit) / st.gdp)}</span><span class="faint small">${eur(Math.abs(b.deficit))}/yr · EU limit 3%</span></div>
        <div class="kpi"><span class="k">Public debt</span><span class="v">${pct(st.debt / st.gdp, 0)}</span><span class="faint small">${eur(st.debt)} total</span></div>
        <div class="kpi"><span class="k">Interest bill</span><span class="v">${eur(b.interest)}</span><span class="faint small">avg rate ${pct(st.effRate, 2)}</span></div>
        <div class="kpi"><span class="k">GDP</span><span class="v">${eur(st.gdp)}</span><span class="faint small">nominal, annual</span></div>
      </div>
      <div class="grid g2">
        <div class="card"><div class="card-h"><h3>Public debt</h3><span class="faint small">% of GDP</span></div>
          ${C.lineChart([{ label: 'Debt', color: 'var(--accent)', values: bh.map((x) => x.debt * 100), bold: true }], labels, { h: 180, yMin: Math.min(60, ...bh.map((x) => x.debt * 100)), yFmt: (v) => v.toFixed(0) + '%' })}
        </div>
        <div class="card"><div class="card-h"><h3>Deficit</h3><span class="faint small">% of GDP</span></div>
          ${C.lineChart([{ label: 'Deficit', color: 'var(--warn)', values: bh.map((x) => x.deficit * 100), bold: true }], labels, { h: 180, yMin: Math.min(0, ...bh.map((x) => x.deficit * 100)), refLine: 3, yFmt: (v) => v.toFixed(1) + '%' })}
        </div>
      </div>
      <div class="grid g2" style="margin-top:16px">
        <div class="card"><div class="card-h"><h3>Revenue</h3><span class="faint small">${eur(b.revenue)}/yr</span></div>${list(b.rev, 'var(--good)')}</div>
        <div class="card"><div class="card-h"><h3>Spending</h3><span class="faint small">${eur(b.spending)}/yr</span></div>${list(b.spend, 'var(--accent)')}</div>
      </div>
      ${revenueCard()}`;
  }

  // ── Province map ────────────────────────────────────────────
  const MAP = { data: null, loading: false, failed: false, mode: 'lead' };
  function mapReady() { return window.d3 && window.topojson && S.map && d3[S.map.projection]; }
  function loadMap() {
    if (MAP.data || MAP.loading || MAP.failed) return;
    if (!mapReady()) { MAP.failed = true; return; }
    MAP.loading = true;
    fetch(S.map.url).then((r) => r.json()).then((j) => { MAP.data = j; })
      .catch(() => { MAP.failed = true; })
      .finally(() => { MAP.loading = false; if (ui.tab === 'regions') renderView(); });
  }
  function mapCard() {
    if (!S.map) return '';
    loadMap();
    const head = `<div class="card-h"><h3>Map</h3><div class="seg" style="width:auto">${[['lead', 'Leading party'], ['player', 'Your vote']].map(([m, l]) => `<button aria-pressed="${MAP.mode === m}" data-action="map-mode" data-m="${m}">${l}</button>`).join('')}</div></div>`;
    if (MAP.failed) return `<div class="card">${head}<div class="chart-empty">Map unavailable offline.</div></div>`;
    if (!MAP.data) return `<div class="card">${head}<div class="chart-empty">Loading map…</div></div>`;
    const v = st.lastVote, order = v.partyOrder;
    const byName = Object.fromEntries(S.provinces.map((p, i) => [p.name, i]));
    const topo = MAP.data;
    const feats = topojson.feature(topo, topo.objects[S.map.object]);
    const w = 640, h = 500;
    const proj = d3[S.map.projection]().fitSize([w, h], feats);
    const path = d3.geoPath(proj);
    const pColor = st.player.color;
    const leaders = {};
    const shapes = feats.features.map((f) => {
      const pi = byName[S.map.codes[f.id]];
      if (pi == null) return '';
      const prov = S.provinces[pi], votes = v.byProv[pi], tot = votes.reduce((a, b) => a + b, 0) || 1;
      let lead = 0; votes.forEach((x, k) => { if (x > votes[lead]) lead = k; });
      const leadShare = votes[lead] / tot, mine = votes[0] / tot;
      const lp = partyInfo(order[lead]);
      leaders[order[lead]] = (leaders[order[lead]] || 0) + 1;
      const fill = MAP.mode === 'lead' ? lp.color : pColor;
      const op = MAP.mode === 'lead' ? Math.max(0.35, Math.min(1, 0.2 + (leadShare - 0.2) * 2.4)) : Math.max(0.06, Math.min(1, mine / 0.5));
      const seats = Object.entries(v.byProvSeats[pi] || {}).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${partyInfo(id).short} ${n}`).join(', ');
      return `<path class="prov" d="${path(f)}" fill="${fill}" fill-opacity="${op.toFixed(2)}"><title>${esc(prov.name)} (${prov.seats} seats)\n${esc(lp.short)} leads with ${pct(leadShare, 0)}. You: ${pct(mine, 0)}\n${seats}</title></path>`;
    }).join('');
    const ccaa = S.map.regionsObject && topo.objects[S.map.regionsObject] ? `<path class="ccaa" d="${path(topojson.mesh(topo, topo.objects[S.map.regionsObject], (a, b) => a !== b))}"/>` : '';
    // Box around the Canary Islands inset
    const canary = feats.features.filter((f) => (S.map.inset || ['35', '38']).includes(f.id)).map((f) => path.bounds(f));
    let frame = '';
    if (canary.length) {
      const x0 = Math.min(...canary.map((b) => b[0][0])) - 8, y0 = Math.min(...canary.map((b) => b[0][1])) - 8;
      const x1 = Math.max(...canary.map((b) => b[1][0])) + 8, y1 = Math.max(...canary.map((b) => b[1][1])) + 8;
      frame = `<path class="frame" d="M${x0.toFixed(1)},${y0.toFixed(1)}H${x1.toFixed(1)}V${y1.toFixed(1)}H${x0.toFixed(1)}Z"/>`;
    }
    const legend = MAP.mode === 'lead'
      ? Object.entries(leaders).sort((a, b) => b[1] - a[1]).map(([id, n]) => `<span><i class="dot" style="background:${partyInfo(id).color}"></i>${esc(partyInfo(id).short)} ${n}</span>`).join('')
      : `<span><i class="dot" style="background:${pColor};opacity:.15"></i>5%</span><span><i class="dot" style="background:${pColor};opacity:.5"></i>25%</span><span><i class="dot" style="background:${pColor}"></i>50%+</span>`;
    return `<div class="card">${head}
      <svg class="spain-map" viewBox="0 0 ${w} ${h}" role="img" aria-label="Map of Spain by province">${shapes}${ccaa}${frame}</svg>
      <div class="map-legend">${MAP.mode === 'lead' ? '<span class="faint">Provinces won:</span>' : '<span class="faint">Your vote share:</span>'}${legend}</div></div>`;
  }

  function viewRegions() {
    const v = st.lastVote;
    const order = v.partyOrder;
    const regs = {};
    S.provinces.forEach((prov, pi) => {
      const r = (regs[prov.region] = regs[prov.region] || { seats: 0, votes: order.map(() => 0), proj: {}, provs: [] });
      r.seats += prov.seats;
      v.byProv[pi].forEach((x, k) => (r.votes[k] += x * 1));
      Object.entries(v.byProvSeats[pi]).forEach(([id, n]) => (r.proj[id] = (r.proj[id] || 0) + n));
      r.provs.push(pi);
    });
    const rows = Object.keys(S.regions).filter((k) => regs[k]).map((k) => {
      const r = regs[k], tot = r.votes.reduce((a, b) => a + b, 0);
      let lead = 0; r.votes.forEach((x, i) => { if (x > r.votes[lead]) lead = i; });
      const leadP = partyInfo(order[lead]);
      const ps = r.votes[0] / tot;
      const stack = order.map((id, i) => ({ id, s: r.votes[i] / tot })).filter((x) => x.s > 0.01).sort((a, b) => b.s - a.s);
      return `<tr>
        <td><b>${esc(S.regions[k].name)}</b> <span class="local">${esc(S.regions[k].local)}</span></td>
        <td class="num">${r.seats}</td>
        <td class="num"><b>${r.proj.player || 0}</b></td>
        <td style="min-width:200px"><div class="majority-bar" style="height:12px">${stack.map((x) => `<span title="${esc(partyInfo(x.id).short)} ${pct(x.s)}" style="width:${(x.s * 100).toFixed(1)}%;background:${partyInfo(x.id).color}"></span>`).join('')}</div></td>
        <td class="num">${pct(ps)}</td>
        <td><span class="row"><i class="dot" style="background:${leadP.color}"></i>${esc(leadP.short)}</span></td></tr>`;
    }).join('');
    return `${mapCard()}<div class="card" style="margin-top:28px">
      <div class="card-h"><h3>By autonomous community</h3><span class="faint small">If the election were today</span></div>
      <div style="overflow-x:auto"><table class="tbl regions"><thead><tr><th>Region</th><th class="num">Seats</th><th class="num">Your seats</th><th>Vote split</th><th class="num">Your vote</th><th>Leading</th></tr></thead><tbody>${rows}</tbody></table></div>
      <style>.regions .majority-bar::after{display:none}</style>
    </div>`;
  }

  const KIND_LABEL = { broken: 'Setback', goal: 'Goal', milestone: 'Milestone', crisis: 'Crisis over', group: 'Voters', polls: 'Polls', good: 'Good news', win: 'Election' };
  function viewNews() {
    const ach = st.achievements || [];
    return `<div class="grid g2">
      <div class="card"><div class="card-h"><h3>Achievements</h3><span class="faint small">${st.score || 0} points</span></div>
        ${ach.length ? `<div class="news-list">${ach.map((a) => `<div class="news"><div class="when">${dateLabel(a.year, a.quarter)}</div><div><div class="t">${esc(a.title)}</div><div class="d"><span class="kind-tag">${KIND_LABEL[a.kind] || ''}</span> ${a.points >= 0 ? '+' : '−'}${Math.abs(a.points)} points${a.capital ? `, +${a.capital} capital` : ''}</div></div></div>`).join('')}</div>` : '<div class="chart-empty">Nothing yet.</div>'}
      </div>
      <div class="card"><div class="card-h"><h3>News</h3></div>${newsList(st.news)}</div>
    </div>`;
  }

  // Front-page style announcement for wins
  function herald(list) {
    const host = $('#heralds');
    list.slice(0, 3).forEach((a, i) => {
      const el = document.createElement('div');
      el.className = 'herald k-' + a.kind;
      el.style.animationDelay = (i * 0.25) + 's';
      el.innerHTML = `<div class="herald-top"><span>${KIND_LABEL[a.kind] || 'Extra'}</span><span>${dateLabel(a.year, a.quarter)}</span></div>
        <div class="herald-h">${esc(a.title)}</div>
        ${a.text ? `<div class="herald-d">${esc(a.text)}</div>` : ''}
        <div class="herald-f">${a.points >= 0 ? '+' : '−'}${Math.abs(a.points)} points${a.capital ? ` · +${a.capital} political capital` : ''}</div>`;
      el.addEventListener('click', () => el.remove());
      host.appendChild(el);
      setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 7000 + i * 600);
    });
    if (list.length > 3) toast(`And ${list.length - 3} more achievements in the News tab`, 'good');
  }

  // ── Drawer ──────────────────────────────────────────────────
  function fxRow(target, amount, opts = {}) {
    const k = kindOf(target);
    const w = Math.min(50, (Math.abs(amount) / (opts.scale || 0.5)) * 50);
    const color = opts.color || (amount >= 0 ? 'var(--good)' : 'var(--bad)');
    const style = amount >= 0 ? `left:50%;width:${w}%` : `left:${50 - w}%;width:${w}%`;
    const delta = opts.delta != null && Math.abs(opts.delta) > 0.0005 ? `<span class="${opts.delta > 0 ? 'good' : 'bad'}">${signed(opts.delta * 100, 1)}</span>` : opts.right || '';
    return `<button class="fx ${opts.dim ? 'dim' : ''}" data-action="open" data-kind="${opts.kind || k}" data-id="${opts.id || target}" title="${esc(opts.title || '')}">
      <span class="nm">${esc(opts.name || nameOf(target))}<span class="kind">${opts.kindLabel || (k === 'group' ? 'voters' : '')}</span></span>
      <span class="fxbar"><b style="${style};background:${color}"></b></span>
      <span class="delta">${delta}</span></button>`;
  }

  function signColorForSim(target, amount) {
    const s = S.sims[target];
    if (!s || !s.good) return amount >= 0 ? 'var(--good)' : 'var(--bad)';
    const good = s.good === 'high' ? amount > 0 : amount < 0;
    return good ? 'var(--good)' : 'var(--bad)';
  }

  function drawerPolicy(id) {
    const p = M.policyById[id], cur = st.policies[id];
    if (!ui.draft || ui.draft.id !== id) ui.draft = { id, active: cur.active, v: cur.v };
    const d = ui.draft;
    const cat = S.policyCats[p.cat];
    const pactNotes = Object.entries(st.pacts || {}).filter(([, pc]) => pc.active && pc.demands.some((x) => x[0] === id)).map(([pid, pc]) => {
      const dm = pc.demands.find((x) => x[0] === id);
      return `<div class="note bad"><b>Pact with ${esc(partyInfo(pid).name)}:</b> ${esc(E.describeDemand(S, dm))}. Break it and they turn against you.</div>`;
    }).join('');
    const partnerNotes = pactNotes + S.parties.filter((pt) => !(st.pacts || {})[pt.id] && (pt.partner.demands || []).some((x) => x[0] === id)).map((pt) => {
      const dem = pt.partner.demands.find((x) => x[0] === id);
      const seats = st.seats[pt.id] || 0;
      return `<div class="note ${dem[2] < 0 ? 'bad' : ''}"><b>${esc(pt.name)}</b> (${seats} seats) ${dem[2] > 0 ? `wants this at “${esc(E.levelLabel(p, dem[1]))}” or higher to back you.` : 'will withdraw support if you bring this in.'}</div>`;
    }).join('');
    return `
      <div class="dr-head">${drawerNav()}
        <div class="eyebrow">${esc(cat.name)}</div>
        <h2>${esc(p.name)}</h2><div class="local">${esc(p.local)}</div>
        <button class="btn ghost icon dr-close" data-action="close-drawer" aria-label="Close">✕</button>
      </div>
      <div class="dr-body">
        <p class="muted" style="margin:0">${esc(p.desc)}</p>
        <div class="slider-box">
          <div class="row between"><span class="small muted">${cur.active ? 'Currently: ' + esc(E.levelLabel(p, cur.v)) : 'Not in force'}</span>
          ${p.init == null || cur.active ? '' : '<span class="small faint">Scrapped</span>'}</div>
          <div id="pol-live">${policyLive(id)}</div>
          <input type="range" min="0" max="100" step="1" value="${Math.round(d.v * 100)}" data-input="policy-v" aria-label="Policy level" ${d.active ? '' : 'disabled'} />
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
      <div class="lvl">${d.active ? esc(E.levelLabel(p, d.v)) : 'Not in force'}</div>
      ${p.budget ? `<div class="cost-line"><span class="muted">${isRev ? 'Raises' : bNew < 0 ? 'Saves' : 'Costs'}</span><b>${eur(Math.abs(bNew))}/yr</b></div>` : '<div class="cost-line"><span class="muted">Budget</span><b class="faint">No direct cost (regulation)</b></div>'}
      ${p.budget && Math.abs(bDelta) > 0.05 ? `<div class="cost-line"><span class="muted">Budget impact of change</span><b class="${bDelta > 0 ? 'good' : 'bad'}">${bDelta > 0 ? '+' : '−'}${eur(Math.abs(bDelta)).replace('−', '')}/yr</b></div>` : ''}
      <div class="cost-line"><span class="muted">Political capital</span><b class="${cost > st.capital ? 'bad' : ''}">${cost ? cost + ' of ' + Math.floor(st.capital) : '–'}</b></div>`;
  }

  function policyActions(id) {
    const p = M.policyById[id], cur = st.policies[id], d = ui.draft;
    const cost = E.changeCost(st, S, id, d.active, d.v);
    const can = cost <= st.capital;
    if (!cur.active && !E.policyAvailable(st, S, id)) return `<button class="btn" disabled>Not possible until ${p.availableFrom}</button>`;
    if (!cur.active && !d.active) return `<button class="btn primary" data-action="pol-draft-on">Introduce…</button>`;
    if (!cur.active && d.active) return `<button class="btn primary" data-action="pol-apply" ${can ? '' : 'disabled'}>Introduce (${cost})</button><button class="btn ghost" data-action="pol-reset">Cancel</button>`;
    const changed = Math.abs(d.v - cur.v) >= 0.005;
    const abolishCost = E.changeCost(st, S, id, false, 0);
    return `<button class="btn primary" data-action="pol-apply" ${changed && can ? '' : 'disabled'}>${changed ? `Apply change (${cost})` : 'Move the slider to change'}</button>
      ${changed ? '<button class="btn ghost" data-action="pol-reset">Reset</button>' : ''}
      <button class="btn ghost danger" data-action="pol-abolish" ${abolishCost <= st.capital ? '' : 'disabled'} title="Costs ${abolishCost} capital">Abolish (${abolishCost})</button>`;
  }

  function policyEffects(id) {
    const p = M.policyById[id], d = ui.draft, cur = st.policies[id];
    const prev = E.previewGroups(st, S, id, d.active, d.v);
    const showDelta = d.active !== cur.active || Math.abs(d.v - cur.v) >= 0.005;
    const sims = p._fx.filter((e) => kindOf(e.t) === 'sim').sort((a, b) => Math.abs(b.a) - Math.abs(a.a));
    const grps = p._fx.filter((e) => kindOf(e.t) === 'group').sort((a, b) => b.a - a.a);
    return `
      ${sims.length ? `<div><h3>Effects on the country</h3><div class="fx-list">${sims.map((e) => fxRow(e.t, e.a, { color: signColorForSim(e.t, e.a), scale: 0.3, delta: null, right: showDelta && Math.abs(prev[e.t]) > 0.0005 ? `<span class="${signColorForSim(e.t, prev[e.t]).includes('good') ? 'good' : 'bad'}">${prev[e.t] > 0 ? '▲' : '▼'}</span>` : '' })).join('')}</div></div>` : ''}
      ${grps.length ? `<div><h3>How voters react</h3><div class="fx-list">${grps.map((e) => fxRow(e.t, e.a, { scale: 0.5, delta: showDelta ? prev[e.t] : null })).join('')}</div>
      </div>` : ''}
      ${sizeOutputsHtml(id)}`;
  }

  function drawerSim(id) {
    const s = S.sims[id];
    const inputs = E.explain(st, S, id);
    const outs = E.outputs(S, 'sim', id);
    const t = simTone(id);
    const hist = st.history.sims[id] || [];
    const labels = st.history.polls.map((x) => x.label.replace(' 20', " '"));
    const scale = Math.max(0.15, ...inputs.map((x) => Math.abs(x.amount)));
    return `
      <div class="dr-head">${drawerNav()}<div class="eyebrow">${esc(s.cat)} · Indicator</div><h2>${esc(s.name)}</h2><div class="local">${esc(s.local)}</div>
        <button class="btn ghost icon dr-close" data-action="close-drawer" aria-label="Close">✕</button></div>
      <div class="dr-body">
        <div class="row" style="align-items:baseline;gap:10px"><span class="big-num" style="font-size:36px">${s.fmt(st.sims[id])}</span><span class="trend ${t.cls}">${t.arrow} over a year</span></div>
        <div class="faint small" style="margin-top:-12px">${esc(s.unit)}</div>
        <p class="muted" style="margin:0">${esc(s.desc)}</p>
        ${hist.length > 1 ? C.lineChart([{ label: '', color: toneColor(t.cls), values: hist.map((v) => v * 100), bold: true }], labels, { h: 140, padR: 10, yMin: Math.max(0, Math.min(...hist) * 100 - 5), yMax: Math.max(...hist) * 100 + 5, yFmt: () => '' }) : ''}
        ${inputs.length ? `<div><h3>What drives it</h3><div class="fx-list">${inputs.map((x) => fxRow(x.id, x.amount, { kind: x.kind, id: x.id, name: x.name, kindLabel: x.kind === 'policy' ? 'policy' : x.kind === 'situation' ? 'situation' : x.kind === 'event' ? 'event' : '', dim: !x.active, scale, color: signColorForSim(id, x.amount), right: x.active ? '' : '<span class="faint small">off</span>' })).join('')}</div></div>` : ''}
        ${outs.length && !s.hidden ? `<div><h3>What it affects</h3><div class="fx-list">${outs.slice().sort((a, b) => Math.abs(b.a) - Math.abs(a.a)).map((e) => fxRow(e.t, e.a, { color: kindOf(e.t) === 'sim' ? signColorForSim(e.t, e.a) : undefined, scale: 0.5 })).join('')}</div></div>` : ''}
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
    const row = (x) => fxRow(x.id, x.amount, { kind: x.kind, id: x.id, name: x.name, kindLabel: x.kind === 'sim' ? '' : x.kind, dim: !x.active, scale, right: x.active ? '' : '<span class="faint small">off</span>' });
    return `
      <div class="dr-head">${drawerNav()}<div class="eyebrow">Voter group</div><h2>${esc(g.name)}</h2><div class="local">${esc(g.local)}</div>
        <button class="btn ghost icon dr-close" data-action="close-drawer" aria-label="Close">✕</button></div>
      <div class="dr-body">
        <div class="stat-row">
          <div class="stat"><div class="k">Mood</div><div class="v" style="color:${moodColor(h)}">${(h * 100).toFixed(0)}/100</div></div>
          <div class="stat"><div class="k">Size</div><div class="v">${pct(gs.size, 1)} ${trendArrow(sizeTrend(id), 0.001)}</div></div>
          <div class="stat"><div class="k">Vote for you</div><div class="v">${pct(gs.player, 0)}</div></div>
        </div>
        <p class="muted" style="margin:0">${esc(g.desc || '')}</p>
        ${C.lineChart([{ label: '', color: moodColor(h), values: (st.history.groups[id] || []).map((v) => v * 100), bold: true }], st.history.polls.map((x) => x.label.replace(' 20', " '")), { h: 120, padR: 10, yMin: 0, yMax: 100, refLine: 50, yFmt: (v) => v.toFixed(0) })}
        <div class="note">${pct(gs.swing || 0, 0)} of members who vote for others are <b>persuadable</b> (close to switching to you); ${pct(gs.risk || 0, 0)} of your supporters here are <b>wavering</b>.</div>
        ${likes.length ? `<div><h3>What lifts their mood</h3><div class="fx-list">${likes.map(row).join('')}</div></div>` : ''}
        ${dislikes.length ? `<div><h3>What sours their mood</h3><div class="fx-list">${dislikes.map(row).join('')}</div></div>` : ''}
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
    const labels = st.history.polls.map((x) => x.label.replace(' 20', " '"));
    const first = h[0], now = h[h.length - 1] || 0;
    const scale = Math.max(0.03, ...drivers.map((d) => Math.abs(d.contribution)));
    return `<div>
      <h3>Group size</h3>
      <div class="muted small" style="margin-bottom:6px">${pct(now, 1)} of voters now${first != null && h.length > 1 ? ` · ${pct(first, 1)} at the start (${signed((now - first) * 100, 1)} pts)` : ''}</div>
      ${h.length > 1 ? C.lineChart([{ label: '', color: 'var(--info)', values: h.map((v) => v * 100), bold: true }], labels, { h: 110, padR: 10, yMin: Math.max(0, Math.min(...h) * 100 - 1), yMax: Math.max(...h) * 100 + 1, yFmt: (v) => v.toFixed(1) + '%' }) : ''}
      ${drivers.length ? `<h3 style="margin-top:14px">What changes its size</h3>
      <div class="fx-list">${drivers.map((d) => fxRow(d.id, d.contribution, { kind: d.kind === 'time' ? 'none' : d.kind, id: d.id, name: d.name, kindLabel: d.kind === 'policy' ? 'policy' : d.kind === 'time' ? 'trend' : '', scale, color: 'var(--info)', right: `<span class="small ${Math.abs(d.contribution) < 0.002 ? 'faint' : ''}">${signed(d.contribution * 100, 0)}%</span>` })).join('')}</div>` : '<div class="faint small">This group\'s size is fixed.</div>'}
    </div>`;
  }

  function drawerEvent(id) {
    const ev = E.activeEvents(st, S).find((e) => e.id === id);
    const e = M.eventById[id];
    const scale = Math.max(0.1, ...ev.fx.map((f) => Math.abs(f.a)));
    return `
      <div class="dr-head">${drawerNav()}<div class="eyebrow">Current event · ${ev.left} of ${ev.turns} quarters left</div><h2>${esc(ev.title)}</h2><div class="local">${esc(ev.local)}</div>
        <button class="btn ghost icon dr-close" data-action="close-drawer" aria-label="Close">✕</button></div>
      <div class="dr-body">
        <p class="muted" style="margin:0">${esc(e ? e.text : '')}</p>
        ${ev.label ? `<div class="note">Your decision: <b>${esc(ev.label)}</b></div>` : ''}
        <div><h3>Effects right now</h3><div class="fx-list">${ev.fx.map((f) => fxRow(f.t, f.now, { color: kindOf(f.t) === 'sim' ? signColorForSim(f.t, f.now) : undefined, scale, right: '' })).join('')}</div></div>
      </div>`;
  }

  function wageKpi() {
    const mac = st.lastBudget.macro, h = st.history.budget;
    if (!mac) return '';
    const real = h.map((x) => (x.avgWage || mac.avgWage) / (x.prices || 1));
    const d = real.length > 4 ? real[real.length - 1] / real[real.length - 5] - 1 : 0;
    const cls = Math.abs(d) < 0.002 ? 'faint' : d > 0 ? 'good' : 'bad';
    return `<button class="kpi" data-action="open" data-kind="wage" data-id="avgWage">
      <span class="k">Average pay</span>
      <span class="v">€${mac.avgWage.toFixed(1)}k <span class="trend ${cls}">${cls === 'faint' ? '→' : d > 0 ? '↑' : '↓'}</span></span>
      <span class="faint small">per worker / yr</span>
      ${C.sparkline(h.map((x) => x.avgWage || mac.avgWage), { color: toneColor(cls), w: 140, h: 26 })}
    </button>`;
  }

  function drawerWage() {
    const mac = st.lastBudget.macro, m0 = st.macro0, h = st.history.budget;
    const prices = st.priceLevel || 1;
    const real = mac.avgWage / prices;
    const labels = st.history.polls.map((x) => x.label.replace(' 20', " '"));
    const wd = E.wageDrivers(st, S);
    const drivers = wd.items.filter((d) => Math.abs(d.c) >= 0.05);
    const scale = Math.max(1, ...drivers.map((d) => Math.abs(d.c)));
    const rw = S.sims.realWage;
    const affects = rw ? rw._fx.slice().sort((a, b) => b.a - a.a) : [];
    return `
      <div class="dr-head">${drawerNav()}<div class="eyebrow">Economy · Indicator</div><h2>Average pay</h2><div class="local">Salario medio</div>
        <button class="btn ghost icon dr-close" data-action="close-drawer" aria-label="Close">✕</button></div>
      <div class="dr-body">
        <div class="stat-row">
          <div class="stat"><div class="k">Nominal</div><div class="v">€${mac.avgWage.toFixed(1)}k</div></div>
          <div class="stat"><div class="k">Real (${S.startYear} €)</div><div class="v">€${real.toFixed(1)}k</div></div>
          <div class="stat"><div class="k">Prices since ${S.startYear}</div><div class="v">${signed((prices - 1) * 100, 1)}%</div></div>
        </div>
        ${h.length > 1 ? C.lineChart([
          { label: 'Nominal', color: 'var(--info)', values: h.map((x) => x.avgWage || mac.avgWage), bold: true },
          { label: 'Real', color: 'var(--good)', values: h.map((x) => (x.avgWage || mac.avgWage) / (x.prices || 1)) },
        ], labels, { h: 150, yMin: Math.min(...h.map((x) => (x.avgWage || mac.avgWage) / (x.prices || 1))) * 0.97, yFmt: (v) => '€' + v.toFixed(0) + 'k', padR: 50 }) : ''}
        <div><h3>What drives it</h3>
          ${drivers.length ? `<div class="fx-list">${drivers.map((d) => fxRow(d.id, d.c, { kind: d.kind, id: d.id, name: d.name, kindLabel: d.kind === 'policy' ? 'policy' : '', scale, right: `<span class="${d.c >= 0 ? 'good' : 'bad'}">${signed(d.c, 1)}%</span>` })).join('')}</div>` : '<div class="faint small">No change yet.</div>'}
          <div class="faint small" style="margin-top:6px">Since ${dateLabel(S.startYear, 1)}: ${signed(wd.total, 1)}%</div>
        </div>
        <div><h3>What it affects</h3><div class="fx-list">
          ${affects.map((e) => fxRow(e.t, e.a, { scale: 0.4 })).join('')}
          ${['incomeTax', 'socialContrib'].filter((id) => M.policyById[id]).map((id) => fxRow(id, 0.3, { kind: 'policy', id, name: M.policyById[id].name + ' revenue', kindLabel: 'budget', scale: 0.4, color: 'var(--good)' })).join('')}
        </div></div>
      </div>`;
  }

  function sizeOutputsHtml(srcId) {
    const outs = (M.sizeOutputs[srcId] || []).filter((o) => !S.groups[o.g].hidden);
    if (!outs.length) return '';
    return `<div><h3>Changes the size of</h3><div class="fx-list">${outs.sort((a, b) => Math.abs(b.a) - Math.abs(a.a)).map((o) => fxRow(o.g, o.a, { scale: 2, color: 'var(--info)', right: `<span class="faint small">${o.a > 0 ? 'grows' : 'shrinks'}</span>` })).join('')}</div></div>`;
  }

  function drawerSituation(id) {
    const s = M.situationById[id];
    const on = st.situations[id];
    const outs = s._fx;
    const trig = ['housing', 'water', 'growth', 'unemployment', 'tension', 'riskPremium', 'deficitRatio', 'tourism', 'energy', 'crime', 'birthrate', 'productivity', 'corruption'].find((k) => s.trigger({ ...st.sims, [k]: -999 }) === -999) || null;
    const ts = trig && S.sims[trig];
    return `
      <div class="dr-head">${drawerNav()}<div class="eyebrow">Situation · ${on ? (s.bad ? 'Active crisis' : 'Active') : 'Inactive'}</div><h2>${esc(s.name)}</h2><div class="local">${esc(s.local)}</div>
        <button class="btn ghost icon dr-close" data-action="close-drawer" aria-label="Close">✕</button></div>
      <div class="dr-body">
        <p class="muted" style="margin:0">${esc(s.desc)}</p>
        ${ts ? `<div class="note ${on && s.bad ? 'bad' : ''}">Triggered by <b>${esc(ts.name)}</b> ${s.below ? 'falling below' : 'rising above'} <b>${ts.fmt(s.on)}</b>; ends when it ${s.below ? 'recovers past' : 'drops below'} <b>${ts.fmt(s.off)}</b>. Now: <b>${ts.fmt(st.sims[trig])}</b>.</div>` : ''}
        ${ts && !ts.hidden ? `<button class="btn" data-action="open" data-kind="sim" data-id="${trig}">See what drives ${esc(ts.name)} →</button>` : ''}
        <div><h3>While active</h3><div class="fx-list">${outs.map((e) => fxRow(e.t, e.a, { color: kindOf(e.t) === 'sim' ? signColorForSim(e.t, e.a) : undefined, scale: 0.25 })).join('')}${s.capital ? `<div class="small bad" style="padding:6px">${s.capital} political capital per quarter</div>` : ''}</div></div>
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
    const lbl = (n) => { if (!n) return ''; const o = n.kind === 'policy' ? M.policyById[n.id] : n.kind === 'sim' ? S.sims[n.id] : n.kind === 'group' ? S.groups[n.id] : n.kind === 'situation' ? M.situationById[n.id] : n.kind === 'wage' ? { name: 'Average pay' } : M.eventById[n.id]; return o ? (o.name || o.title) : ''; };
    return `<div class="dr-nav"><button class="btn ghost icon sm" data-action="nav-back" ${back ? '' : 'disabled'} title="${back ? 'Back to ' + esc(lbl(ui.nav[ui.navIdx - 1])) : 'Back'}" aria-label="Back">←</button><button class="btn ghost icon sm" data-action="nav-fwd" ${fwd ? '' : 'disabled'} title="${fwd ? 'Forward to ' + esc(lbl(ui.nav[ui.navIdx + 1])) : 'Forward'}" aria-label="Forward">→</button></div>`;
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
    if (kind === 'sim' && S.sims[id] && S.sims[id].drawer === 'wage') { kind = 'wage'; id = 'avgWage'; }
    if (kind === 'event' && !E.activeEvents(st, S).some((e) => e.id === id)) return;
    if (kind === 'sim' && S.sims[id] && S.sims[id].drawer === 'wage') { kind = 'wage'; id = 'avgWage'; }
    else if (kind === 'sim' && S.sims[id] && S.sims[id].hidden) { ui.tab = 'budget'; ui.drawer = null; render(); return; }
    const cur = ui.nav[ui.navIdx];
    if (!ui.drawer || !cur || cur.kind !== kind || cur.id !== id) {
      if (!ui.drawer) { ui.nav = []; ui.navIdx = -1; } // a fresh panel starts a fresh history
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

  // ── Main render ─────────────────────────────────────────────
  function renderView() {
    const v = $('#view');
    const fns = { overview: viewOverview, policies: viewPolicies, indicators: viewIndicators, voters: viewVoters, parliament: viewParliament, budget: viewBudget, regions: viewRegions, news: viewNews };
    v.innerHTML = fns[ui.tab]();
  }
  function render() {
    renderHeader();
    renderTabs();
    renderView();
    renderDrawer();
  }

  // ── Modals ──────────────────────────────────────────────────
  function modal(html, opts = {}) {
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal-wrap" ${opts.dismiss ? 'data-action="modal-bg"' : ''}><div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div></div>`;
    const f = root.querySelector('.modal button');
    if (f) f.focus({ preventScroll: true });
  }
  function closeModal() { $('#modal-root').innerHTML = ''; nextInQueue(); }
  function nextInQueue() {
    const next = ui.queue.shift();
    if (next) next();
  }

  function whyNote(id) {
    const w = st.lastEventWhy && st.lastEventWhy.id === id ? st.lastEventWhy.why : [];
    return w.length ? `<div class="note"><b>Contributing factors:</b> ${w.map(esc).join('; ')}.</div>` : '';
  }
  function risksCard() {
    const risks = E.eventRisks(st, S).filter((r) => r.p >= 0.04).slice(0, 6);
    if (!risks.length) return '';
    return `<div class="card"><div class="card-h"><h3>Risks next quarter</h3></div>
      <table class="tbl">${risks.map((r) => `<tr><td><b>${esc(r.title)}</b>${r.why.length ? `<div class="small muted">${r.why.map(esc).join(' · ')}</div>` : ''}</td>
        <td style="width:90px"><div class="bar"><b style="width:${Math.min(100, r.p * 250).toFixed(0)}%;background:${r.p > 0.15 ? 'var(--bad)' : 'var(--warn)'}"></b></div></td><td class="num small" style="width:44px">${Math.round(r.p * 100)}%</td></tr>`).join('')}</table></div>`;
  }

  function showDilemma() {
    const e = M.eventById[st.pendingDilemma];
    if (!e) return;
    modal(`
      <div class="modal-head"><div class="eyebrow">Decision needed · ${dateLabel(st.year, st.quarter)}</div><h2>${esc(e.title)}</h2><div class="local">${esc(e.local)}</div></div>
      <div class="modal-body">
        <p style="margin:0">${esc(e.text)}</p>
        ${whyNote(e.id)}
        ${e.choices.map((c, i) => `<button class="choice" data-action="dilemma" data-i="${i}"><b>${esc(c.label)}</b><span class="muted small">${esc(c.desc || '')}</span>
          <span class="small faint">${[c.cost ? `Costs ${eur(c.cost)}` : '', c.capital ? `${c.capital} capital` : ''].filter(Boolean).join(' · ')}</span></button>`).join('')}
      </div>`);
  }

  function showEvent(id) {
    const e = M.eventById[id];
    modal(`
      <div class="modal-head"><div class="eyebrow">Breaking news · ${dateLabel(st.year, st.quarter)}</div><h2>${esc(e.title)}</h2><div class="local">${esc(e.local)}</div></div>
      <div class="modal-body"><p style="margin:0">${esc(e.text)}</p>
        ${whyNote(id)}
        <div class="fx-list">${(e._fx || []).map((f) => fxRow(f.t, f.a, { color: kindOf(f.t) === 'sim' ? signColorForSim(f.t, f.a) : undefined, scale: 0.15 })).join('')}</div>
        <div class="faint small">${e.capital ? `${e.capital} political capital.` : ''}${e.revenue ? ` +${eur(e.revenue)} one-off revenue.` : ''}</div></div>
      <div class="modal-foot"><button class="btn primary" data-action="close-modal">Continue</button></div>`);
  }

  function groupNames(fx, sign) {
    return E.parseFx(fx).filter((f) => (sign > 0 ? f.a > 0 : f.a < 0)).map((f) => (S.groups[f.t] ? S.groups[f.t].name : f.t)).join(', ');
  }
  function showCampaign() {
    if (!st.pendingCampaign) return;
    ui.camp = ui.camp && ui.camp.turn === st.turn ? ui.camp : { turn: st.turn, promises: [], tour: [] };
    const c = ui.camp;
    const opts = E.campaignOptions(st, S);
    const settled = (st.promises || []).filter((p) => p.status !== 'open' && p.settledTurn != null && st.turn - p.settledTurn <= 1);
    const left = st.nextElectionTurn - st.turn;
    const regs = {};
    S.provinces.forEach((p) => (regs[p.region] = (regs[p.region] || 0) + p.seats));
    const scroll = $('#modal-root .modal') ? $('#modal-root .modal').scrollTop : 0;
    modal(`
      <div class="modal-head"><div class="eyebrow">Election campaign</div><h2>Spain votes in ${left} quarter${left > 1 ? 's' : ''}</h2></div>
      <div class="modal-body">
        ${settled.length ? `<div><h3>Your record</h3><div class="goals">${settled.map((p) => `<div class="goal ${p.status === 'kept' ? 'done' : 'failed'}"><span class="goal-mark">${p.status === 'kept' ? '✓' : '✗'}</span><span class="goal-t">${esc(p.title)}</span><span class="goal-v small">${p.status === 'kept' ? 'Kept' : 'Broken'}</span></div>`).join('')}</div></div>` : ''}
        <div><div class="row between"><h3>Promises</h3><span class="faint small">${c.promises.length} of 3</span></div>
          ${st.brokenPromises ? '<div class="note bad small" style="margin:6px 0">Voters remember the promises you broke. They will believe you less.</div>' : ''}
          <div class="promise-grid">${opts.map((p) => {
            const on = c.promises.includes(p.id);
            const plus = groupNames(p.groups, 1), minus = groupNames(p.groups, -1);
            return `<button class="promise" aria-pressed="${on}" data-action="camp-promise" data-id="${p.id}" ${!on && c.promises.length >= 3 ? 'disabled' : ''}>
              <span class="kind-tag">${p.keep ? 'Pledge' : 'Target'}</span>
              <b>${esc(p.title)}</b>
              <span class="small good">${esc(plus)}</span>${minus ? `<span class="small bad">${esc(minus)}</span>` : ''}</button>`;
          }).join('')}</div>
        </div>
        <div><div class="row between"><h3>Campaign tour</h3><span class="faint small">${c.tour.length} of 2 regions</span></div>
          <div class="region-grid">${Object.keys(S.regions).filter((k) => regs[k] > 1).sort((a, b) => regs[b] - regs[a]).map((k) => {
            const on = c.tour.includes(k);
            return `<button aria-pressed="${on}" data-action="camp-region" data-r="${k}" ${!on && c.tour.length >= 2 ? 'disabled' : ''}><span>${esc(S.regions[k].name)}</span><span class="faint">${regs[k]}</span></button>`;
          }).join('')}</div>
        </div>
      </div>
      <div class="modal-foot"><button class="btn primary" data-action="camp-launch">Launch the campaign</button></div>`, { wide: true });
    const m = $('#modal-root .modal'); if (m) m.scrollTop = scroll;
  }

  // ── Coalition talks ─────────────────────────────────────────────
  const STATUS = { yes: ['Backs you', 'yes'], pact: ['Pact signed', 'yes'], abstain: ['Abstains', 'abstain'], refuses: ['Will not deal', 'no'], open: ['Open to a deal', 'abstain'] };
  function showNegotiation() {
    if (!st.pendingInvestiture) return;
    const opts = E.negotiationOptions(st, S);
    const inv = E.investiture(st, S, st.seats);
    const pass = inv.yes >= S.majority || inv.yes > inv.no;
    const scroll = $('#modal-root .modal') ? $('#modal-root .modal').scrollTop : 0;
    modal(`
      <div class="modal-head"><div class="eyebrow">Forming a government</div><h2>Coalition talks</h2></div>
      <div class="modal-body">
        <div>
          <div class="row between small"><b>${inv.yes} yes · ${inv.abstain} abstain · ${inv.no} no</b><span class="vote-pill ${pass ? 'yes' : 'no'}">${inv.yes >= S.majority ? 'Absolute majority' : pass ? 'Would pass' : 'Would fail'}</span></div>
          <div class="majority-bar" style="margin-top:6px"><span style="width:${(inv.yes / 3.5).toFixed(2)}%;background:var(--good)"></span><span style="width:${(inv.abstain / 3.5).toFixed(2)}%;background:var(--ink-3);opacity:.4"></span><span style="width:${(inv.no / 3.5).toFixed(2)}%;background:var(--bad)"></span></div>
          <div class="faint small" style="margin-top:4px">You need 176 yes votes, or more yes than no.</div>
        </div>
        <div class="talks">${opts.map((o) => {
          const p = partyInfo(o.id);
          const [lbl, cls] = STATUS[o.status];
          return `<div class="talk">
            <div class="row between"><span class="row"><i class="dot" style="background:${p.color}"></i><b>${esc(p.name)}</b><span class="faint small">${o.seats} seat${o.seats === 1 ? '' : 's'}</span></span><span class="vote-pill ${cls}">${lbl}</span></div>
            ${o.status === 'open' ? `<ul class="demands-list">${o.text.map((t) => `<li>${esc(t)}</li>`).join('')}</ul><button class="btn sm" data-action="deal" data-p="${o.id}">Accept their terms</button>` : ''}
          </div>`;
        }).join('')}</div>
      </div>
      <div class="modal-foot"><button class="btn primary" data-action="investiture">Call the investiture vote</button></div>`, { wide: true });
    const m = $('#modal-root .modal'); if (m) m.scrollTop = scroll;
  }

  function showElection(r) {
    const prev = st.history.elections && st.history.elections.length > 1 ? st.history.elections[st.history.elections.length - 2].seats : null;
    const order = orderedParties(r.seats).sort((a, b) => b.n - a.n);
    const inv = r.invest;
    const title = r.outcome === 'negotiating' ? 'No majority: time to negotiate' : r.outcome === 'won' ? (r.seats.player >= S.majority ? 'An absolute majority' : 'You stay in La Moncloa') : r.outcome === 'hung' ? 'Hung parliament' : 'Defeat';
    modal(`
      <div class="modal-head"><div class="eyebrow">General election · ${dateLabel(r.year, r.quarter)}</div><h2>${title}</h2></div>
      <div class="modal-body">
        <div class="grid g2" style="align-items:center">
          <div>${hemi(r.seats, { w: 380 })}</div>
          <table class="tbl"><thead><tr><th>Party</th><th class="num">Vote</th><th class="num">Seats</th></tr></thead><tbody>
          ${order.map((p) => { const d = prev ? p.n - (prev[p.id] || 0) : null; return `<tr><td><span class="row"><i class="dot" style="background:${p.color}"></i>${esc(p.short)}</span></td><td class="num">${pct(r.shares[p.id] || 0)}</td><td class="num"><b>${p.n}</b> ${d ? `<span class="small ${d > 0 ? 'good' : 'bad'}">${signed(d, 0)}</span>` : ''}</td></tr>`; }).join('')}
          </tbody></table>
        </div>
        ${r.outcome === 'negotiating' ? '' : `<div><h3>Investiture vote</h3>`}
          <div class="row wrap small" style="gap:6px;margin:6px 0" ${r.outcome === 'negotiating' ? 'hidden' : ''}>${inv.detail.filter((d) => d.seats).map((d) => `<span class="vote-pill ${d.id === 'player' ? 'yes' : d.vote}">${esc(partyInfo(d.id).short)} ${d.seats}</span>`).join('')}</div>
          <div class="muted small" ${r.outcome === 'negotiating' ? 'hidden' : ''}>Yes ${inv.yes} · No ${inv.no} · Abstain ${inv.abstain}. ${inv.success ? (inv.round === 1 ? 'Passed in the first round (absolute majority).' : 'Passed in the second round (simple majority).') : 'Failed.'}</div>
        ${r.outcome === 'negotiating' ? '' : '</div>'}
        <div class="muted small">Turnout ${pct(r.turnout, 0)}.</div>
        ${r.analysis ? `<div style="border-top:1px solid var(--line);padding-top:14px"><h2 style="font-size:19px;margin-bottom:10px">Why this result</h2>${analysisHtml(r.analysis, { compact: true, max: 6 })}</div>` : ''}
      </div>
      <div class="modal-foot">${r.outcome === 'negotiating' ? '<button class="btn primary" data-action="negotiate">Start negotiations</button>' : `<button class="btn primary" data-action="close-modal">${r.outcome === 'won' ? 'Form a government' : r.outcome === 'hung' ? 'Campaign again' : 'Continue'}</button>`}</div>`, { wide: true });
  }

  function showGameOver() {
    const g = st.gameOver;
    const yrs = (st.turn / 4).toFixed(1);
    modal(`
      <div class="modal-head"><div class="eyebrow">Game over · ${dateLabel(st.year, st.quarter)}</div><h2>${esc(g.title)}</h2></div>
      <div class="modal-body"><p style="margin:0">${esc(g.text)}</p>
        <div class="stat-row">
          <div class="stat"><div class="k">Time in office</div><div class="v">${yrs} yrs</div></div>
          <div class="stat"><div class="k">Elections won</div><div class="v">${st.electionsWon}</div></div>
          <div class="stat"><div class="k">Score</div><div class="v">${st.score || 0}</div></div>
          <div class="stat"><div class="k">Goals</div><div class="v">${Object.keys(st.goalsDone || {}).length} / ${(st.goals || []).length}</div></div>
          <div class="stat"><div class="k">Achievements</div><div class="v">${(st.achievements || []).length}</div></div>
          <div class="stat"><div class="k">Final debt</div><div class="v">${pct(st.debt / st.gdp, 0)}</div></div>
          <div class="stat"><div class="k">Unemployment</div><div class="v">${S.sims.unemployment.fmt(st.sims.unemployment)}</div></div>
          <div class="stat"><div class="k">Housing cost</div><div class="v">${S.sims.housing.fmt(st.sims.housing)}</div></div>
          <div class="stat"><div class="k">Growth</div><div class="v">${S.sims.growth.fmt(st.sims.growth)}</div></div>
        </div></div>
      <div class="modal-foot"><button class="btn" data-action="close-modal">Close</button><button class="btn primary" data-action="new-game">New game</button></div>`);
  }

  function showHelp() {
    modal(`
      <div class="modal-head"><div class="eyebrow">How to play</div><h2>Governing Spain</h2></div>
      <div class="modal-body muted">
        <p style="margin:0">You lead a minority government. Each turn is a quarter and a term lasts four years.</p>
        <p style="margin:0">Change policies to shape the country. Each change costs political capital, which you earn every quarter.</p>
        <p style="margin:0">Keep voters happy, keep your partners in Congress on side, and keep the budget under control.</p>
        <p style="margin:0">Lose the election, or a vote of no confidence, and the game is over.</p>
      </div>
      <div class="modal-foot"><button class="btn primary" data-action="close-modal">OK</button></div>`, { dismiss: true });
  }

  function showMenu() {
    const ex = $('.menu');
    if (ex) { ex.remove(); return; }
    const m = document.createElement('div');
    m.className = 'menu';
    m.innerHTML = `<button data-action="new-game-confirm">New game…</button><button data-action="theme">Toggle light / dark</button><button data-action="export">Download save file</button><button data-action="import">Load save file…</button>`;
    document.body.appendChild(m);
    setTimeout(() => document.addEventListener('click', function off(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('click', off); } }), 0);
  }

  // ── Start screen ────────────────────────────────────────────
  const COLORS = ['#d7263d', '#b0233a', '#7a2ea8', '#e4572e', '#e89f00', '#119da4', '#2a9d3f', '#ff6f91', '#1f5ea8', '#2a4d8f', '#c08b00'];
  function showStart() {
    $('#app').hidden = true;
    const saved = store.get();
    const cfg = { name: BASE.playerDefaults.name, short: BASE.playerDefaults.short, leader: '', color: COLORS[0], difficulty: 'normal', preset: 'reality' };
    const root = $('#modal-root');
    const draw = () => {
      root.innerHTML = `<div class="start"><div class="start-card">
        <div>
          
          <h1>La Moncloa</h1>
          <p class="tag">A political simulator. You are President of the Government of Spain.</p>
          <h3 class="start-h">Scenario</h3>
          <div class="presets">${BASE.presets.map((p) => `<button class="preset" aria-pressed="${cfg.preset === p.id}" data-action="cfg-preset" data-p="${p.id}">
            <span class="row between"><b>${esc(p.name)}</b><span class="faint small">${p.id === 'random' ? '' : p.year}</span></span>
            <span class="local">${esc(p.local)} · ${esc(p.difficulty)}</span>
            <span class="small muted">${esc(p.desc)}</span></button>`).join('')}</div>
        </div>
        <div class="card form">
          ${saved && saved.version === 3 && !saved.gameOver ? `<button class="btn primary" data-action="continue">Continue: ${esc(saved.player.name)}, ${dateLabel(saved.year, saved.quarter)}</button>` : ''}
          <div class="field"><label for="f-name">Party name</label><input id="f-name" type="text" maxlength="40" value="${esc(cfg.name)}" data-cfg="name"></div>
          <div class="row" style="gap:10px">
            <div class="field" style="width:110px"><label for="f-short">Abbreviation</label><input id="f-short" type="text" maxlength="5" value="${esc(cfg.short)}" data-cfg="short"></div>
            <div class="field" style="flex:1"><label for="f-leader">Your name</label><input id="f-leader" type="text" maxlength="40" placeholder="e.g. Carmen Ortega" value="${esc(cfg.leader)}" data-cfg="leader"></div>
          </div>
          <div class="field"><label>Ideology</label><div class="opt-grid c5">${BASE.positions.lr.map((o) => `<button aria-pressed="${cfg.posLr === o.id}" data-action="cfg-pos" data-axis="posLr" data-v="${o.id}" title="${esc(o.desc || '')}">${esc(o.name)}</button>`).join('')}</div></div>
          <div class="field"><label>Territorial model</label><div class="opt-grid c3">${BASE.positions.cen.map((o) => `<button aria-pressed="${cfg.posCen === o.id}" data-action="cfg-pos" data-axis="posCen" data-v="${o.id}" title="${esc(o.desc || '')}">${esc(o.name)}</button>`).join('')}</div></div>
          ${positionSummary(cfg)}
          <div class="field"><label>Party colour</label><div class="swatches">${COLORS.map((c) => `<button class="swatch" style="background:${c}" aria-label="Colour ${c}" aria-pressed="${cfg.color === c}" data-action="cfg-color" data-c="${c}"></button>`).join('')}</div></div>
          <div class="field"><label>Difficulty</label><div class="seg">${['easy', 'normal', 'hard'].map((d) => `<button aria-pressed="${cfg.difficulty === d}" data-action="cfg-diff" data-d="${d}">${d[0].toUpperCase() + d.slice(1)}</button>`).join('')}</div></div>
          <button class="btn primary" data-action="start" style="padding:12px">Start</button>
        </div>
      </div></div>`;
    };
    draw();
    ui.startCfg = cfg;
    ui.redrawStart = draw;
    applyAccent(cfg.color);
  }

  // Party colour becomes the interface accent
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
    const side = pd.lr <= -0.5 ? 'a left-wing' : pd.lr <= -0.15 ? 'a centre-left' : pd.lr < 0.15 ? 'a centrist' : pd.lr < 0.6 ? 'a centre-right' : 'a right-wing';
    const terr = pd.cen >= 0.6 ? 'centralist' : pd.cen <= -0.25 ? 'pro-devolution' : 'mainstream';
    const rival = X.parties.slice().sort((a, b) => b.target - a.target)[0];
    const preset = BASE.presets.find((p) => p.id === cfg.preset);
    return `<div class="faint small">${side[0].toUpperCase() + side.slice(1).replace(/^an? /, '')} and ${terr}. Main rival: ${esc(rival.name)}.</div>`;
  }

  function startGame(cfg) {
    $('#modal-root').innerHTML = '';
    useScenario(cfg.preset || 'reality', Math.floor(Math.random() * 2 ** 31), cfg.posLr || cfg.posCen ? { lr: cfg.posLr || null, cen: cfg.posCen || null } : null);
    st = E.newGame(S, { partyName: cfg.name || S.playerDefaults.name, partyShort: (cfg.short || 'YOU').toUpperCase(), color: cfg.color, leader: cfg.leader || 'The President', difficulty: cfg.difficulty });
    applyAccent(st.player.color);
    ui.tab = 'overview'; ui.drawer = null; ui.draft = null;
    save();
    $('#app').hidden = false;
    render();
    showHelp();
  }

  function loadGame(saved) {
    useScenario(saved.presetId || 'reality', saved.presetSeed || 0, saved.presetPos || null);
    st = E.restore(S, saved);
    applyAccent(st.player.color);
    $('#modal-root').innerHTML = '';
    $('#app').hidden = false;
    render();
    if (st.pendingDilemma) showDilemma();
    else if (st.pendingInvestiture) showNegotiation();
    else if (st.pendingCampaign) showCampaign();
  }

  function syncPartyDefaults() {
    if (ui.startCfg.nameEdited) return;
    const pd = previewScenario(ui.startCfg).playerDefaults;
    Object.assign(ui.startCfg, { name: pd.name, short: pd.short, color: pd.color });
    applyAccent(ui.startCfg.color);
  }

  // ── Turn ────────────────────────────────────────────────────
  function nextTurn() {
    if (st.gameOver) { showGameOver(); return; }
    if (st.pendingDilemma) { showDilemma(); return; }
    if (st.pendingInvestiture) { showNegotiation(); return; }
    if (st.pendingCampaign) { showCampaign(); return; }
    const btn = $('#btn-next');
    btn.disabled = true;
    const rep = E.step(st, S);
    ui.draft = null;
    save();
    render();
    btn.disabled = !!st.gameOver;
    rep.situations.forEach((s) => {
      const sit = M.situationById[s.id];
      if (sit.bad && s.on) toast(`<b>${esc(sit.name)}</b> has begun`, 'bad');
      if (!sit.bad && !s.on) toast(`<b>${esc(sit.name)}</b> is over`, 'bad');
    });
    (rep.unlocked || []).forEach((id) => toast(`New option: <b>${esc(M.policyById[id].name)}</b>`));
    const wins = (rep.achievements || []).filter((a) => a.kind !== 'win');
    if (wins.length) herald(wins);
    const q = [];
    rep.events.forEach((e) => q.push(() => (e.dilemma ? showDilemma() : showEvent(e.id))));
    if (rep.election) q.push(() => showElection(rep.election));
    if (rep.campaign && !rep.election) q.push(() => showCampaign());
    if (st.gameOver) q.push(() => showGameOver());
    ui.queue = q;
    nextInQueue();
  }

  // ── Events ──────────────────────────────────────────────────
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-action]');
    if (!t) return;
    const a = t.dataset.action;
    switch (a) {
      case 'tab': ui.tab = t.dataset.tab; render(); window.scrollTo({ top: 0 }); break;
      case 'open': openDrawer(t.dataset.kind, t.dataset.id); break;
      case 'close-drawer': ui.drawer = null; ui.draft = null; renderDrawer(); if (ui.tab === 'policies') renderView(); break;
      case 'nav-back': navGo(-1); break;
      case 'map-mode': MAP.mode = t.dataset.m; renderView(); break;
      case 'nav-fwd': navGo(1); break;
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
        toast(`<b>${esc(M.policyById[d.id].name)}</b> updated · −${r.cost} capital`);
        ui.draft = null; save(); render();
        break;
      }
      case 'pol-abolish': {
        const id = ui.drawer.id;
        const r = E.applyPolicy(st, S, id, false, 0);
        if (!r.ok) { toast(r.reason, 'bad'); break; }
        toast(`<b>${esc(M.policyById[id].name)}</b> abolished · −${r.cost} capital`);
        ui.draft = null; save(); render();
        break;
      }
      case 'dilemma': E.resolveDilemma(st, S, +t.dataset.i); save(); render(); closeModal(); break;
      case 'camp-promise': { const c = ui.camp; const id = t.dataset.id; c.promises = c.promises.includes(id) ? c.promises.filter((x) => x !== id) : c.promises.concat(id).slice(0, 3); showCampaign(); break; }
      case 'camp-region': { const c = ui.camp; const r = t.dataset.r; c.tour = c.tour.includes(r) ? c.tour.filter((x) => x !== r) : c.tour.concat(r).slice(0, 2); showCampaign(); break; }
      case 'camp-launch': E.launchCampaign(st, S, ui.camp); ui.camp = null; save(); render(); toast('The campaign is under way'); closeModal(); break;
      case 'negotiate': showNegotiation(); break;
      case 'deal': { const r = E.acceptDeal(st, S, t.dataset.p); if (r.ok) toast(`Pact signed with <b>${esc(partyInfo(t.dataset.p).short)}</b>`, 'good'); save(); render(); showNegotiation(); break; }
      case 'investiture': {
        const out = E.holdInvestiture(st, S);
        save(); render();
        $('#modal-root').innerHTML = '';
        const q = [() => showElection(out.result)];
        if (st.gameOver) q.push(() => showGameOver());
        else if (st.pendingCampaign) q.push(() => showCampaign());
        ui.queue = q.concat(ui.queue || []);
        nextInQueue();
        const w = (out.achievements || []).filter((x) => x.kind !== 'win');
        if (w.length) herald(w);
        break;
      }
      case 'close-modal': closeModal(); break;
      case 'modal-bg': if (ev.target === t) closeModal(); break;
      case 'snap': {
        const r = E.callSnapElection(st, S);
        if (!r.ok) toast(r.reason, 'bad'); else { toast('The Cortes are dissolved. Election next quarter.'); save(); render(); showCampaign(); }
        break;
      }
      case 'continue': loadGame(store.get()); break;
      case 'start': startGame(ui.startCfg); break;
      case 'cfg-color': ui.startCfg.color = t.dataset.c; applyAccent(t.dataset.c); ui.redrawStart(); break;
      case 'cfg-diff': ui.startCfg.difficulty = t.dataset.d; ui.redrawStart(); break;
      case 'new-game': store.clear(); ui.queue = []; showStart(); break;
      case 'new-game-confirm': $('.menu') && $('.menu').remove(); if (confirm('Abandon this government and start a new game?')) { store.clear(); ui.drawer = null; showStart(); } break;
      case 'theme': {
        const r = document.documentElement;
        const dark = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
        r.dataset.theme = dark ? 'light' : 'dark';
        try { localStorage.setItem('moncloa-theme', r.dataset.theme); } catch (e) { /* ignore */ }
        $('.menu') && $('.menu').remove();
        break;
      }
      case 'export': {
        const blob = new Blob([JSON.stringify(E.serialise(st))], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `moncloa-${st.year}-Q${st.quarter}.json`; link.click();
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
          f.text().then((txt) => { try { const data = JSON.parse(txt); if (data.version !== 3) throw new Error('old'); loadGame(data); save(); toast('Save loaded'); } catch (e) { toast('That file is not a valid save', 'bad'); } });
        };
        inp.click();
        break;
      }
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

  // ── Boot ────────────────────────────────────────────────────
  try { const th = localStorage.getItem('moncloa-theme'); if (th) document.documentElement.dataset.theme = th; } catch (e) { /* ignore */ }
  const saved = store.get();
  if (saved && saved.version === 3 && !saved.gameOver && saved.scenario === S.id && new URLSearchParams(location.search).has('continue')) loadGame(saved);
  else showStart();
})();
