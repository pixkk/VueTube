const FORMATS = ["json3", "srt", "vtt"];

function toHex(n) {
  return "#" + (n & 0xffffff).toString(16).padStart(6, "0");
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function parseTime(str) {
  const m = str.trim().match(/^(?:(\d+):)?(\d+):(\d+)[.,](\d+)$/);
  if (!m) return NaN;
  const ms = Number(m[4].padEnd(3, "0").slice(0, 3));
  return (Number(m[1] || 0) * 3600 + Number(m[2]) * 60 + Number(m[3])) * 1000 + ms;
}

function parseMarkup(text) {
  const segs = [];
  const state = { bold: false, italic: false, underline: false, colors: [] };
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)(?:\.[^\s>]*)?(?:\s+([^>]*))?>|([^<]+)|</g;
  let m;
  while ((m = re.exec(text))) {
    if (m[4] !== undefined || m[2] === undefined) {
      const raw = m[4] !== undefined ? m[4] : "<";
      segs.push({
        text: decodeEntities(raw),
        color: state.colors.length ? state.colors[state.colors.length - 1] : null,
        bold: state.bold,
        italic: state.italic,
        underline: state.underline,
      });
      continue;
    }
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    if (tag === "b") state.bold = !closing;
    else if (tag === "i") state.italic = !closing;
    else if (tag === "u") state.underline = !closing;
    else if (tag === "font") {
      if (closing) state.colors.pop();
      else {
        const c = (m[3] || "").match(/color\s*=\s*["']?(#?[0-9a-fA-F]{3,8}|[a-zA-Z]+)/);
        state.colors.push(c ? (/^[0-9a-fA-F]{6}$/.test(c[1]) ? "#" + c[1] : c[1]) : null);
      }
    }
  }
  return segs;
}

function parseSrt(text) {
  const cues = [];
  const blocks = String(text).replace(/\r/g, "").trim().split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split("\n");
    const idx = lines.findIndex((l) => l.includes("-->"));
    if (idx < 0) continue;
    const [a, b] = lines[idx].split("-->");
    const start = parseTime(a);
    const end = parseTime(b.trim().split(/\s+/)[0]);
    if (isNaN(start) || isNaN(end)) continue;
    const segs = parseMarkup(lines.slice(idx + 1).join("\n"));
    if (segs.length) cues.push({ start, end, segs, pos: null });
  }
  return cues;
}

function parseVtt(text) {
  const body = String(text).replace(/\r/g, "").replace(/^WEBVTT[^\n]*\n/, "");
  return parseSrt(body.replace(/^(NOTE|STYLE|REGION)[\s\S]*?(?:\n\n|$)/gm, ""));
}

function parsePb3(input) {
  const data = typeof input === "string" ? JSON.parse(input) : input;
  const pens = data.pens || [];
  const positions = data.wpWinPositions || [];
  const cues = [];
  const windowPos = new Map();
  const eventPen = (ev) => pens[ev.pPenId] || {};
  (data.events || []).forEach((ev, index) => {
    const p = positions[ev.wpWinPosId];
    const ownPos = p && p.apPoint != null ? { anchor: p.apPoint, x: p.ahHorPos, y: p.avVerPos } : null;
    let win;
    if (ev.id) win = String(ev.id);
    else if (ev.wWinId != null && windowPos.has(String(ev.wWinId))) win = String(ev.wWinId);
    else win = ev.wWinId != null ? String(ev.wWinId) : "_" + index;
    if (!windowPos.has(win)) windowPos.set(win, ownPos);
    const pos = windowPos.get(win);
    if (!ev.segs) return;
    const evStart = ev.tStartMs || 0;
    const evEnd = evStart + (ev.dDurationMs || 5000);
    let first = !ev.aAppend;
    for (const s of ev.segs) {
      const text = s.utf8 || "";
      if (!text) continue;
      const pen = { ...eventPen(ev), ...(pens[s.pPenId] || {}) };
      const alpha = pen.foForeAlpha == null ? 255 : pen.foForeAlpha;
      if (alpha === 0 || pen.szPenSize === 0) continue;
      if (!text.trim() && !text.includes("\n")) continue;
      const start = evStart + (s.tOffsetMs || 0);
      if (start >= evEnd) continue;
      const seg = {
        text,
        color: pen.fcForeColor == null ? null : toHex(pen.fcForeColor),
        opacity: Math.min(alpha / 255, 1),
        bg: pen.bcBackColor == null ? null : toHex(pen.bcBackColor),
        bgOpacity: pen.boBackAlpha == null ? null : Math.min(pen.boBackAlpha / 255, 1),
        edge: pen.etEdgeType || 0,
        edgeColor: pen.ecEdgeColor == null ? "#000000" : toHex(pen.ecEdgeColor),
        scale: pen.szPenSize == null ? 1 : pen.szPenSize / 100,
        bold: !!pen.bAttr,
        italic: !!pen.iAttr,
        underline: !!pen.uAttr,
      };
      cues.push({ start, end: evEnd, segs: [seg], pos, win, newLine: first });
      first = false;
    }
  });
  return cues;
}

const PARSERS = { json3: parsePb3, srt: parseSrt, vtt: parseVtt };

function parseCaptions(format, data) {
  try {
    const cues = PARSERS[format](data);
    return cues.length ? cues : null;
  } catch (e) {
    return null;
  }
}

async function loadCaptions(fetchFormat) {
  for (const format of FORMATS) {
    const data = await fetchFormat(format).catch(() => null);
    if (data === null || data === undefined || data === "") continue;
    const cues = parseCaptions(format, data);
    if (cues) return cues;
  }
  return null;
}

function activeCues(cues, timeMs) {
  const result = [];
  for (let i = 0; i < cues.length; i++) {
    if (timeMs >= cues[i].start && timeMs < cues[i].end) result.push(i);
  }
  return result;
}

function edgeShadow(edge, color) {
  switch (edge) {
    case 1:
      return `1px 1px 0 ${color}, 2px 2px 0 ${color}`;
    case 2:
      return `-1px -1px 0 ${color}, 1px 1px 0 ${color}`;
    case 3:
      return `0 0 4px ${color}, 0 0 4px ${color}, 0 0 4px ${color}`;
    case 4:
      return `2px 2px 3px ${color}, 2px 2px 4px ${color}`;
    default:
      return "";
  }
}

function hexToRgba(hex, opacity) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${opacity})`;
}

function renderSeg(seg) {
  const css = [];
  if (seg.color) css.push(`color:${seg.color}`);
  if (seg.opacity != null && seg.opacity < 1) css.push(`opacity:${seg.opacity}`);
  const bgOpacity = seg.bgOpacity == null ? 0.75 : seg.bgOpacity;
  if (bgOpacity > 0) css.push(`background-color:${hexToRgba(seg.bg || "#080808", bgOpacity)}`);
  const shadow = edgeShadow(seg.edge, seg.edgeColor);
  if (shadow) css.push(`text-shadow:${shadow}`);
  if (seg.scale && seg.scale !== 1) css.push(`font-size:${seg.scale}em`);
  if (seg.bold) css.push("font-weight:bold");
  if (seg.italic) css.push("font-style:italic");
  if (seg.underline) css.push("text-decoration:underline");
  return `<span style="${css.join(";")}">${escapeHtml(seg.text)}</span>`;
}

function renderCues(cues, indexes) {
  const flow = [];
  const placed = [];
  const groups = new Map();
  for (const i of indexes) {
    const cue = cues[i];
    const key = cue.win != null ? cue.win : "c" + i;
    if (!groups.has(key)) groups.set(key, { pos: cue.pos, lines: [] });
    const group = groups.get(key);
    if (!group.lines.length || cue.newLine) group.lines.push([]);
    for (const seg of cue.segs) {
      const parts = seg.text.split("\n");
      parts.forEach((part, n) => {
        if (n > 0) group.lines.push([]);
        if (part) group.lines[group.lines.length - 1].push(renderSeg({ ...seg, text: part }));
      });
    }
  }
  for (const group of groups.values()) {
    const cue = { pos: group.pos };
    const html = group.lines
      .filter((line) => line.length)
      .map((line) => line.join(""))
      .join("<br>");
    if (!html) continue;
    if (!cue.pos) {
      flow.push(`<div class="yt-cue">${html}</div>`);
      continue;
    }
    const col = cue.pos.anchor % 3;
    const row = Math.floor(cue.pos.anchor / 3);
    const x = 2 + cue.pos.x * 0.96;
    const y = 2 + cue.pos.y * 0.96;
    placed.push(
      `<div class="yt-cue yt-cue-placed" style="left:${x}%;top:${y}%;transform:translate(${-col * 50}%,${-row * 50}%);text-align:${["left", "center", "right"][col]}">${html}</div>`
    );
  }
  const flowHtml = flow.length ? `<div class="yt-cue-flow">${flow.join("")}</div>` : "";
  return placed.join("") + flowHtml;
}

export { loadCaptions, parseCaptions, activeCues, renderCues, FORMATS };
