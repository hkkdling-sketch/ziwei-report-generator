#!/usr/bin/env node
/**
 * 命理报告生成器（样张版）
 *
 * 用法：
 *   node generate.js samples/sample-1.json -o out/sample-1.html
 *
 * 设计原则：
 *   1. 排盘由 iztro 算法层完成，绝不让大模型心算干支
 *   2. 报告结构按「安心」组织：共情 → 解释 → 明确的下一步
 *   3. 解读文案由外部 JSON 提供（可由 AI 或命理师本人填写），本脚本只负责渲染
 */

const fs = require('fs');
const path = require('path');
const { astro } = require('iztro');

const CSS = `
:root{--bg:#FBF8F3;--card:#fff;--ink:#33302A;--ink2:#6B6357;--ink3:#9A9186;
--line:#E8E1D6;--accent:#8C5A3C;--accent-bg:#F6EDE4;}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
font-size:15px;line-height:1.8;-webkit-font-smoothing:antialiased}
.wrap{max-width:760px;margin:0 auto;padding:40px 22px 72px}
header{text-align:center;padding-bottom:26px;border-bottom:1px solid var(--line);margin-bottom:8px}
.brand{font-size:13px;color:var(--accent);letter-spacing:2px;margin:0 0 8px}
h1{font-size:23px;font-weight:500;margin:0 0 10px}
.meta{color:var(--ink2);font-size:14px;margin:0}
.empathy{background:var(--accent-bg);border-radius:12px;padding:20px 24px;margin:26px 0 0;
font-size:16px;line-height:1.9}
h2{font-size:17px;font-weight:500;margin:36px 0 14px;padding-left:11px;border-left:3px solid var(--accent)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
.kv{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.kv .k{font-size:12px;color:var(--ink3);display:block;margin-bottom:3px}
.kv .v{font-size:15px;font-weight:500}
table{width:100%;border-collapse:collapse;font-size:13.5px;background:var(--card);
border:1px solid var(--line);border-radius:10px;overflow:hidden}
th,td{padding:9px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{background:#F5F0E8;font-weight:500;color:var(--ink2);font-size:12.5px}
tr:last-child td{border-bottom:none}
td.stars{font-size:13px;line-height:1.7}
.mut{color:var(--accent)}
p{margin:0 0 14px}
.acts{counter-reset:a}
.act{display:flex;gap:14px;background:var(--card);border:1px solid var(--line);
border-radius:10px;padding:15px 18px;margin-bottom:10px}
.act .n{flex:0 0 26px;height:26px;border-radius:50%;background:var(--accent-bg);color:var(--accent);
font-size:13px;font-weight:500;display:flex;align-items:center;justify-content:center;margin-top:3px}
.act h3{font-size:15px;font-weight:500;margin:0 0 4px}
.act p{margin:0;font-size:14px;color:var(--ink2)}
.follow{background:var(--card);border:1px dashed var(--line);border-radius:10px;
padding:16px 20px;margin-top:12px;font-size:14px;color:var(--ink2)}
footer{margin-top:44px;padding-top:20px;border-top:1px solid var(--line);
font-size:12.5px;color:var(--ink3);line-height:1.8}
@media print{body{background:#fff}.wrap{padding:0}}
`;

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function fmtStars(arr) {
  if (!arr || !arr.length) return '—';
  return arr.map(s => {
    let t = s.name;
    if (s.brightness) t += `<span style="color:#9A9186">·${esc(s.brightness)}</span>`;
    if (s.mutagen) t += `<span class="mut">化${esc(s.mutagen)}</span>`;
    return t;
  }).join(' ');
}

function render(cfg, chart) {
  const p = chart.palaces.map(pal => `
    <tr>
      <td><strong>${esc(pal.name)}</strong>${pal.isBodyPalace ? '<br><span style="font-size:11px;color:#8C5A3C">身宫</span>' : ''}</td>
      <td>${esc(pal.heavenlyStem)}${esc(pal.earthlyBranch)}</td>
      <td class="stars">${fmtStars(pal.majorStars)}</td>
      <td class="stars" style="color:#6B6357">${fmtStars(pal.minorStars)}</td>
      <td>${esc(pal.decadal.range[0])}–${esc(pal.decadal.range[1])}岁</td>
    </tr>`).join('');

  const acts = (cfg.actions || []).map(a => `
    <div class="act"><div class="n">${esc(a.title).slice(0, 1)}</div>
    <div><h3>${esc(a.title)}</h3><p>${esc(a.detail)}</p></div></div>`).join('');

  const reading = (cfg.reading || []).map(r => `<p>${esc(r)}</p>`).join('');

  return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(cfg.title || '命理报告')}</title><style>${CSS}</style></head><body><div class="wrap">
<header>
  <p class="brand">${esc(cfg.brand || '')}</p>
  <h1>${esc(cfg.title || '命理报告')}</h1>
  <p class="meta">${esc(cfg.solar)} · ${esc(cfg.gender === '男' ? '男' : '女')}命 · 农历 ${esc(chart.lunarDate)}</p>
</header>

<div class="empathy">${esc(cfg.empathy)}</div>

<h2>命盘概览</h2>
<div class="grid">
  <div class="kv"><span class="k">命宫主星</span><span class="v">${esc(cfg.soulPalaceStars)}</span></div>
  <div class="kv"><span class="k">五行局</span><span class="v">${esc(chart.fiveElementsClass)}</span></div>
  <div class="kv"><span class="k">命主 / 身主</span><span class="v">${esc(chart.soul)} / ${esc(chart.body)}</span></div>
  <div class="kv"><span class="k">生肖 / 星座</span><span class="v">${esc(chart.zodiac)} / ${esc(chart.sign)}</span></div>
</div>

<h2>十二宫</h2>
<table>
  <thead><tr><th>宫位</th><th>干支</th><th>主星</th><th>辅星</th><th>大限</th></tr></thead>
  <tbody>${p}</tbody>
</table>

<h2>命盘解读</h2>
${reading}

<h2>接下来可以做的三件事</h2>
<div class="acts">${acts}</div>

<div class="follow">${esc(cfg.followup || '本报告附有 30 天内一次追问的机会，有疑问可以直接回复。')}</div>

<footer>
  ${esc(cfg.footer || '')}<br>
  排盘由 iztro 算法引擎生成。本报告为传统文化研究与娱乐参考，不构成医疗、法律、投资或其他专业建议。
</footer>
</div></body></html>`;
}

function main() {
  const args = process.argv.slice(2);
  const input = args[0];
  const oi = args.indexOf('-o');
  const output = oi >= 0 ? args[oi + 1] : 'report.html';

  const cfg = JSON.parse(fs.readFileSync(input, 'utf-8'));
  const chart = astro.bySolar(cfg.solar, cfg.timeIndex, cfg.gender, true, 'zh-CN');

  const mingPalace = chart.palaces.find(p => p.isOriginalPalace) || chart.palaces[0];
  cfg.soulPalaceStars = fmtStars(mingPalace.majorStars).replace(/<[^>]+>/g, '') || '空宫';

  const html = render(cfg, chart);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, html, 'utf-8');
  console.log('已生成：' + output + '（' + html.length + ' 字节）');
}

main();
