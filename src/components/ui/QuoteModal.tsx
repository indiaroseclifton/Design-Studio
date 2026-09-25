import { useEffect, useMemo, useState } from 'react';
import { VENUES } from '../../engine/venues.gen';
import { CURRENCIES, DEFAULT_QUOTE, money, quoteCsv, quoteLines, quoteTotals, type QuoteLine, type QuoteSettings } from '../../lib/quote';
import { captureScene, downloadText, slug } from '../../lib/capture';
import { escapeHtml, readJSON, writeJSON } from '../../lib/storage';
import { useDesignStore } from '../../store/designStore';
import { Modal } from './Modal';
import { hasTbl } from '../../engine/studio';

const LS_KEY = 'vs2_quote';

function printQuote(lines: QuoteLine[], q: QuoteSettings, venueName: string, summary: string) {
  const t = quoteTotals(lines, q);
  const cats = [...new Set(lines.map((l) => l.cat))];
  const shot = captureScene(1600, 1000, 'image/jpeg', 0.88);
  const m = (v: number) => escapeHtml(money(q.cur, v));
  const rows = cats
    .map(
      (c) =>
        `<tr class="cat"><td colspan="4">${escapeHtml(c)}</td></tr>` +
        lines
          .filter((l) => l.cat === c)
          .map((l) => `<tr><td>${escapeHtml(l.name)}</td><td class="n">${l.qty}</td><td class="n">${m(l.price)}</td><td class="n">${m(l.qty * l.price)}</td></tr>`)
          .join(''),
    )
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(q.event || venueName)} — Quote</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Jost:wght@400;500&display=swap" rel="stylesheet">
<style>body{font:13px Jost,sans-serif;color:#221a10;margin:32px}h1{font:500 36px 'Cormorant Garamond',serif;margin:0}
.sub{opacity:.7;margin:4px 0 18px}img{width:100%;border-radius:8px;margin-bottom:18px}table{width:100%;border-collapse:collapse}
td,th{padding:6px;border-bottom:1px solid #e6dccb;text-align:left}th{font-size:10px;letter-spacing:.14em;text-transform:uppercase;opacity:.6}
.n{text-align:right;font-variant-numeric:tabular-nums}.cat td{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#9a7a3a;padding-top:14px}
.tot{margin:16px 0 0 auto;width:300px}.tot td{border:0}.big td{font:500 26px 'Cormorant Garamond',serif}</style></head><body>
<h1>${escapeHtml(q.event || 'Event quote')}</h1><div class="sub">${escapeHtml(summary)}${q.date ? ' · ' + escapeHtml(q.date) : ''}</div>
${shot ? `<img src="${shot}" alt="">` : ''}
<table><thead><tr><th>Item</th><th class="n">Qty</th><th class="n">Unit</th><th class="n">Total</th></tr></thead><tbody>${rows}</tbody></table>
<table class="tot"><tr><td>Subtotal</td><td class="n">${m(t.sub)}</td></tr><tr><td>Service ${q.svc}%</td><td class="n">${m(t.svc)}</td></tr>
<tr><td>Tax ${q.tax}%</td><td class="n">${m(t.tax)}</td></tr><tr class="big"><td>Total</td><td class="n">${m(t.total)}</td></tr></table>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}

export function QuoteModal() {
  const design = useDesignStore((s) => s.design);
  const closeModal = useDesignStore((s) => s.closeModal);
  const showToast = useDesignStore((s) => s.showToast);
  const venue = VENUES[design.venue] ?? VENUES[0];
  const [q, setQ] = useState<QuoteSettings>(() => ({ ...DEFAULT_QUOTE, ...readJSON<Partial<QuoteSettings>>(LS_KEY, {}) }));

  useEffect(() => {
    writeJSON(LS_KEY, q);
  }, [q]);

  const lines = useMemo(() => quoteLines(design, venue, q.prices), [design, venue, q.prices]);
  const totals = quoteTotals(lines, q);
  const cats = [...new Set(lines.map((l) => l.cat))];
  const m = (v: number) => money(q.cur, v);
  const nt = design.tables.length;
  const layoutNote = hasTbl(design.table.mode)
    ? `${nt} table${nt > 1 ? 's' : ''}`
    : design.table.mode === 'ceremony'
      ? 'ceremony seating'
      : 'no tables';
  const summary = `${venue.name} · ${design.guests} guests · ${layoutNote}`;

  const setPrice = (key: string, v: number) => setQ((s) => ({ ...s, prices: { ...s.prices, [key]: Math.max(0, v || 0) } }));

  return (
    <Modal title="Quote" onClose={closeModal}>
      <div className="mrow">
        <input className="inp" style={{ flex: 2, minWidth: 180 }} placeholder="Event name" value={q.event} onChange={(e) => setQ({ ...q, event: e.target.value })} />
        <input className="inp" style={{ flex: 1, minWidth: 130 }} type="date" value={q.date} onChange={(e) => setQ({ ...q, date: e.target.value })} />
        <select className="inp" aria-label="Currency" value={q.cur} onChange={(e) => setQ({ ...q, cur: e.target.value })}>
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="note">{summary}. Unit prices are editable rental estimates and are saved for next time.</div>

      {lines.length ? (
        <div className="scroll max-h-[46vh] overflow-auto">
          <table className="qt">
            <thead>
              <tr>
                <th>Item</th>
                <th className="n">Qty</th>
                <th className="n">Unit</th>
                <th className="n">Total</th>
              </tr>
            </thead>
            <tbody>
              {cats.map((c) => [
                <tr key={`cat:${c}`} className="cat">
                  <td colSpan={4}>{c}</td>
                </tr>,
                ...lines
                  .filter((l) => l.cat === c)
                  .map((l) => (
                    <tr key={l.key}>
                      <td>{l.name}</td>
                      <td className="n">{l.qty}</td>
                      <td className="n">
                        <input
                          className="inp"
                          type="number"
                          min={0}
                          step={0.5}
                          aria-label={`Unit price for ${l.name}`}
                          value={l.price}
                          onChange={(e) => setPrice(l.key, Number(e.target.value))}
                        />
                      </td>
                      <td className="n">{m(l.qty * l.price)}</td>
                    </tr>
                  )),
              ])}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty">Nothing to quote yet — add a layout or pieces.</p>
      )}

      <div className="tot">
        <span>Subtotal</span>
        <span className="n">{m(totals.sub)}</span>
        <span>
          Service
          <input className="inp" type="number" min={0} aria-label="Service percent" value={q.svc} onChange={(e) => setQ({ ...q, svc: Math.max(0, Number(e.target.value) || 0) })} />%
        </span>
        <span className="n">{m(totals.svc)}</span>
        <span>
          Tax
          <input className="inp" type="number" min={0} aria-label="Tax percent" value={q.tax} onChange={(e) => setQ({ ...q, tax: Math.max(0, Number(e.target.value) || 0) })} />%
        </span>
        <span className="n">{m(totals.tax)}</span>
        <span className="big">Total</span>
        <span className="big n">{m(totals.total)}</span>
      </div>

      <div className="mrow">
        <button
          type="button"
          className="btn primary"
          disabled={!lines.length}
          onClick={() => downloadText(quoteCsv(lines, q), `${slug(q.event || 'event')}-quote.csv`, 'text/csv')}
        >
          Export CSV
        </button>
        <button
          type="button"
          className="btn"
          disabled={!lines.length}
          onClick={() => {
            if (!printQuote(lines, q, venue.name, summary)) showToast('Allow pop-ups to print the quote');
          }}
        >
          Print or save PDF
        </button>
        <button type="button" className="btn" onClick={() => setQ({ ...q, prices: {} })}>
          Reset prices
        </button>
      </div>
    </Modal>
  );
}
