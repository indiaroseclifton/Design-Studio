import { Fragment, useMemo, useState } from 'react';
import { useDesignStore } from '../../store/designStore';
import { useTableLayout } from '../../lib/useTableLayout';
import { resolvePlacements } from '../../lib/placements';
import { ITEMS } from '../../data/catalogue';
import { CATEGORIES } from '../../data/catalogue';
import { ADDON_PACKS } from '../../data/addonPacks';
import { downloadText } from '../../lib/download';
import { Modal } from './Modal';

const CATEGORY_LABEL: Record<string, string> = {
  ...Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])),
  ...Object.fromEntries(ADDON_PACKS.map((p) => [p.categoryId, p.categoryLabel])),
};

interface LineItem {
  type: string;
  name: string;
  cat: string;
  qty: number;
  unitPrice: number;
}

function money(n: number) {
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

export function QuoteModal() {
  const design = useDesignStore((s) => s.design);
  const quoteSettings = useDesignStore((s) => s.quoteSettings);
  const setQuoteSetting = useDesignStore((s) => s.setQuoteSetting);
  const closeModal = useDesignStore((s) => s.closeModal);
  const { tables } = useTableLayout();
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const lineItems = useMemo(() => {
    const placements = resolvePlacements(design, tables);
    const counts = new Map<string, number>();
    for (const p of placements) counts.set(p.item.type, (counts.get(p.item.type) ?? 0) + 1);

    const items: LineItem[] = [];
    for (const [type, qty] of counts) {
      const def = ITEMS[type];
      if (!def) continue;
      items.push({ type, name: def.name, cat: def.cat, qty, unitPrice: overrides[type] ?? def.price });
    }
    return items.sort((a, b) => a.cat.localeCompare(b.cat) || a.name.localeCompare(b.name));
  }, [design, tables, overrides]);

  const grouped = useMemo(() => {
    const map = new Map<string, LineItem[]>();
    for (const item of lineItems) {
      if (!map.has(item.cat)) map.set(item.cat, []);
      map.get(item.cat)!.push(item);
    }
    return Array.from(map.entries());
  }, [lineItems]);

  const subtotal = lineItems.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
  const service = subtotal * (quoteSettings.servicePct / 100);
  const taxBase = subtotal + service;
  const tax = taxBase * (quoteSettings.taxPct / 100);
  const total = taxBase + tax;

  function handleCsv() {
    const rows = [['Category', 'Item', 'Qty', 'Unit price', 'Line total']];
    for (const [cat, items] of grouped) {
      for (const item of items) {
        rows.push([CATEGORY_LABEL[cat] ?? cat, item.name, String(item.qty), item.unitPrice.toFixed(2), (item.qty * item.unitPrice).toFixed(2)]);
      }
    }
    rows.push([]);
    rows.push(['', '', '', 'Subtotal', subtotal.toFixed(2)]);
    rows.push(['', '', '', `Service (${quoteSettings.servicePct}%)`, service.toFixed(2)]);
    rows.push(['', '', '', `Tax (${quoteSettings.taxPct}%)`, tax.toFixed(2)]);
    rows.push(['', '', '', 'Total', total.toFixed(2)]);
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    downloadText(csv, 'quote.csv', 'text/csv');
  }

  return (
    <Modal title="Quote" onClose={closeModal} wide>
      <div className="print-area flex flex-col gap-3.5">
        {lineItems.length === 0 ? (
          <div className="px-1 py-6 text-center text-[13px] opacity-60">Place some pieces in the Studio to see pricing here.</div>
        ) : (
          <table className="qt w-full border-collapse text-[13px]">
            <thead>
              <tr>
                <th className="border-b p-1.5 text-left text-[10.5px] uppercase tracking-[0.14em] opacity-60" style={{ borderColor: 'rgba(255,240,220,.12)' }}>
                  Item
                </th>
                <th className="border-b p-1.5 text-right text-[10.5px] uppercase tracking-[0.14em] opacity-60" style={{ borderColor: 'rgba(255,240,220,.12)' }}>
                  Qty
                </th>
                <th className="border-b p-1.5 text-right text-[10.5px] uppercase tracking-[0.14em] opacity-60" style={{ borderColor: 'rgba(255,240,220,.12)' }}>
                  Unit price
                </th>
                <th className="border-b p-1.5 text-right text-[10.5px] uppercase tracking-[0.14em] opacity-60" style={{ borderColor: 'rgba(255,240,220,.12)' }}>
                  Line total
                </th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(([cat, items]) => (
                <Fragment key={cat}>
                  <tr>

                    <td colSpan={4} className="pt-3.5 text-[10.5px] uppercase tracking-[0.14em]" style={{ color: 'var(--ac)' }}>
                      {CATEGORY_LABEL[cat] ?? cat}
                    </td>
                  </tr>
                  {items.map((item) => (
                    <tr key={item.type}>
                      <td className="border-b p-1.5" style={{ borderColor: 'rgba(255,240,220,.06)' }}>
                        {item.name}
                      </td>
                      <td className="border-b p-1.5 text-right tabular-nums" style={{ borderColor: 'rgba(255,240,220,.06)' }}>
                        {item.qty}
                      </td>
                      <td className="border-b p-1.5 text-right" style={{ borderColor: 'rgba(255,240,220,.06)' }}>
                        <input
                          className="inp w-20 py-1 text-right"
                          type="number"
                          min={0}
                          step={0.5}
                          value={item.unitPrice}
                          onChange={(e) => setOverrides((o) => ({ ...o, [item.type]: Number(e.target.value) }))}
                        />
                      </td>
                      <td className="border-b p-1.5 text-right tabular-nums" style={{ borderColor: 'rgba(255,240,220,.06)' }}>
                        {money(item.qty * item.unitPrice)}
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}

        <div className="tot ml-auto grid min-w-[280px] grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 text-[13px]">
          <span>Subtotal</span>
          <span className="text-right tabular-nums">{money(subtotal)}</span>
          <span className="flex items-center gap-2">
            Service <input className="inp w-16 px-1.5 py-1 text-right" type="number" min={0} value={quoteSettings.servicePct} onChange={(e) => setQuoteSetting('servicePct', Number(e.target.value))} />%
          </span>
          <span className="text-right tabular-nums">{money(service)}</span>
          <span className="flex items-center gap-2">
            Tax <input className="inp w-16 px-1.5 py-1 text-right" type="number" min={0} value={quoteSettings.taxPct} onChange={(e) => setQuoteSetting('taxPct', Number(e.target.value))} />%
          </span>
          <span className="text-right tabular-nums">{money(tax)}</span>
          <span className="serif text-[24px]">Total</span>
          <span className="serif text-right text-[24px] tabular-nums">{money(total)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={handleCsv} disabled={!lineItems.length}>
          Export CSV
        </button>
        <button type="button" className="btn" onClick={() => window.print()} disabled={!lineItems.length}>
          Print / Save as PDF
        </button>
      </div>
    </Modal>
  );
}
