/* Tiny SVG chart helpers (no dependencies) */
(function (G) {
  'use strict';
  const C = {};

  C.sparkline = function (values, opts = {}) {
    const w = opts.w || 120, h = opts.h || 32, pad = 2;
    if (!values || values.length < 2) values = [values && values[0] != null ? values[0] : 0.5, values && values[0] != null ? values[0] : 0.5];
    const vs = values.slice(-(opts.max || 40));
    let lo = Math.min(...vs), hi = Math.max(...vs);
    const span = Math.max(hi - lo, opts.minSpan || 0.04);
    const mid = (hi + lo) / 2; lo = mid - span / 2; hi = mid + span / 2;
    const x = (i) => pad + (i / (vs.length - 1)) * (w - pad * 2);
    const y = (v) => h - pad - ((v - lo) / (hi - lo)) * (h - pad * 2);
    const d = vs.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
    const area = d + ` L${x(vs.length - 1).toFixed(1)} ${h} L${x(0).toFixed(1)} ${h} Z`;
    const color = opts.color || 'currentColor';
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${area}" fill="${color}" opacity="0.12"/>
      <path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
      <circle cx="${x(vs.length - 1).toFixed(1)}" cy="${y(vs[vs.length - 1]).toFixed(1)}" r="2.2" fill="${color}"/>
    </svg>`;
  };

  // series: [{ name, color, values, bold }], labels: [] ; yFmt: fn
  C.lineChart = function (series, labels, opts = {}) {
    const w = opts.w || 640, h = opts.h || 220;
    const padL = 38, padR = opts.padR != null ? opts.padR : 52, padT = 12, padB = 24;
    const n = labels.length;
    if (n < 2) return `<div class="chart-empty">Not enough history yet — play a few quarters.</div>`;
    let hi = opts.yMax != null ? opts.yMax : Math.max(...series.flatMap((s) => s.values)) * 1.1;
    let lo = opts.yMin != null ? opts.yMin : Math.min(0, ...series.flatMap((s) => s.values));
    if (hi - lo < 1e-6) hi = lo + 1;
    const x = (i) => padL + (i / (n - 1)) * (w - padL - padR);
    const y = (v) => padT + (1 - (v - lo) / (hi - lo)) * (h - padT - padB);
    const fmt = opts.yFmt || ((v) => v.toFixed(0));
    let grid = '';
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const v = lo + ((hi - lo) * i) / ticks;
      grid += `<line x1="${padL}" x2="${w - padR}" y1="${y(v)}" y2="${y(v)}" class="grid"/>
        <text x="${padL - 6}" y="${y(v) + 3}" class="axis" text-anchor="end">${fmt(v)}</text>`;
    }
    if (opts.refLine != null) grid += `<line x1="${padL}" x2="${w - padR}" y1="${y(opts.refLine)}" y2="${y(opts.refLine)}" class="ref"/>`;
    const step = Math.max(1, Math.ceil(n / 6));
    let xl = '';
    for (let i = 0; i < n; i += step) xl += `<text x="${x(i)}" y="${h - 6}" class="axis" text-anchor="middle">${labels[i]}</text>`;
    // end labels, avoid overlaps
    const ends = series.map((s) => ({ s, y: y(s.values[s.values.length - 1]) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 11) ends[i].y = ends[i - 1].y + 11;
    const lines = series.map((s) => {
      const d = s.values.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join(' ');
      return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.bold ? 2.6 : 1.6}" stroke-linejoin="round" stroke-linecap="round"/>`;
    }).join('');
    const lab = ends.map((e) => `<text x="${w - padR + 6}" y="${e.y + 3}" class="endlab" fill="${e.s.color}">${e.s.label || ''}</text>`).join('');
    return `<svg class="linechart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${opts.aria || 'Chart'}">${grid}${xl}${lines}${lab}</svg>`;
  };

  // parts: [{ id, color, n, label }] in left→right order
  C.hemicycle = function (parts, total, opts = {}) {
    const w = opts.w || 420, h = w * 0.54;
    const rows = total > 250 ? 11 : total > 100 ? 8 : 5;
    const cx = w / 2, cy = h - 6;
    const R = w / 2 - 8, r0 = R * 0.36;
    const radii = Array.from({ length: rows }, (_, i) => r0 + ((R - r0) * i) / (rows - 1));
    const sumR = radii.reduce((a, b) => a + b, 0);
    const counts = radii.map((r) => Math.round((total * r) / sumR));
    counts[rows - 1] += total - counts.reduce((a, b) => a + b, 0);
    const pts = [];
    radii.forEach((r, i) => {
      const n = counts[i];
      for (let j = 0; j < n; j++) {
        const a = Math.PI * (1 - (n === 1 ? 0.5 : j / (n - 1)));
        pts.push({ a, r, x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) });
      }
    });
    pts.sort((p, q) => q.a - p.a || p.r - q.r);
    const sr = ((R - r0) / (rows - 1)) * 0.42;
    let k = 0, out = '';
    parts.forEach((p) => {
      for (let i = 0; i < p.n && k < pts.length; i++, k++) {
        out += `<circle cx="${pts[k].x.toFixed(1)}" cy="${pts[k].y.toFixed(1)}" r="${sr.toFixed(2)}" fill="${p.color}"><title>${p.label || p.id}: ${p.n}</title></circle>`;
      }
    });
    for (; k < pts.length; k++) out += `<circle cx="${pts[k].x.toFixed(1)}" cy="${pts[k].y.toFixed(1)}" r="${sr.toFixed(2)}" class="empty-seat"/>`;
    const center = opts.center ? `<text x="${cx}" y="${cy - 14}" text-anchor="middle" class="hemi-num">${opts.center}</text><text x="${cx}" y="${cy + 1}" text-anchor="middle" class="hemi-sub">${opts.centerSub || ''}</text>` : '';
    return `<svg class="hemicycle" viewBox="0 0 ${w} ${h}" role="img" aria-label="Parliament seats">${out}${center}</svg>`;
  };

  // Two-column flow (Sankey) chart.
  // left/right: [{ id, label, sub, color, value }] in display order; links: [{ s, t, v, color }]
  C.sankey = function (left, right, links, opts = {}) {
    const w = opts.w || 720, h = opts.h || 360;
    const nodeW = 14, labW = opts.labelWidth || 150, gap = 6;
    const x0 = labW, x1 = w - labW - nodeW;
    const layout = (nodes) => {
      const tot = nodes.reduce((a, n) => a + n.value, 0) || 1;
      const scale = (h - gap * (nodes.length - 1)) / tot;
      let y = 0;
      const pos = {};
      nodes.forEach((n) => { const hh = Math.max(1.5, n.value * scale); pos[n.id] = { y, h: hh, out: y, in: y, scale }; y += hh + gap; });
      return pos;
    };
    const L = layout(left), R = layout(right);
    const scale = Math.min(L[left[0].id].scale, R[right[0].id].scale);
    const lIdx = Object.fromEntries(left.map((n, i) => [n.id, i])), rIdx = Object.fromEntries(right.map((n, i) => [n.id, i]));
    const ls = links.filter((l) => L[l.s] && R[l.t]).sort((a, b) => lIdx[a.s] - lIdx[b.s] || rIdx[a.t] - rIdx[b.t]);
    // allocate outgoing in target order, incoming in source order
    const out = {}, inn = {};
    ls.forEach((l) => { const th = l.v * L[l.s].scale; out[l.s] = out[l.s] || L[l.s].y; l._y0 = out[l.s]; l._h0 = th; out[l.s] += th; });
    ls.slice().sort((a, b) => rIdx[a.t] - rIdx[b.t] || lIdx[a.s] - lIdx[b.s]).forEach((l) => { const th = l.v * R[l.t].scale; inn[l.t] = inn[l.t] || R[l.t].y; l._y1 = inn[l.t]; l._h1 = th; inn[l.t] += th; });
    const mx = (x0 + nodeW + x1) / 2;
    const paths = ls.filter((l) => l.v * scale > 0.4).map((l) => {
      const a = x0 + nodeW, b = x1;
      const y0a = l._y0, y0b = l._y0 + l._h0, y1a = l._y1, y1b = l._y1 + l._h1;
      const d = `M${a},${y0a} C${mx},${y0a} ${mx},${y1a} ${b},${y1a} L${b},${y1b} C${mx},${y1b} ${mx},${y0b} ${a},${y0b} Z`;
      const stay = l.s === l.t;
      return `<path d="${d}" fill="${l.color}" opacity="${stay ? 0.28 : 0.55}"><title>${l.title || ''}</title></path>`;
    }).join('');
    const nodes = (list, pos, x, anchor) => list.map((n) => {
      const p = pos[n.id];
      const tx = anchor === 'end' ? x - 8 : x + nodeW + 8;
      return `<rect x="${x}" y="${p.y}" width="${nodeW}" height="${p.h}" rx="2" fill="${n.color}"><title>${n.label}</title></rect>
        ${p.h >= 9 ? `<text x="${tx}" y="${p.y + p.h / 2 - (n.sub && p.h >= 22 ? 3 : -4)}" text-anchor="${anchor}" class="sk-lab">${n.label}</text>` : ''}
        ${n.sub && p.h >= 22 ? `<text x="${tx}" y="${p.y + p.h / 2 + 11}" text-anchor="${anchor}" class="sk-sub">${n.sub}</text>` : ''}`;
    }).join('');
    return `<svg class="sankey" viewBox="0 -4 ${w} ${h + 8}" role="img" aria-label="${opts.aria || 'Flow chart'}">${paths}${nodes(left, L, x0, 'end')}${nodes(right, R, x1, 'start')}</svg>`;
  };

  G.Charts = C;
})(typeof window !== 'undefined' ? window : globalThis);
