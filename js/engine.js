/*
 * Generic political simulation engine.
 * Knows nothing about Spain: everything country-specific comes from a scenario.
 */
(function (G) {
  'use strict';

  // ── Utilities ───────────────────────────────────────────────
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  const CURVES = {
    l: (v) => v,
    sqrt: (v) => Math.sqrt(Math.max(0, v)),
    sq: (v) => v * v,
  };
  // Diminishing returns on voter happiness: raw effects pass through a soft S-curve
  const HK = 1.8;
  const squash = (raw) => 0.5 + 0.5 * Math.tanh((raw - 0.5) * HK);
  const unsquash = (h) => 0.5 + Math.atanh(clamp((h - 0.5) * 2, -0.999, 0.999)) / HK;
  function parseFx(str) {
    if (!str) return [];
    return str.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
      const [t, a, c] = s.split(/\s+/);
      return { t, a: parseFloat(a), c: c || 'l' };
    });
  }

  // ── Model compilation ───────────────────────────────────────
  const compiled = new WeakMap();
  function model(S) {
    if (compiled.has(S)) return compiled.get(S);
    const M = { S };
    M.simIds = Object.keys(S.sims);
    M.groupIds = Object.keys(S.groups);
    M.policyById = {};
    S.policies.forEach((p) => { M.policyById[p.id] = p; p._fx = parseFx(p.fx); });
    M.simIds.forEach((id) => { S.sims[id]._fx = parseFx(S.sims[id].fx); });
    S.situations.forEach((s) => { s._fx = parseFx(s.fx); });
    M.situationById = {};
    S.situations.forEach((s) => (M.situationById[s.id] = s));
    M.eventById = {};
    S.events.forEach((e) => {
      M.eventById[e.id] = e;
      if (e.fx) e._fx = parseFx(e.fx);
      (e.choices || []).forEach((c) => (c._fx = parseFx(c.fx)));
    });
    M.isSim = (id) => !!S.sims[id];
    M.isGroup = (id) => !!S.groups[id];
    // Validate effect targets early (helps scenario authors)
    const check = (src, list) => list.forEach((e) => {
      if (!M.isSim(e.t) && !M.isGroup(e.t)) console.warn(`[scenario] ${src}: unknown target "${e.t}"`);
    });
    S.policies.forEach((p) => check('policy ' + p.id, p._fx));
    M.simIds.forEach((id) => check('sim ' + id, S.sims[id]._fx));
    S.situations.forEach((s) => check('situation ' + s.id, s._fx));
    S.events.forEach((e) => { check('event ' + e.id, e._fx || []); (e.choices || []).forEach((c) => check('event ' + e.id, c._fx)); });
    M.groupBit = {};
    M.groupIds.forEach((id, i) => (M.groupBit[id] = i));
    // Group size drivers
    M.sizeOutputs = {}; // source -> [{ g, a }]
    M.groupIds.forEach((g) => {
      const grp = S.groups[g];
      grp._size = parseFx(grp.sizeFx);
      grp._size.forEach((e) => {
        if (e.t !== 'time' && !S.sims[e.t] && !M.policyById[e.t]) console.warn(`[scenario] group ${g}: unknown size driver "${e.t}"`);
        (M.sizeOutputs[e.t] = M.sizeOutputs[e.t] || []).push({ g, a: e.a });
      });
    });
    // Reverse index: target -> sources (for explanations)
    M.inputs = {};
    const addIn = (t, src) => (M.inputs[t] = M.inputs[t] || []).push(src);
    S.policies.forEach((p) => p._fx.forEach((e) => addIn(e.t, { kind: 'policy', id: p.id, a: e.a, c: e.c })));
    M.simIds.forEach((id) => S.sims[id]._fx.forEach((e) => addIn(e.t, { kind: 'sim', id, a: e.a, c: e.c })));
    S.situations.forEach((s) => s._fx.forEach((e) => addIn(e.t, { kind: 'situation', id: s.id, a: e.a, c: e.c })));
    const seats = S.provinces.reduce((a, p) => a + p.seats, 0);
    if (seats !== S.chamberSeats) console.warn(`[scenario] provinces sum to ${seats} seats, expected ${S.chamberSeats}`);
    compiled.set(S, M);
    return M;
  }

  // ── Policy helpers ──────────────────────────────────────────
  function polVal(st, id) {
    const p = st.policies[id];
    return p && p.active ? p.v : 0;
  }

  // ── Effect accumulation ─────────────────────────────────────
  // Returns raw sums for every target (without baseline)
  function accumulate(st, M) {
    const S = M.S;
    const sum = {};
    M.simIds.forEach((id) => (sum[id] = 0));
    M.groupIds.forEach((id) => (sum[id] = 0));
    S.policies.forEach((p) => {
      const ps = st.policies[p.id];
      if (!ps.active) return;
      p._fx.forEach((e) => (sum[e.t] += e.a * CURVES[e.c](ps.v)));
    });
    M.simIds.forEach((id) => {
      const v = st.sims[id];
      S.sims[id]._fx.forEach((e) => (sum[e.t] += e.a * CURVES[e.c](v)));
    });
    S.situations.forEach((s) => {
      if (!st.situations[s.id]) return;
      s._fx.forEach((e) => (sum[e.t] += e.a));
    });
    st.modifiers.forEach((m) => {
      if (sum[m.t] !== undefined) sum[m.t] += m.a * (m.left / m.turns);
    });
    return sum;
  }

  // ── Party position (emerges from policy) ────────────────────
  function playerPosition(st, S) {
    let lr = S.playerDefaults.lr, cen = S.playerDefaults.cen;
    S.policies.forEach((p) => {
      const cur = polVal(st, p.id);
      const base = p.init == null ? 0 : p.init;
      if (p.lr) lr += p.lr * (cur - base) * 0.35;
      if (p.cen) cen += p.cen * (cur - base) * 0.35;
    });
    return { lr: clamp(lr, -1, 1), cen: clamp(cen, -1, 1) };
  }

  // Voters see your party through its brand: it follows your policies with a lag, and voters only
  // half-believe a party that reinvents itself (they credit about two-thirds of any move from where you started)
  const BRAND_SPEED = 0.12, BRAND_CREDIBILITY = 0.65;
  function perceivedPosition(st, S) {
    return st.perceived ? { lr: st.perceived.lr, cen: st.perceived.cen } : playerPosition(st, S);
  }
  function updatePerceived(st, S) {
    const a = playerPosition(st, S), pd = S.playerDefaults;
    const p = st.perceived || { lr: pd.lr, cen: pd.cen };
    p.lr += (pd.lr + (a.lr - pd.lr) * BRAND_CREDIBILITY - p.lr) * BRAND_SPEED;
    p.cen += (pd.cen + (a.cen - pd.cen) * BRAND_CREDIBILITY - p.cen) * BRAND_SPEED;
    st.perceived = p;
  }

  // ── Voter generation ────────────────────────────────────────
  // Each voter gets, for every group, a "propensity" q = u / p where p is their personal
  // chance of belonging (from region, age…). They are a member while q < the group's
  // current size multiplier, so groups can grow and shrink as the country changes.
  function generateVoters(S, seed, N = 7000) {
    const M = model(S);
    const r = mulberry32(seed ^ 0x9e3779b9);
    const totalPop = S.provinces.reduce((a, p) => a + p.pop, 0);
    const parties = allParties(S);
    const nG = M.groupIds.length;
    const counts = S.provinces.map((p) => Math.max(60, Math.round((p.pop / totalPop) * N)));
    const n = counts.reduce((a, b) => a + b, 0);
    const V = {
      n,
      prov: new Uint8Array(n),
      weight: new Float32Array(n),
      q: new Float32Array(n * nG),
      age: new Uint8Array(n), // 0 young, 1 mid, 2 old
      lr0: new Float32Array(n), // personal ideology before group membership
      cen0: new Float32Array(n),
      turnout: new Float32Array(n),
      noise: new Float32Array(n * parties.length),
    };
    let i = 0;
    S.provinces.forEach((prov, pi) => {
      const reg = S.regions[prov.region];
      const w = prov.pop / counts[pi];
      for (let k = 0; k < counts[pi]; k++, i++) {
        V.prov[i] = pi;
        V.weight[i] = w;
        const ra = r();
        const age = ra < 0.15 ? 0 : ra > 0.76 ? 2 : 1;
        V.age[i] = age;
        V.lr0[i] = gauss(r) * 0.42 + (reg.lrBias || 0);
        V.cen0[i] = gauss(r) * 0.3 + reg.cen;
        M.groupIds.forEach((gid, gi) => {
          const g = S.groups[gid];
          let p;
          if (gid === 'everyone') p = 1;
          else if (g.age === 'old') p = age === 2 ? 1 : age === 1 ? 0.05 : 0;
          else if (g.age === 'young') p = age === 0 ? 1 : age === 1 ? 0.05 : 0;
          else {
            p = g.size;
            if (g.region) p = g.region[prov.region] !== undefined ? g.region[prov.region] : g.size;
            if (g.ruralShare) p = prov.rural;
            if (g.ruralBoost) p = g.size * (1 + g.ruralBoost * prov.rural);
            if (g.tourismBoost) p = g.size * prov.tour;
            if (g.age === 'oldBias') p *= age === 2 ? 1.5 : age === 0 ? 0.6 : 1;
            if (g.age === 'youngBias') p *= age === 0 ? 1.6 : age === 2 ? 0.6 : 1;
            if (g.age === 'youngStrong') p *= age === 0 ? 2.2 : age === 2 ? 0.4 : 1;
            if (gid === 'workers' || gid === 'publicSector' || gid === 'selfEmployed') p *= age === 2 ? 0.1 : age === 1 ? 1.25 : 0.9;
            if (gid === 'unemployed') p *= age === 2 ? 0 : 1;
            if (gid === 'parents') p = age === 0 ? 0.12 : age === 1 ? 0.5 : 0.05;
          }
          p = Math.min(1, p);
          V.q[i * nG + gi] = gid === 'everyone' ? 0 : p > 0 ? r() / p : 1e9;
        });
        V.turnout[i] = age === 0 ? 0.55 : age === 1 ? 0.7 : 0.82;
        for (let k2 = 0; k2 < parties.length; k2++) {
          const u = Math.max(1e-9, r());
          V.noise[i * parties.length + k2] = -Math.log(-Math.log(u)) * 0.32;
        }
      }
    });
    return V;
  }

  // ── Group sizes ─────────────────────────────────────────────
  function sizeSourceValue(st, S, id) {
    if (id === 'time') return { cur: st.turn / 40, ref: 0, name: 'Tendencias sociales de fondo', kind: 'time' };
    if (S.sims[id]) return { cur: st.sims[id], ref: S.sims[id].init, name: S.sims[id].name, kind: 'sim' };
    const p = model(S).policyById[id];
    return { cur: polVal(st, id), ref: p.init == null ? 0 : p.init, name: p.name, kind: 'policy' };
  }
  function sizeDrivers(st, S, g) {
    return (S.groups[g]._size || []).map((e) => {
      const v = sizeSourceValue(st, S, e.t);
      return { id: e.t, kind: v.kind, name: v.name, amount: e.a, contribution: e.a * (v.cur - v.ref) };
    }).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  }
  function groupMults(st, S) {
    const M = model(S);
    return M.groupIds.map((g) => clamp(1 + sizeDrivers(st, S, g).reduce((a, d) => a + d.contribution, 0), 0.1, 4));
  }

  function allParties(S) {
    const pd = S.playerDefaults;
    return [{ id: 'player', isPlayer: true, lr: pd.lr, cen: pd.cen, target: pd.target }].concat(S.parties);
  }

  // Which parties stand in province pi
  function partyStands(S, party, prov) {
    if (party.isPlayer) return true;
    if (party.regions) return party.regions.includes(prov.region);
    if (party.provinces) return party.provinces.includes(prov.name);
    return true;
  }

  // ── Voter happiness & choice ────────────────────────────────
  const A_HAPPY = 7.0; // weight of government performance
  const B_IDEO = 2.6; // weight of ideological distance
  const CEN_W = 0.8; // territorial axis relative weight
  const REASONS = ['unhappy', 'fatigue', 'ideology', 'loyalty'];

  function runVote(st, S, opts = {}) {
    const M = model(S);
    const V = st._voters;
    const parties = allParties(S);
    const P = parties.length;
    const pos = perceivedPosition(st, S);
    parties[0].lr = pos.lr; parties[0].cen = pos.cen;
    const bias = opts.bias || st.partyBias;
    const stands = S.provinces.map((prov) => parties.map((p) => partyStands(S, p, prov)));
    const nG = M.groupIds.length;
    const mult = groupMults(st, S);
    const gh = M.groupIds.map((g) => st.groupHappy[g]);
    const glr = M.groupIds.map((g) => (S.groups[g].lr || 0) * 0.35);
    const gcen = M.groupIds.map((g) => (S.groups[g].cen || 0) * 0.35);

    const national = new Float64Array(P);
    const byProv = S.provinces.map(() => new Float64Array(P));
    const groupW = new Float64Array(nG), groupPlayer = new Float64Array(nG);
    const groupSwing = new Float64Array(nG), groupRisk = new Float64Array(nG), groupUnhappyDefect = new Float64Array(nG);
    const reasonW = parties.map(() => new Float64Array(REASONS.length));
    const choice = new Uint8Array(V.n);
    const member = new Uint8Array(nG);
    let approvalW = 0, turnoutW = 0, adultW = 0, unhappyDefectW = 0;
    const cyn = st.fatigue || 0;

    for (let i = 0; i < V.n; i++) {
      let hs = 0, hc = 0, lr = V.lr0[i], cen = V.cen0[i];
      const qo = i * nG;
      for (let g = 0; g < nG; g++) {
        if (V.q[qo + g] < mult[g]) { member[g] = 1; hs += gh[g]; hc++; lr += glr[g]; cen += gcen[g]; } else member[g] = 0;
      }
      lr = clamp(lr, -1, 1); cen = clamp(cen, -1, 1);
      const H = hc ? hs / hc : 0.5;
      const w = V.weight[i];
      adultW += w;
      approvalW += w / (1 + Math.exp(-(H - 0.497) / 0.025));
      const pi = V.prov[i];
      const perf = A_HAPPY * (H - 0.5) - cyn;
      let best = -1, bestU = -1e9, second = -1e9, U0 = 0, ideoP = 0, ideoBest = 0;
      for (let k = 0; k < P; k++) {
        if (!stands[pi][k]) continue;
        const pk = parties[k];
        const dl = lr - pk.lr, dc = cen - pk.cen;
        const ideo = -B_IDEO * (dl * dl + CEN_W * dc * dc);
        let U = ideo + (bias[pk.id] || 0) + V.noise[i * P + k];
        if (k === 0) { U += perf; U0 = U; ideoP = ideo; }
        if (U > bestU) { second = bestU; bestU = U; best = k; ideoBest = ideo; } else if (U > second) second = U;
      }
      choice[i] = best;
      const turn = clamp(V.turnout[i] + 0.35 * Math.abs(H - 0.5), 0.2, 0.97);
      const ww = w * turn;
      turnoutW += ww;
      national[best] += ww;
      byProv[pi][best] += ww;
      // Why did this voter pick this party?
      let reason = -1, swing = false, risk = false;
      if (best !== 0) {
        if (perf < 0 && U0 - perf >= bestU) reason = H < 0.5 ? 0 : 1; // would back you if they were content / not tired of you
        else reason = ideoBest > ideoP ? 2 : 3;
        reasonW[best][reason] += ww;
        swing = bestU - U0 < 0.5;
        if (reason === 0) unhappyDefectW += ww;
      } else risk = bestU - second < 0.5;
      for (let g = 0; g < nG; g++) if (member[g]) {
        groupW[g] += w;
        if (best === 0) { groupPlayer[g] += w; if (risk) groupRisk[g] += w; }
        else { if (swing) groupSwing[g] += w; if (reason === 0) groupUnhappyDefect[g] += ww; }
      }
    }
    const tot = national.reduce((a, b) => a + b, 0);
    const shares = {};
    parties.forEach((p, k) => (shares[p.id] = national[k] / tot));
    const groupStats = {};
    M.groupIds.forEach((g, k) => (groupStats[g] = {
      size: groupW[k] / adultW,
      player: groupW[k] ? groupPlayer[k] / groupW[k] : 0,
      swing: groupW[k] ? groupSwing[k] / groupW[k] : 0, // persuadable non-supporters
      risk: groupW[k] ? groupRisk[k] / groupW[k] : 0, // wavering supporters
      unhappyDefect: unhappyDefectW ? groupUnhappyDefect[k] / unhappyDefectW : 0,
    }));
    const reasons = {};
    parties.forEach((p, k) => { if (k) reasons[p.id] = Object.fromEntries(REASONS.map((r, j) => [r, reasonW[k][j] / tot])); });
    return { shares, byProv, parties, approval: approvalW / adultW, turnout: turnoutW / adultW, groupStats, reasons, choice, mult };
  }

  function dhondt(votes, seats, threshold) {
    const total = votes.reduce((a, b) => a + b, 0);
    const eligible = votes.map((v) => v >= total * threshold);
    const alloc = votes.map(() => 0);
    for (let s = 0; s < seats; s++) {
      let best = -1, bq = -1;
      for (let k = 0; k < votes.length; k++) {
        if (!eligible[k]) continue;
        const q = votes[k] / (alloc[k] + 1);
        if (q > bq) { bq = q; best = k; }
      }
      if (best >= 0) alloc[best]++;
    }
    return alloc;
  }

  function seatsFrom(S, vote, noiseR) {
    const seats = {};
    vote.parties.forEach((p) => (seats[p.id] = 0));
    const byProvSeats = [];
    S.provinces.forEach((prov, pi) => {
      let votes = Array.from(vote.byProv[pi]);
      if (noiseR) votes = votes.map((v) => v * (1 + gauss(noiseR) * 0.04));
      const alloc = dhondt(votes, prov.seats, S.threshold);
      const rec = {};
      alloc.forEach((n, k) => { if (n) { seats[vote.parties[k].id] += n; rec[vote.parties[k].id] = n; } });
      byProvSeats.push(rec);
    });
    return { seats, byProvSeats };
  }

  // ── Investiture & coalition logic ───────────────────────────
  function partyStance(st, S, party) {
    if (party.isPlayer) return { score: 9, vote: 'yes', reasons: [] };
    const pos = playerPosition(st, S);
    const pr = party.partner || { lrW: 1, cenW: 0.5, aff: 0 };
    const lrPen = pr.lrW * Math.abs(pos.lr - party.lr), cenPen = pr.cenW * Math.abs(pos.cen - party.cen);
    let score = 1 + (pr.aff || 0) - lrPen - cenPen;
    const reasons = [];
    if (lrPen > 0.3) reasons.push({ ok: false, text: `Te ven demasiado a la ${pos.lr < party.lr ? 'izquierda' : 'derecha'}` });
    else if (lrPen < 0.15) reasons.push({ ok: true, text: 'Cercanos a ti ideológicamente' });
    if (cenPen > 0.25) reasons.push({ ok: false, text: `Te ven demasiado ${pos.cen > party.cen ? 'centralista' : 'autonomista'}` });
    if ((pr.aff || 0) <= -0.3) reasons.push({ ok: false, text: 'Profundamente hostiles a tu partido' });
    (pr.demands || []).forEach(([pid, thr, bonus]) => {
      const v = polVal(st, pid);
      const pol = model(S).policyById[pid];
      if (bonus > 0 && v >= thr) { score += bonus; reasons.push({ ok: true, text: `${pol.name}: «${levelLabel(pol, thr)}» o más` }); }
      else if (bonus > 0) reasons.push({ ok: false, text: `Exige ${pol.name}: «${levelLabel(pol, thr)}» o más` });
      if (bonus < 0 && v > thr) { score += bonus; reasons.push({ ok: false, text: `Rechaza: ${pol.name}` }); }
    });
    const vote = score >= 0.5 ? 'yes' : score >= 0.2 ? 'abstain' : 'no';
    return { score, vote, reasons };
  }

  function investiture(st, S, seats) {
    const parties = allParties(S);
    let yes = 0, no = 0, abstain = 0;
    const detail = parties.map((p) => {
      const n = seats[p.id] || 0;
      const s = partyStance(st, S, p);
      if (s.vote === 'yes') yes += n; else if (s.vote === 'no') no += n; else abstain += n;
      return { id: p.id, seats: n, vote: s.vote, score: s.score, reasons: s.reasons };
    });
    const first = yes >= S.majority;
    const second = yes > no;
    return { yes, no, abstain, detail, success: first || second, round: first ? 1 : second ? 2 : 0 };
  }

  // Can the opposition form a government instead?
  function alternativeGovernment(st, S, seats) {
    const parties = S.parties.slice().sort((a, b) => (seats[b.id] || 0) - (seats[a.id] || 0));
    const leader = parties[0];
    let yes = seats[leader.id] || 0, no = seats.player || 0;
    const backers = [leader.id];
    const hardRight = S.parties.filter((p) => p.cen > 0.8).map((p) => p.id);
    const needsHardRight = !hardRight.includes(leader.id);
    parties.slice(1).forEach((p) => {
      const n = seats[p.id] || 0;
      const pr = p.partner || { lrW: 1, cenW: 0.5 };
      let score = 0.9 - pr.lrW * Math.abs(leader.lr - p.lr) - Math.max(pr.cenW, 0.4) * Math.abs(leader.cen - p.cen);
      if (p.cen < -0.5 && (hardRight.includes(leader.id) || (needsHardRight && leader.cen > 0.3))) score = -1;
      if (score >= 0.2) { yes += n; backers.push(p.id); } else if (score < 0) no += n;
    });
    return { leader: leader.id, yes, no, success: yes >= S.majority, backers };
  }

  // ── Labels ──────────────────────────────────────────────────
  function levelLabel(p, v) {
    if (p.fmtLevel) return p.fmtLevel(v);
    const L = p.levels || ['Muy bajo', 'Bajo', 'Moderado', 'Alto', 'Muy alto'];
    return L[Math.min(L.length - 1, Math.floor(v * L.length * 0.9999))];
  }

  // ── Macro-economy: who earns what (tax bases) ──────────────
  const MACRO_DEFAULT = { labourForce: 24.6, labourShare: 0.47, consumptionShare: 0.57, profitShare: 0.42, incomeTaxProgressivity: 0.5 };
  function macroParams(S) {
    const m = Object.assign({}, MACRO_DEFAULT, S.macro || {});
    if (!m._fx) m._fx = parseFx(m.labourShareFx);
    return m;
  }
  function computeMacro(st, S) {
    const mp = macroParams(S);
    let ls = mp.labourShare;
    mp._fx.forEach((e) => { const v = sizeSourceValue(st, S, e.t); ls += e.a * (v.cur - v.ref); });
    ls = clamp(ls, 0.35, 0.6);
    const lf = st.labourForce || mp.labourForce;
    const u = st.sims.unemployment * 0.3;
    const employed = lf * (1 - u);
    const wageBill = st.gdp * ls;
    const realG = (st.sims.growth * 10 - 3) / 100, realG0 = (S.sims.growth.init * 10 - 3) / 100;
    return {
      labourShare: ls, labourForce: lf, employed, unemployedPeople: lf * u,
      wageBill, avgWage: wageBill / employed, // € thousand per worker per year
      consumption: st.gdp * mp.consumptionShare * (1 + 0.3 * (st.sims.tourism - S.sims.tourism.init)),
      profits: Math.max(0.1 * st.gdp, st.gdp * (mp.profitShare - (ls - mp.labourShare)) * (1 + 4 * (realG - realG0))),
    };
  }
  // What moves the labour share (wages as % of GDP), and by how much so far
  function labourShareDrivers(st, S) {
    return macroParams(S)._fx.map((e) => { const v = sizeSourceValue(st, S, e.t); return { id: e.t, kind: v.kind, name: v.name, amount: e.a, contribution: e.a * (v.cur - v.ref) }; });
  }
  const TAX_BASES = {
    wages: { name: 'Masa salarial', desc: 'Total de salarios pagados' },
    wagesProg: { name: 'Masa salarial (progresiva)', desc: 'Salarios, con tramos progresivos' },
    consumption: { name: 'Consumo', desc: 'Gasto de hogares y turistas' },
    profits: { name: 'Excedente empresarial', desc: 'Beneficios de las empresas' },
    tourism: { name: 'Pernoctaciones', desc: 'Estancias turísticas' },
    gdp: { name: 'PIB nominal', desc: 'Crecimiento más inflación' },
    ageing: { name: 'Pensionistas', desc: 'Número de jubilados' },
    unemp: { name: 'Parados', desc: 'Número de desempleados' },
  };

  // ── Budget ──────────────────────────────────────────────────
  // Policy budget amounts are written for an economy of size budgetRefGdp; scale them to this scenario
  function scaleFor(st, S, kind, mac) {
    const ref = S.budgetRefGdp || S.gdp0;
    const gf = st.gdp / ref;
    const size0 = S.gdp0 / ref;
    const m0 = st.macro0;
    if (m0 && (kind === 'wages' || kind === 'wagesProg' || kind === 'consumption' || kind === 'profits')) {
      mac = mac || computeMacro(st, S);
      if (kind === 'wages') return size0 * mac.wageBill / m0.wageBill;
      if (kind === 'wagesProg') return size0 * (mac.wageBill / m0.wageBill) * Math.pow(mac.avgWage / m0.avgWage, macroParams(S).incomeTaxProgressivity);
      if (kind === 'consumption') return size0 * mac.consumption / m0.consumption;
      if (kind === 'profits') return size0 * mac.profits / m0.profits;
    }
    switch (kind) {
      case 'ageing': return gf * (1 + (st.sims.ageing - 0.5) * 1.6);
      case 'unemp': return gf * (st.sims.unemployment / S.sims.unemployment.init);
      case 'tourism': return gf * (st.sims.tourism / S.sims.tourism.init);
      default: return gf;
    }
  }
  function policyBudget(st, S, p, v, mac) {
    if (!p.budget) return 0;
    const [, amt, sc] = p.budget;
    return amt * v * scaleFor(st, S, sc, mac);
  }
  function budget(st, S) {
    const rev = [], spend = [];
    let R = 0, X = 0;
    const mac = computeMacro(st, S);
    S.policies.forEach((p) => {
      if (!p.budget || !st.policies[p.id].active) return;
      const val = policyBudget(st, S, p, st.policies[p.id].v, mac);
      const item = { id: p.id, name: p.name, v: val, base: p.budget[2], scale: scaleFor(st, S, p.budget[2], mac) };
      if (p.budget[0] === 'rev') { rev.push(item); R += val; }
      else { spend.push(item); X += val; }
    });
    (S.externalBudget || []).forEach((x) => {
      const val = x.amount * st.sims[x.sim];
      if (x.kind === 'rev') { rev.push({ id: '_x_' + x.sim, name: x.name, v: val, sim: x.sim }); R += val; }
      else { spend.push({ id: '_x_' + x.sim, name: x.name, v: val, sim: x.sim }); X += val; }
    });
    const gf = st.gdp / S.gdp0;
    const otherRev = st.calib.otherRev * gf;
    const otherSpend = st.calib.otherSpend * gf;
    const interest = st.debt * st.effRate;
    rev.push({ id: '_other', name: 'Otros ingresos (tributos locales, tasas, UE)', v: otherRev }); R += otherRev;
    spend.push({ id: '_other', name: 'Administración general y otros', v: otherSpend }); X += otherSpend;
    spend.push({ id: '_interest', name: 'Intereses de la deuda', v: interest }); X += interest;
    rev.sort((a, b) => b.v - a.v); spend.sort((a, b) => b.v - a.v);
    return { revenue: R, spending: X, deficit: X - R, rev, spend, interest, macro: mac };
  }

  // ── Game state ──────────────────────────────────────────────
  function newGame(S, opts = {}) {
    const M = model(S);
    const seed = opts.seed || Math.floor(Math.random() * 2 ** 31);
    const diff = opts.difficulty || 'normal';
    const st = {
      version: 3,
      scenario: S.id,
      presetId: S.presetId || 'reality',
      presetSeed: S.presetSeed || 0,
      presetPos: S.presetPos || null,
      changes: [],
      lastChanges: [],
      seed,
      rngState: seed,
      difficulty: diff,
      player: {
        name: opts.partyName || S.playerDefaults.name,
        short: opts.partyShort || S.playerDefaults.short,
        color: opts.color || S.playerDefaults.color,
        leader: opts.leader || 'President',
      },
      turn: 0,
      year: S.startYear,
      quarter: 1,
      sims: {},
      policies: {},
      situations: {},
      modifiers: [],
      groupHappy: {},
      base: {},
      gdp: S.gdp0,
      debt: S.debt0,
      effRate: S.effRate0,
      capital: diff === 'easy' ? 40 : diff === 'hard' ? 15 : 25,
      fatigue: 0,
      history: { sims: {}, groups: {}, polls: [], approval: [], budget: [] },
      news: [],
      eventCooldown: {},
      pendingDilemma: null,
      lastElectionTurn: 0,
      nextElectionTurn: S.termLength,
      electionsWon: 0,
      repeatElection: false,
      gameOver: null,
      lastElection: null,
      oneOff: 0,
    };
    M.simIds.forEach((id) => (st.sims[id] = S.sims[id].init));
    S.policies.forEach((p) => (st.policies[p.id] = { active: p.init != null, v: p.init == null ? 0.5 : p.init }));
    S.situations.forEach((s) => (st.situations[s.id] = false));
    M.groupIds.forEach((g) => (st.groupHappy[g] = S.groups[g].start));

    // Calibrate baselines: starting state is an equilibrium
    const sum = accumulate(st, M);
    M.simIds.forEach((id) => (st.base[id] = S.sims[id].init - sum[id]));
    M.groupIds.forEach((g) => (st.base[g] = unsquash(S.groups[g].start) - sum[g]));
    // Situations that are already true at start
    S.situations.forEach((s) => {
      const x = s.trigger(st.sims);
      st.situations[s.id] = s.below ? x < s.on : x > s.on;
    });
    const sum2 = accumulate(st, M);
    M.simIds.forEach((id) => (st.base[id] = S.sims[id].init - sum2[id]));
    M.groupIds.forEach((g) => (st.base[g] = unsquash(S.groups[g].start) - sum2[g]));

    // Calibrate budget so starting deficit/revenue match reality
    st.labourForce = macroParams(S).labourForce;
    st.macro0 = computeMacro(st, S);
    st.calib = { otherRev: 0, otherSpend: 0 };
    const b0 = budget(st, S);
    st.calib.otherRev = S.revenueShare0 * S.gdp0 - b0.revenue;
    const b1 = budget(st, S);
    st.calib.otherSpend = b1.revenue + S.targetDeficit0 * S.gdp0 - b1.spending;
    st.lastBudget = budget(st, S);

    // Voters & party calibration
    st._voters = generateVoters(S, seed);
    calibrateParties(st, S);
    const v = runVote(st, S);
    const res = seatsFrom(S, v);
    st.seats = res.seats;
    st.lastElection = { turn: 0, year: st.year, quarter: st.quarter, shares: v.shares, seats: res.seats, byProvSeats: res.byProvSeats, invest: investiture(st, S, res.seats), initial: true };
    recordHistory(st, S, v, res);
    st.snapshot = takeSnapshot(st, S, v);
    // Rewards: start from what is already true, so only progress is celebrated
    st.score = 0; st.achievements = []; st.awarded = {}; st.goalsDone = {};
    st.goals = (S.goals || []).map((g) => Object.assign({}, g));
    const c0 = achievementCtx(st, S);
    (S.milestones || []).forEach((m) => { try { if (m.test(c0)) st.awarded['ms-' + m.id] = true; } catch (e) { /* ignore */ } });
    st.groupsWon = {};
    Object.keys(v.groupStats).forEach((g) => (st.groupsWon[g] = v.groupStats[g].player >= GROUP_WON));
    st.leading = isLeading(v.shares);
    addNews(st, 'info', `${st.player.leader} toma posesión como presidente del Gobierno`, `Tras unas elecciones ajustadas, ${st.player.name} forma un gobierno en minoría con el apoyo de partidos pequeños. Las próximas generales serán en ${S.startYear + 4}.`);
    return st;
  }

  function calibrateParties(st, S) {
    const parties = allParties(S);
    st.partyBias = {};
    parties.forEach((p) => (st.partyBias[p.id] = 0));
    const tot = parties.reduce((a, p) => a + p.target, 0);
    for (let it = 0; it < 80; it++) {
      const v = runVote(st, S);
      const step = it < 20 ? 0.35 : 0.2;
      parties.forEach((p) => {
        const s = Math.max(1e-4, v.shares[p.id]);
        st.partyBias[p.id] += step * Math.log(p.target / tot / s);
      });
    }
  }

  function restore(S, saved) {
    const st = JSON.parse(JSON.stringify(saved));
    st._voters = generateVoters(S, st.seed);
    return st;
  }
  function serialise(st) {
    const o = Object.assign({}, st);
    delete o._voters;
    delete o._rng;
    return JSON.parse(JSON.stringify(o));
  }

  function rand(st) {
    // deterministic, saveable RNG
    const r = mulberry32(st.rngState);
    const x = r();
    st.rngState = (st.rngState * 1103515245 + 12345 + Math.floor(x * 1e6)) >>> 0;
    return x;
  }

  function addNews(st, kind, title, text) {
    st.news.unshift({ turn: st.turn, year: st.year, quarter: st.quarter, kind, title, text });
    if (st.news.length > 120) st.news.length = 120;
  }

  function recordHistory(st, S, vote, res) {
    const seats = res.seats;
    const M = model(S);
    M.simIds.forEach((id) => (st.history.sims[id] = st.history.sims[id] || []).push(+st.sims[id].toFixed(4)));
    M.groupIds.forEach((g) => (st.history.groups[g] = st.history.groups[g] || []).push(+st.groupHappy[g].toFixed(4)));
    st.history.groupSize = st.history.groupSize || {};
    M.groupIds.forEach((g) => (st.history.groupSize[g] = st.history.groupSize[g] || []).push(+vote.groupStats[g].size.toFixed(4)));
    const r = mulberry32((st.seed + st.turn * 7919) >>> 0);
    const poll = {};
    Object.keys(vote.shares).forEach((k) => (poll[k] = Math.max(0, vote.shares[k] + gauss(r) * 0.006 * Math.sqrt(vote.shares[k] * 10))));
    const pt = Object.values(poll).reduce((a, b) => a + b, 0);
    Object.keys(poll).forEach((k) => (poll[k] = +(poll[k] / pt).toFixed(4)));
    st.history.polls.push({ turn: st.turn, label: `T${st.quarter} ${st.year}`, shares: poll, seats });
    st.history.approval.push(+vote.approval.toFixed(4));
    const b = st.lastBudget;
    const mac = b.macro || computeMacro(st, S);
    st.history.budget.push({ deficit: +(b.deficit / st.gdp).toFixed(4), debt: +(st.debt / st.gdp).toFixed(4), gdp: Math.round(st.gdp), revenue: +b.revenue.toFixed(1),
      employed: +mac.employed.toFixed(3), avgWage: +mac.avgWage.toFixed(2), prices: +(st.priceLevel || 1).toFixed(4), labourShare: +mac.labourShare.toFixed(4), wageBill: +mac.wageBill.toFixed(1) });
    st.lastVote = { shares: vote.shares, approval: vote.approval, turnout: vote.turnout, groupStats: vote.groupStats, reasons: vote.reasons, projected: seats, byProvSeats: res.byProvSeats,
      byProv: vote.byProv.map((a) => Array.from(a, (x) => +x.toFixed(4))), partyOrder: vote.parties.map((p) => p.id) };
  }

  // ── Policy changes ──────────────────────────────────────────
  const TAX_RAISE_MULT = 2.5;
  function changeCost(st, S, id, active, v) {
    const p = model(S).policyById[id];
    const cur = st.policies[id];
    let mult = st.difficulty === 'easy' ? 0.75 : st.difficulty === 'hard' ? 1.25 : 1;
    const isTax = p.cat === 'tax' && p.budget && p.budget[0] === 'rev' && !p.popularTax;
    if (!cur.active && active) return Math.ceil(p.intro * mult * (isTax ? 1.5 : 1));
    if (isTax && active && v > cur.v) mult *= TAX_RAISE_MULT; // voters hate tax rises
    if (cur.active && !active) return Math.ceil(p.intro * 0.6 * mult);
    if (!active) return 0;
    const d = Math.abs(v - cur.v);
    if (d < 0.005) return 0;
    return Math.max(1, Math.ceil(p.intro * d * 1.1 * mult));
  }
  function policyAvailable(st, S, id) {
    const p = model(S).policyById[id];
    return !p.availableFrom || st.year >= p.availableFrom;
  }
  function applyPolicy(st, S, id, active, v) {
    if (active && !st.policies[id].active && !policyAvailable(st, S, id)) return { ok: false, cost: 0, reason: 'Todavía no es posible' };
    const cost = changeCost(st, S, id, active, v);
    if (cost > st.capital) return { ok: false, cost, reason: 'No tienes suficiente capital político' };
    const p = model(S).policyById[id];
    const cur = st.policies[id];
    const was = cur.active;
    st.changes = st.changes || [];
    let ch = st.changes.find((c) => c.id === id);
    if (!ch) { ch = { id, from: { active: cur.active, v: cur.v }, cost: 0, budgetBefore: was ? policyBudget(st, S, p, cur.v) : 0 }; st.changes.push(ch); }
    ch.cost += cost;
    ch.to = { active, v: active ? clamp(v) : cur.v };
    cur.active = active;
    if (active) cur.v = clamp(v);
    st.capital -= cost;
    st.changedThisTurn = st.changedThisTurn || [];
    st.changedThisTurn.push(id);
    const verb = !was && active ? 'aprobada' : was && !active ? 'derogada' : 'modificada';
    addNews(st, 'policy', `${p.name}: ${verb}`, active ? `Nuevo nivel: «${levelLabel(p, cur.v)}».` : `${p.name} queda derogada.`);
    return { ok: true, cost };
  }

  // ── Turn simulation ─────────────────────────────────────────
  function step(st, S) {
    const M = model(S);
    if (st.gameOver) return { events: [], situations: [], achievements: [], unlocked: [] };
    st.pendingInvestiture = false;
    if (st.pendingCampaign) launchCampaign(st, S, {});
    const report = { events: [], situations: [], election: null, achievements: [], unlocked: [] };
    st.changedThisTurn = [];
    st.lastChanges = (st.changes || []).filter((c) => c.from.active !== c.to.active || Math.abs(c.from.v - c.to.v) > 0.004).map((c) => Object.assign({ turn: st.turn, year: st.year, quarter: st.quarter }, c));
    st.changes = [];

    // 1. World forces
    const r = () => rand(st);
    M.simIds.forEach((id) => {
      const d = S.sims[id].drive;
      if (!d) return;
      const t = st.turn + 1;
      const target = (d.mean != null ? d.mean : S.sims[id].init) + (d.trend || 0) * t + (d.amp ? d.amp * Math.sin((t + (d.phase || 0)) * 2 * Math.PI / (d.period || 30)) : 0);
      const v = st.sims[id] + (d.rev != null ? d.rev : 0.1) * (target - st.sims[id]) + (d.vol ? gauss(r) * d.vol : 0);
      st.sims[id] = clamp(v, d.min != null ? d.min : 0, d.max != null ? d.max : 1);
    });
    st.sims.debtRatio = st.debt / st.gdp;
    st.sims.deficitRatio = Math.max(-0.5, (st.lastBudget.deficit / st.gdp) * 10);
    if (S.sims.realWage && st.lastBudget.macro && st.macro0) {
      const real = st.lastBudget.macro.avgWage / (st.priceLevel || 1);
      // voters expect real pay to grow about 1% a year; only beating that pleases them
      st.sims.realWage = clamp(0.5 + (Math.log(real / st.macro0.avgWage) - 0.0025 * st.turn) * 2.5);
    }

    // 2. Indicators move toward their targets
    const sum = accumulate(st, M);
    M.simIds.forEach((id) => {
      const s = S.sims[id];
      if (s.external) return;
      const target = clamp(st.base[id] + sum[id] + gauss(r) * 0.004);
      st.sims[id] = clamp(st.sims[id] + (target - st.sims[id]) * s.inertia);
    });
    // 3. Voter groups
    const sum2 = accumulate(st, M);
    M.groupIds.forEach((g) => {
      const target = squash(st.base[g] + sum2[g]);
      st.groupHappy[g] = clamp(st.groupHappy[g] + (target - st.groupHappy[g]) * 0.5);
      // Adaptation: voters get used to good times and slowly forgive bad ones
      st.base[g] -= 0.02 * (st.groupHappy[g] - S.groups[g].start);
    });

    // 4. Situations
    S.situations.forEach((s) => {
      const x = s.trigger(st.sims);
      const was = st.situations[s.id];
      const now = was ? (s.below ? x < s.off : x > s.off) : (s.below ? x < s.on : x > s.on);
      if (now !== was) {
        st.situations[s.id] = now;
        report.situations.push({ id: s.id, on: now });
        addNews(st, s.bad ? (now ? 'bad' : 'good') : (now ? 'good' : 'bad'), now ? `Comienza: ${s.name}` : `Fin de: ${s.name}`, now ? s.desc : `${s.name}: la situación ha terminado.`);
      }
    });

    // 5. Modifiers fade
    st.modifiers.forEach((m) => m.left--);
    st.modifiers = st.modifiers.filter((m) => m.left > 0);

    // 6. Budget, GDP, debt
    const b = budget(st, S);
    st.lastBudget = b;
    const realG = (st.sims.growth * 10 - 3) / 100;
    const infl = (st.sims.inflation * 10 - 0.5) / 100;
    const marketRate = S.marketRate ? S.marketRate(st.sims) : S.baseMarketRate + st.sims.riskPremium * 0.06;
    st.effRate += (marketRate - st.effRate) * 0.035;
    st.debt += b.deficit / 4 + st.oneOff;
    st.oneOff = 0;
    st.gdp *= 1 + (realG + infl) / 4;
    st.priceLevel = (st.priceLevel || 1) * (1 + infl / 4);
    st.realIndex = (st.realIndex || 1) * (1 + realG / 4);
    // Labour force: immigrants join, baby boomers retire (million people / year)
    st.labourForce = (st.labourForce || macroParams(S).labourForce) + (0.6 * st.sims.immigration - 0.18 - (st.sims.ageing - 0.5) * 0.3) / 4;

    // 7. Political capital
    const bloc = govBlocSeats(st, S);
    let income = 4 + 8 * (bloc / S.chamberSeats);
    if (bloc >= S.majority) income += 2;
    S.situations.forEach((s) => { if (st.situations[s.id] && s.capital) income += s.capital; });
    income *= st.difficulty === 'easy' ? 1.3 : st.difficulty === 'hard' ? 0.8 : 1;
    st.capitalIncome = Math.round(income * 10) / 10;
    st.capital = Math.min(150, st.capital + income);
    st.fatigue += st.difficulty === 'hard' ? 0.011 : st.difficulty === 'easy' ? 0.003 : 0.007;

    // 8. Advance date
    st.turn++;
    st.quarter++;
    if (st.quarter > 4) {
      st.quarter = 1; st.year++;
      S.policies.forEach((p) => {
        if (p.availableFrom === st.year) {
          report.unlocked.push(p.id);
          addNews(st, 'info', `Nueva opción: ${p.name}`, `${p.name} ya es posible.`);
        }
      });
    }

    updatePerceived(st, S);

    // 9. Events (at most one)
    rollEvents(st, S, report);

    // 10. Polls
    const v = runVote(st, S);
    recordHistory(st, S, v, seatsFrom(S, v));

    // 11. Motion of no confidence
    if (!st.pendingDilemma && st.turn - st.lastElectionTurn > 3 && st.turn < st.nextElectionTurn - 1) {
      const inv = investiture(st, S, st.seats);
      if (inv.no >= S.majority) {
        const alt = alternativeGovernment(st, S, st.seats);
        const lead = v.shares[alt.leader] > v.shares.player;
        if (alt.success && lead && r() < 0.35) {
          st.gameOver = { reason: 'censure', title: 'Moción de censura', text: `${partyName(S, alt.leader)} presenta una moción de censura y la gana con ${alt.yes} votos. Sales de La Moncloa.` };
          addNews(st, 'bad', 'El Gobierno cae en una moción de censura', st.gameOver.text);
        } else if (inv.no >= S.majority && !st.censureWarned) {
          st.censureWarned = true;
          addNews(st, 'bad', 'La oposición tantea una moción de censura', `Los partidos contrarios a tu gobierno suman ${inv.no} escaños: bastan para derribarte si se ponen de acuerdo en un candidato.`);
        }
      } else st.censureWarned = false;
    }

    checkAchievements(st, S, report);
    checkPromisesAndPacts(st, S, report);

    // 12. Elections
    if (!st.gameOver && st.turn >= st.nextElectionTurn) {
      report.election = holdElection(st, S);
      if (report.election.outcome === 'won') winRewards(st, S, report, report.election);
    }
    // Campaign season: two quarters before the vote
    if (!st.gameOver && !st.pendingInvestiture && !st.campaign && !st.pendingCampaign && st.nextElectionTurn > st.turn && st.nextElectionTurn - st.turn <= 2) openCampaign(st, S, report);
    return report;
  }

  function govBlocSeats(st, S) {
    const inv = investiture(st, S, st.seats);
    return inv.yes;
  }

  function partyName(S, id) {
    if (id === 'player') return 'Tu partido';
    const p = S.parties.find((x) => x.id === id);
    return p ? p.name : id;
  }

  function evalCtx(st, S) {
    return {
      sims: st.sims, groupHappy: st.groupHappy, situations: st.situations, turn: st.turn,
      quarter: st.quarter, year: st.year, pol: (id) => polVal(st, id),
    };
  }

  function eventWhy(e, ctx) {
    if (!e.why) return [];
    try { return e.why(ctx).filter(Boolean); } catch (err) { return []; }
  }
  // Chance of each event next quarter, and what is pushing it up
  function eventRisks(st, S) {
    const q = st.quarter === 4 ? 1 : st.quarter + 1;
    const ctx = Object.assign(evalCtx(st, S), { quarter: q, year: st.quarter === 4 ? st.year + 1 : st.year, turn: st.turn + 1 });
    return S.events.map((e) => {
      let p = 0;
      try { p = e.chance(ctx); } catch (err) { p = 0; }
      const cooling = (st.eventCooldown[e.id] || -99) > st.turn + 1 - 8;
      return { id: e.id, title: e.title, local: e.local, p: cooling ? 0 : clamp(p), why: eventWhy(e, ctx), dilemma: !!e.choices, cooling };
    }).sort((a, b) => b.p - a.p);
  }

  function rollEvents(st, S, report) {
    if (st.pendingDilemma) return;
    const ctx = evalCtx(st, S);
    const order = S.events.slice().sort(() => rand(st) - 0.5);
    for (const e of order) {
      if ((st.eventCooldown[e.id] || -99) > st.turn - 8) continue;
      let p = 0;
      try { p = e.chance(ctx); } catch (err) { p = 0; }
      if (rand(st) < p) {
        st.eventCooldown[e.id] = st.turn;
        const why = eventWhy(e, ctx);
        st.lastEventWhy = { id: e.id, why };
        if (e.choices) {
          st.pendingDilemma = e.id;
          report.events.push({ id: e.id, dilemma: true, why });
        } else {
          applyEventFx(st, S, e);
          addNews(st, 'event', e.title, e.text + (why.length ? ' Factores: ' + why.join('; ') + '.' : ''));
          report.events.push({ id: e.id, dilemma: false, why });
        }
        break;
      }
    }
  }

  function applyEventFx(st, S, e) {
    (e._fx || []).forEach((f) => st.modifiers.push({ t: f.t, a: f.a, turns: e.turns || 4, left: e.turns || 4, src: e.id, label: e.label || null }));
    if (e.capital) st.capital = Math.max(0, st.capital + e.capital);
    if (e.cost) st.oneOff += e.cost;
    if (e.revenue) st.oneOff -= e.revenue;
    const pl = (e.policies || []).concat(e.policy ? [e.policy] : []);
    pl.forEach(([pid, d]) => {
      const ps = st.policies[pid];
      if (!ps.active) { ps.active = d > 0; ps.v = clamp(d > 0 ? d : 0.5); }
      else ps.v = clamp(ps.v + d);
      if (ps.active && ps.v <= 0.001 && model(S).policyById[pid].init == null) ps.active = false;
    });
  }

  function resolveDilemma(st, S, idx) {
    const e = model(S).eventById[st.pendingDilemma];
    if (!e) return;
    const c = e.choices[idx];
    applyEventFx(st, S, Object.assign({ turns: c.turns || 6 }, c, { id: e.id }));
    addNews(st, 'event', e.title, `${e.text} Decisión: ${c.label}.`);
    st.pendingDilemma = null;
    // refresh polls so the UI reflects the choice
    const v = runVote(st, S);
    const res = seatsFrom(S, v);
    Object.assign(st.lastVote, { shares: v.shares, approval: v.approval, groupStats: v.groupStats, reasons: v.reasons, projected: res.seats, byProvSeats: res.byProvSeats, byProv: v.byProv.map((a) => Array.from(a, (x) => +x.toFixed(4))) });
  }

  function holdElection(st, S) {
    const v = runVote(st, S);
    const r = mulberry32((st.seed ^ (st.turn * 104729)) >>> 0);
    // election-day swing
    Object.keys(v.shares).forEach(() => {});
    const res = seatsFrom(S, v, r);
    st.seats = res.seats;
    const inv = investiture(st, S, res.seats);
    const result = { turn: st.turn, year: st.year, quarter: st.quarter, shares: v.shares, turnout: v.turnout, seats: res.seats, byProvSeats: res.byProvSeats, invest: inv,
      prevSeats: Object.assign({}, st.lastElection ? st.lastElection.seats : {}), analysis: electionAnalysis(st, S, v) };
    st.snapshot = takeSnapshot(st, S, v);
    st.lastElection = result;
    st.lastElectionTurn = st.turn;
    st.history.elections = st.history.elections || [];
    st.history.elections.push({ year: st.year, shares: v.shares, seats: res.seats });
    result.promises = st.campaign ? st.campaign.promises : [];
    return concludeInvestiture(st, S, result, inv);
  }

  // Decide the investiture (after any negotiations) and its consequences
  function concludeInvestiture(st, S, result, inv) {
    const res = { seats: result.seats };
    st.pendingInvestiture = false;
    result.invest = inv;
    if (inv.success) {
      st.electionsWon++;
      st.repeatElection = false;
      st.nextElectionTurn = st.turn + S.termLength;
      st.fatigue *= 0.6;
      st.capital += 10;
      addNews(st, 'good', `${st.player.name} gana: ${res.seats.player} escaños`, `Investidura aprobada en ${inv.round === 1 ? 'primera votación por mayoría absoluta' : 'segunda votación por mayoría simple'} (${inv.yes} sí, ${inv.no} no, ${inv.abstain} abstenciones).`);
      result.outcome = 'won';
    } else {
      const alt = alternativeGovernment(st, S, res.seats);
      if (alt.success) {
        st.gameOver = { reason: 'election', title: 'Derrota en las urnas', text: `${partyName(S, alt.leader)} forma gobierno con ${alt.yes} escaños. Tu etapa en La Moncloa ha terminado.` };
        result.outcome = 'lost';
        addNews(st, 'bad', 'Elecciones perdidas', st.gameOver.text);
      } else if (!st.repeatElection) {
        st.repeatElection = true;
        st.nextElectionTurn = st.turn + 2;
        result.outcome = 'hung';
        addNews(st, 'bad', 'Bloqueo: repetición electoral', `Tu investidura fracasa (${inv.yes} sí frente a ${inv.no} no) y no hay mayoría alternativa. Sigues en funciones; España vuelve a votar en seis meses.`);
      } else {
        st.gameOver = { reason: 'deadlock', title: 'Bloqueo', text: 'Segunda investidura fallida. Tu partido te sustituye por otro candidato para desbloquear la situación.' };
        result.outcome = 'lost';
        addNews(st, 'bad', 'Relevado tras dos investiduras fallidas', st.gameOver.text);
      }
    }
    if (result.outcome === 'won') {
      // Campaign promises become the targets of the new term
      st.promises = (result.promises || []).map((p) => Object.assign({}, p, { status: 'open', madeTurn: st.turn }));
      st.goals = [];
    }
    st.campaign = null;
    st.lastElection = result;
    return result;
  }

  function demandMet(st, d) {
    const [pid, target, dir] = d;
    const v = polVal(st, pid);
    if (dir === 'off') return !st.policies[pid].active;
    if (dir === 'max') return v <= target + 1e-6;
    return v >= target - 1e-6;
  }
  function winRewards(st, S, report, result) {
    (st.goals || []).forEach((g) => { if (g.win && !(st.goalsDone || {})[g.id]) completeGoal(st, report, g); });
    const maj = result.seats.player >= S.majority;
    award(st, report, 'win-' + st.turn, maj ? 'Mayoría absoluta' : 'Reelegido', maj ? `${st.player.name} logra ${result.seats.player} escaños y gobernará en solitario.` : `${st.player.name} logra ${result.seats.player} escaños y sigue en La Moncloa.`, maj ? 40 : 25, 0, 'win');
  }

  // ── Election campaign & promises ────────────────────────────
  function promiseCheck(st, S, p) {
    const c = { deficit: st.lastBudget.deficit / st.gdp };
    if (p.type === 'sim') { const v = st.sims[p.sim]; return { met: p.below != null ? v < p.below : v > p.above, now: S.sims[p.sim].fmt(v), target: S.sims[p.sim].fmt(p.below != null ? p.below : p.above) }; }
    if (p.type === 'deficit') return { met: c.deficit < p.below, now: (c.deficit * 100).toFixed(1) + '%', target: (p.below * 100).toFixed(1) + '%' };
    if (p.type === 'policies') {
      const met = p.demands.every((d) => demandMet(st, d));
      const pol = model(S).policyById[p.demands[0][0]];
      return { met, now: st.policies[pol.id].active ? levelLabel(pol, st.policies[pol.id].v) : 'Not in force', target: p.demands[0][2] === 'off' ? 'Not in force' : levelLabel(pol, p.demands[0][1]) };
    }
    return { met: false };
  }
  function campaignOptions(st, S) {
    return (S.promiseCatalog || []).map((b) => { try { return b(st, S); } catch (e) { return null; } }).filter(Boolean)
      .filter((p) => (p.keep ? promiseCheck(st, S, p).met : !promiseCheck(st, S, p).met));
  }
  function openCampaign(st, S, report) {
    st.pendingCampaign = true;
    report.campaign = true;
    // The term is ending: settle the promises made last time
    (st.promises || []).forEach((p) => {
      if (p.status !== 'open') return;
      if (p.keep) keepPromise(st, S, p, report); else breakPromise(st, S, p, report, 'No la cumpliste antes del final de la legislatura.');
    });
  }
  function launchCampaign(st, S, plan) {
    const opts = campaignOptions(st, S);
    const chosen = (plan.promises || []).map((id) => opts.find((o) => o.id === id)).filter(Boolean).slice(0, 3);
    const left = Math.max(1, st.nextElectionTurn - st.turn);
    const cred = st.brokenPromises ? Math.max(0.4, 1 - 0.2 * st.brokenPromises) : 1;
    chosen.forEach((p) => parseFx(p.groups).forEach((f) => st.modifiers.push({ t: f.t, a: f.a * cred, turns: left + 4, left: left + 4, src: 'campaign', label: p.title })));
    st.campaign = { turn: st.turn, promises: chosen, credibility: cred };
    st.pendingCampaign = false;
    addNews(st, 'info', 'Arranca la campaña', chosen.length ? `${st.player.name} promete: ${chosen.map((p) => p.title.charAt(0).toLowerCase() + p.title.slice(1)).join('; ')}.` : `${st.player.name} se presenta con su gestión.`);
    return st.campaign;
  }
  function keepPromise(st, S, p, report) {
    p.status = 'kept'; p.settledTurn = st.turn;
    parseFx(p.groups).forEach((f) => { if (f.a > 0) st.modifiers.push({ t: f.t, a: f.a * 0.6, turns: 6, left: 6, src: 'promise', label: p.title }); });
    award(st, report, 'promise-' + p.id + '-' + st.turn, 'Promesa cumplida: ' + p.title, 'Los votantes lo tienen en cuenta.', 15, 4, 'goal');
  }
  function breakPromise(st, S, p, report, why) {
    p.status = 'broken'; p.settledTurn = st.turn;
    st.brokenPromises = (st.brokenPromises || 0) + 1;
    parseFx(p.groups).forEach((f) => { if (f.a > 0) st.modifiers.push({ t: f.t, a: -f.a * 1.5, turns: 10, left: 10, src: 'promise', label: 'Incumplida: ' + p.title }); });
    st.fatigue += 0.03;
    award(st, report, 'broken-' + p.id + '-' + st.turn, 'Promesa incumplida: ' + p.title, why, -10, 0, 'broken');
  }
  function checkPromisesAndPacts(st, S, report) {
    (st.promises || []).forEach((p) => {
      if (p.status !== 'open') return;
      const met = promiseCheck(st, S, p).met;
      if (p.keep && !met) breakPromise(st, S, p, report, 'Has faltado a tu palabra.');
      else if (!p.keep && met) keepPromise(st, S, p, report);
    });
  }

  function callSnapElection(st, S) {
    if (st.turn - st.lastElectionTurn < 4) return { ok: false, reason: 'Debe pasar al menos un año desde las últimas elecciones.' };
    st.nextElectionTurn = st.turn + 1;
    if (!st.campaign) openCampaign(st, S, { achievements: [] });
    addNews(st, 'info', 'Elecciones anticipadas', `${st.player.leader} disuelve las Cortes Generales. España vota el próximo trimestre.`);
    return { ok: true };
  }

  // ── Achievements ────────────────────────────────────────────
  const GROUP_WON = 0.4, GROUP_LOST = 0.33;
  function isLeading(shares) {
    return Object.keys(shares).every((k) => k === 'player' || shares.player > shares[k]);
  }
  function achievementCtx(st, S) {
    return { sims: st.sims, deficit: st.lastBudget.deficit / st.gdp, debt: st.debt / st.gdp, approval: st.lastVote ? st.lastVote.approval : 0, year: st.year };
  }
  function award(st, report, id, title, text, points, capital, kind) {
    st.awarded = st.awarded || {};
    if (st.awarded[id]) return;
    st.awarded[id] = true;
    const a = { id, title, text, points, capital: capital || 0, kind: kind || 'milestone', turn: st.turn, year: st.year, quarter: st.quarter };
    st.achievements = st.achievements || [];
    st.achievements.unshift(a);
    st.score = (st.score || 0) + points;
    if (capital) st.capital = Math.min(150, st.capital + capital);
    if (report) report.achievements.push(a);
    addNews(st, 'good', title, text);
  }
  function goalStatus(st, S, g) {
    const c = achievementCtx(st, S);
    if (g.win) return { done: !!(st.goalsDone || {})[g.id], now: st.electionsWon ? 'Won' : 'Not yet', target: 'Win' };
    if (g.sim) {
      const v = st.sims[g.sim], f = S.sims[g.sim].fmt;
      return { done: g.below != null ? v < g.below : v > g.above, now: f(v), target: f(g.below != null ? g.below : g.above), progress: g.below != null ? clamp((S.sims[g.sim].init - v) / Math.max(1e-6, S.sims[g.sim].init - g.below)) : clamp((v - S.sims[g.sim].init) / Math.max(1e-6, g.above - S.sims[g.sim].init)) };
    }
    if (g.deficitBelow != null) return { done: c.deficit < g.deficitBelow, now: (c.deficit * 100).toFixed(1) + '%', target: (g.deficitBelow * 100).toFixed(0) + '%' };
    if (g.debtBelow != null) return { done: c.debt < g.debtBelow, now: (c.debt * 100).toFixed(0) + '%', target: (g.debtBelow * 100).toFixed(0) + '%' };
    if (g.approvalAbove != null) return { done: c.approval > g.approvalAbove, now: (c.approval * 100).toFixed(0) + '%', target: (g.approvalAbove * 100).toFixed(0) + '%' };
    return { done: false };
  }
  function completeGoal(st, report, g) {
    st.goalsDone[g.id] = { turn: st.turn, year: st.year, quarter: st.quarter };
    award(st, report, 'goal-' + g.id, 'Objetivo cumplido: ' + g.title, 'Cumples uno de los compromisos de tu mandato.', 20, 8, 'goal');
  }
  function checkAchievements(st, S, report) {
    const M = model(S);
    st.goalsDone = st.goalsDone || {};
    // Crises resolved and good times arriving
    report.situations.forEach(({ id, on }) => {
      const sit = M.situationById[id];
      if (sit.bad && !on) award(st, report, `sit-${id}-${st.turn}`, `Fin de la crisis: ${sit.name}`, 'Una crisis menos.', 10, 3, 'crisis');
      if (!sit.bad && on) award(st, report, `sit-${id}-${st.turn}`, sit.name, sit.desc, 8, 2, 'good');
    });
    // Voter groups won over
    const gs = st.lastVote.groupStats;
    st.groupsWon = st.groupsWon || {};
    M.groupIds.forEach((g) => {
      if (S.groups[g].hidden || gs[g].size < 0.02) return;
      if (!st.groupsWon[g] && gs[g].player >= GROUP_WON) {
        st.groupsWon[g] = true;
        award(st, report, `grp-${g}-${st.turn}`, `${S.groups[g].name}: ahora te apoyan`, `El ${Math.round(gs[g].player * 100)} % piensa votarte.`, 5, 2, 'group');
      } else if (st.groupsWon[g] && gs[g].player < GROUP_LOST) st.groupsWon[g] = false;
    });
    // Leading the polls
    const lead = isLeading(st.lastVote.shares);
    if (lead && !st.leading) award(st, report, 'lead-' + st.turn, 'Primeros en las encuestas', `${st.player.name} es el partido más votado en los sondeos, con un ${(st.lastVote.shares.player * 100).toFixed(1).replace('.', ',')} %.`, 8, 2, 'polls');
    st.leading = lead;
    // Milestones
    const c = achievementCtx(st, S);
    (S.milestones || []).forEach((m) => { try { if (m.test(c)) award(st, report, 'ms-' + m.id, m.title, '', 10, 3, 'milestone'); } catch (e) { /* ignore */ } });
    // Goals
    (st.goals || []).forEach((g) => { if (!g.win && !st.goalsDone[g.id] && goalStatus(st, S, g).done) completeGoal(st, report, g); });
  }

  // What has moved average pay since you took office (percent, sums to the total change)
  function wageDrivers(st, S) {
    const mac = computeMacro(st, S), m0 = st.macro0, mp = macroParams(S);
    if (!m0) return { total: 0, items: [] };
    const total = Math.log(mac.avgWage / m0.avgWage) * 100;
    const items = [];
    items.push({ kind: 'sim', id: 'inflation', name: 'Inflación', c: Math.log(st.priceLevel || 1) * 100 });
    const share = {};
    labourShareDrivers(st, S).forEach((d) => (share[d.id] = Object.assign({}, d, { c: (d.contribution / mp.labourShare) * 100 })));
    const u = st.sims.unemployment * 0.3, u0 = S.sims.unemployment.init * 0.3;
    share.unemployment = share.unemployment || { id: 'unemployment', kind: 'sim', name: 'Paro', c: 0 };
    share.unemployment.c += -Math.log((1 - u) / (1 - u0)) * 100;
    Object.values(share).forEach((d) => items.push({ kind: d.kind, id: d.id, name: d.name, c: d.c }));
    items.push({ kind: 'sim', id: 'immigration', name: 'Población activa (inmigración y jubilaciones)', c: -Math.log(mac.labourForce / m0.labourForce) * 100 });
    const known = items.reduce((a, x) => a + x.c, 0);
    items.unshift({ kind: 'sim', id: 'growth', name: 'Crecimiento económico', c: total - known });
    return { total, items: items.sort((a, b) => Math.abs(b.c) - Math.abs(a.c)) };
  }

  // ── Election analysis ──────────────────────────────────────
  function encodeChoice(choice) { let out = ''; for (let i = 0; i < choice.length; i++) out += String.fromCharCode(65 + choice[i]); return out; }
  function takeSnapshot(st, S, vote) {
    const M = model(S);
    const base = {};
    M.groupIds.forEach((g) => (base[g] = st.base[g]));
    return {
      turn: st.turn, year: st.year, quarter: st.quarter,
      sims: Object.assign({}, st.sims), policies: JSON.parse(JSON.stringify(st.policies)), situations: Object.assign({}, st.situations),
      modifiers: st.modifiers.map((m) => Object.assign({}, m)), groupHappy: Object.assign({}, st.groupHappy), base,
      pos: perceivedPosition(st, S), fatigue: st.fatigue, shares: Object.assign({}, vote.shares),
      groupStats: JSON.parse(JSON.stringify(vote.groupStats)), choice: encodeChoice(vote.choice),
    };
  }

  // Why did a target (indicator or voter group) change since the snapshot?
  function causeDelta(st, S, target, snap) {
    const M = model(S);
    const out = [];
    (M.inputs[target] || []).forEach((src) => {
      const f = CURVES[src.c];
      let now, then, name;
      if (src.kind === 'policy') {
        const a = st.policies[src.id], b = snap.policies[src.id];
        now = a.active ? f(a.v) : 0; then = b && b.active ? f(b.v) : 0; name = M.policyById[src.id].name;
      } else if (src.kind === 'sim') {
        now = f(st.sims[src.id]); then = f(snap.sims[src.id]); name = S.sims[src.id].name;
      } else {
        now = st.situations[src.id] ? 1 : 0; then = snap.situations[src.id] ? 1 : 0; name = M.situationById[src.id].name;
      }
      const d = src.a * (now - then);
      if (Math.abs(d) > 1e-4) out.push({ kind: src.kind, id: src.id, name, delta: d });
    });
    const modSum = (list) => { const o = {}; list.filter((m) => m.t === target).forEach((m) => (o[m.src] = (o[m.src] || 0) + m.a * (m.left / m.turns))); return o; };
    const mNow = modSum(st.modifiers), mThen = modSum(snap.modifiers || []);
    new Set(Object.keys(mNow).concat(Object.keys(mThen))).forEach((id) => {
      const d = (mNow[id] || 0) - (mThen[id] || 0);
      const e = M.eventById[id];
      if (Math.abs(d) > 1e-4) out.push({ kind: 'event', id, name: e ? e.title : id === 'campaign' ? 'Promesas de campaña' : id === 'promise' ? 'Promesas cumplidas o rotas' : id, delta: d });
    });
    if (S.groups[target] && snap.base && snap.base[target] != null) {
      const d = st.base[target] - snap.base[target];
      if (Math.abs(d) > 1e-4) out.push({ kind: 'adaptation', id: target, name: d < 0 ? 'Los votantes se acostumbran a lo bueno' : 'Los votantes perdonan y olvidan', delta: d });
    }
    return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  }

  // Compare now with the last election (snapshot): vote flows, mood changes and their causes
  function electionAnalysis(st, S, vote) {
    const M = model(S);
    const snap = st.snapshot;
    if (!snap) return null;
    vote = vote || runVote(st, S);
    const parties = allParties(S);
    const V = st._voters;
    const lost = {}, gained = {};
    let stayed = 0, total = 0;
    const snapChoice = snap.choice || '';
    for (let i = 0; i < V.n && i < snapChoice.length; i++) {
      const was = snapChoice.charCodeAt(i) - 65, now = vote.choice[i];
      const w = V.weight[i];
      total += w;
      if (was === 0 && now !== 0) lost[parties[now].id] = (lost[parties[now].id] || 0) + w;
      else if (was !== 0 && now === 0) gained[parties[was].id] = (gained[parties[was].id] || 0) + w;
      else if (was === 0 && now === 0) stayed += w;
    }
    Object.keys(lost).forEach((k) => (lost[k] /= total));
    Object.keys(gained).forEach((k) => (gained[k] /= total));
    // Group-level changes, weighted by group size
    const groups = M.groupIds.filter((g) => !S.groups[g].hidden).map((g) => {
      const before = snap.groupStats[g] || { size: 0, player: 0 };
      const now = vote.groupStats[g];
      return {
        id: g, moodBefore: snap.groupHappy[g], moodNow: st.groupHappy[g], dMood: st.groupHappy[g] - snap.groupHappy[g],
        sizeBefore: before.size, sizeNow: now.size, supportBefore: before.player, supportNow: now.player,
        // contribution to your national vote change (approx.)
        impact: now.size * now.player - before.size * before.player,
      };
    });
    // Biggest causes of mood change across the electorate
    const causes = {};
    const add = (list, weight) => list.forEach((c) => {
      const k = c.kind + ':' + c.id;
      causes[k] = causes[k] || { kind: c.kind, id: c.id, name: c.name, delta: 0 };
      causes[k].delta += c.delta * weight;
    });
    // Weight each group by how much of the average voter's mood it makes up
    const totalSize = M.groupIds.reduce((a, g) => a + vote.groupStats[g].size, 0);
    let adapt = 0, moodBefore = 0, moodNow = 0;
    M.groupIds.forEach((g) => {
      const w = vote.groupStats[g].size / totalSize;
      const cs = causeDelta(st, S, g, snap);
      add(cs.filter((c) => c.kind !== 'adaptation'), w * 0.9);
      cs.filter((c) => c.kind === 'adaptation').forEach((c) => (adapt += c.delta * w * 0.9));
      moodBefore += snap.groupHappy[g] * w; moodNow += st.groupHappy[g] * w;
    });
    const topCauses = Object.values(causes).filter((c) => Math.abs(c.delta) > 0.0005).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 8);
    const pos = perceivedPosition(st, S);
    return {
      since: { year: snap.year, quarter: snap.quarter },
      shareBefore: snap.shares.player, shareNow: vote.shares.player,
      lost, gained, stayed: stayed / (total || 1),
      groups, topCauses,
      posBefore: snap.pos, posNow: pos,
      fatigueBefore: snap.fatigue, fatigueNow: st.fatigue,
      fatigueMood: -(st.fatigue - snap.fatigue) / A_HAPPY, adaptation: adapt, moodBefore, moodNow,
      reasons: vote.reasons,
    };
  }

  // Full vote-flow matrix: last election choice -> current choice (shares of all voters)
  function voteFlows(st, S, vote) {
    const snap = st.snapshot;
    if (!snap || !snap.choice) return null;
    vote = vote || runVote(st, S);
    const ids = allParties(S).map((p) => p.id);
    const V = st._voters;
    const m = {};
    let total = 0;
    for (let i = 0; i < V.n && i < snap.choice.length; i++) {
      const a = ids[snap.choice.charCodeAt(i) - 65], b = ids[vote.choice[i]];
      const w = V.weight[i];
      total += w;
      const k = a + '>' + b;
      m[k] = (m[k] || 0) + w;
    }
    const links = Object.entries(m).map(([k, w]) => { const [s, t] = k.split('>'); return { s, t, v: w / total }; });
    const from = {}, to = {};
    links.forEach((l) => { from[l.s] = (from[l.s] || 0) + l.v; to[l.t] = (to[l.t] || 0) + l.v; });
    return { links, from, to, since: { year: snap.year, quarter: snap.quarter } };
  }

  // Event effects currently in play
  function activeEvents(st, S) {
    const M = model(S);
    const by = {};
    st.modifiers.forEach((m) => {
      if (m.src === 'campaign' || m.src === 'promise') return;
      const e = M.eventById[m.src];
      const o = (by[m.src] = by[m.src] || { id: m.src, title: e ? e.title : m.src, local: e ? e.local : '', label: m.label, left: m.left, turns: m.turns, fx: [] });
      o.left = Math.max(o.left, m.left);
      o.fx.push({ t: m.t, a: m.a, now: m.a * (m.left / m.turns) });
    });
    return Object.values(by);
  }

  // ── Explanations (for the UI) ───────────────────────────────
  function explain(st, S, target) {
    const M = model(S);
    const list = [];
    (M.inputs[target] || []).forEach((src) => {
      let val = 0, active = true, name;
      if (src.kind === 'policy') {
        const ps = st.policies[src.id]; active = ps.active; val = active ? CURVES[src.c](ps.v) : 0;
        name = M.policyById[src.id].name;
      } else if (src.kind === 'sim') {
        val = CURVES[src.c](st.sims[src.id]); name = S.sims[src.id].name;
      } else {
        active = st.situations[src.id]; val = active ? 1 : 0; name = M.situationById[src.id].name;
      }
      list.push({ kind: src.kind, id: src.id, name, amount: src.a, value: src.a * val, active });
    });
    st.modifiers.filter((m) => m.t === target).forEach((m) => {
      const e = M.eventById[m.src];
      list.push({ kind: 'event', id: m.src, name: e ? e.title : m.src === 'campaign' ? 'Campaña: ' + m.label : m.label || m.src, amount: m.a, value: m.a * (m.left / m.turns), active: true });
    });
    return list.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  }
  function outputs(S, kind, id) {
    if (kind === 'policy') return model(S).policyById[id]._fx;
    if (kind === 'sim') return S.sims[id]._fx;
    if (kind === 'situation') return model(S).situationById[id]._fx;
    return [];
  }

  // Estimated direct impact on group happiness of a policy change (first-order)
  function previewGroups(st, S, id, active, v) {
    const p = model(S).policyById[id];
    const cur = st.policies[id];
    const oldV = cur.active ? cur.v : 0, newV = active ? v : 0;
    const out = {};
    p._fx.forEach((e) => {
      const d = e.a * (CURVES[e.c](newV) - CURVES[e.c](oldV));
      out[e.t] = (out[e.t] || 0) + d;
    });
    return out;
  }

  // Build a playable copy of a scenario with a starting preset applied
  function deriveScenario(base, presetId, seed, position) {
    const X = Object.assign({}, base);
    X.sims = {}; Object.keys(base.sims).forEach((k) => (X.sims[k] = Object.assign({}, base.sims[k], { _fx: undefined })));
    X.groups = {}; Object.keys(base.groups).forEach((k) => (X.groups[k] = Object.assign({}, base.groups[k], { _size: undefined })));
    X.policies = base.policies.map((p) => Object.assign({}, p, { _fx: undefined }));
    X.parties = base.parties.map((p) => Object.assign({}, p, { partner: Object.assign({}, p.partner) }));
    X.playerDefaults = Object.assign({}, base.playerDefaults);
    X.situations = base.situations.map((s) => Object.assign({}, s));
    X.events = base.events.map((e) => Object.assign({}, e, { choices: e.choices && e.choices.map((c) => Object.assign({}, c)) }));
    X.macro = Object.assign({}, base.macro, { _fx: undefined });
    const preset = (base.presets || []).find((p) => p.id === presetId) || (base.presets || [])[0];
    X.presetId = preset ? preset.id : 'reality';
    X.presetSeed = seed >>> 0;
    if (preset) preset.apply(X, mulberry32((seed >>> 0) ^ 0x5bd1e995));
    X.presetPos = position || null;
    if (position && base.applyPosition) base.applyPosition(X, position);
    if (base.adaptToEra) base.adaptToEra(X);
    X.policies.forEach((p) => { if (p.availableFrom && p.availableFrom > X.startYear) p.init = null; });
    X.goals = base.goalsForPreset ? base.goalsForPreset(X.presetId) : [];
    X.sims.debtRatio.init = X.debt0 / X.gdp0;
    X.sims.deficitRatio.init = X.targetDeficit0 * 10;
    return X;
  }

  G.Engine = {
    newGame, step, restore, serialise, applyPolicy, changeCost, budget, policyBudget, runVote, seatsFrom,
    investiture, partyStance, perceivedPosition, alternativeGovernment, playerPosition, explain, outputs, previewGroups,
    resolveDilemma, callSnapElection, levelLabel, model, allParties, partyName, polVal, clamp, parseFx,
    dhondt, campaignOptions, launchCampaign, promiseCheck, wageDrivers, goalStatus, policyAvailable, voteFlows, deriveScenario, computeMacro, labourShareDrivers, TAX_BASES, eventRisks, TAX_RAISE_MULT, sizeDrivers, groupMults, electionAnalysis, causeDelta, activeEvents,
  };
})(typeof window !== 'undefined' ? window : globalThis);
