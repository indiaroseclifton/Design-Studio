import { useEffect, useRef, useState } from 'react';
import { useDesignStore } from '../../store/designStore';
import { getPalette } from '../../data/palettes';
import { COCKTAILS } from '../../data/cocktails';
import { triggerDownload } from '../../lib/download';
import { Modal } from './Modal';

const CARD_W = 800;
const CARD_H = 1100;
const MAX_DRINKS = 6;

export function BrassLanternModal() {
  const closeModal = useDesignStore((s) => s.closeModal);
  const paletteId = useDesignStore((s) => s.design.palette);
  const palette = getPalette(paletteId);

  const [selected, setSelected] = useState<string[]>(['old_fashioned', 'aperol_spritz', 'garden_spritz']);
  const [signatureName, setSignatureName] = useState('The Wildflower');
  const [signatureDesc, setSignatureDesc] = useState('Gin, elderflower, lemon, prosecco');
  const [eventName, setEventName] = useState('Cocktail Hour');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((i) => i !== id) : cur.length >= MAX_DRINKS ? cur : [...cur, id]));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const ctx: CanvasRenderingContext2D = context;
    canvas.width = CARD_W;
    canvas.height = CARD_H;

    const gold = palette.b[0] ?? '#c9a25a';

    const grad = ctx.createLinearGradient(0, 0, 0, CARD_H);
    grad.addColorStop(0, '#20140d');
    grad.addColorStop(1, '#0f0a07');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    ctx.strokeStyle = gold;
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, CARD_W - 48, CARD_H - 48);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(201,162,90,.5)';
    ctx.strokeRect(34, 34, CARD_W - 68, CARD_H - 68);

    ctx.textAlign = 'center';
    ctx.fillStyle = gold;
    ctx.font = '500 20px Jost, sans-serif';
    ctx.fillText('THE BRASS LANTERN', CARD_W / 2, 96);
    ctx.fillStyle = '#f4ece0';
    ctx.font = 'italic 500 52px "Cormorant Garamond", serif';
    ctx.fillText(eventName || 'Cocktail Hour', CARD_W / 2, 150);

    ctx.strokeStyle = 'rgba(201,162,90,.5)';
    ctx.beginPath();
    ctx.moveTo(CARD_W / 2 - 80, 178);
    ctx.lineTo(CARD_W / 2 + 80, 178);
    ctx.stroke();

    let y = 236;

    if (signatureName.trim()) {
      ctx.fillStyle = gold;
      ctx.font = '500 13px Jost, sans-serif';
      ctx.fillText('SIGNATURE COCKTAIL', CARD_W / 2, y);
      y += 36;
      ctx.fillStyle = '#f4ece0';
      ctx.font = 'italic 500 30px "Cormorant Garamond", serif';
      ctx.fillText(signatureName, CARD_W / 2, y);
      y += 28;
      ctx.fillStyle = 'rgba(244,236,224,.7)';
      ctx.font = '400 15px Jost, sans-serif';
      ctx.fillText(signatureDesc, CARD_W / 2, y);
      y += 54;
    }

    const items = COCKTAILS.filter((c) => selected.includes(c.id));
    const cocktails = items.filter((c) => c.kind === 'cocktail');
    const mocktails = items.filter((c) => c.kind === 'mocktail');

    function drawSection(label: string, list: typeof items) {
      if (!list.length) return;
      ctx.fillStyle = gold;
      ctx.font = '500 13px Jost, sans-serif';
      ctx.fillText(label, CARD_W / 2, y);
      y += 32;
      for (const c of list) {
        ctx.fillStyle = '#f4ece0';
        ctx.font = '500 22px "Cormorant Garamond", serif';
        ctx.fillText(c.name, CARD_W / 2, y);
        y += 24;
        ctx.fillStyle = 'rgba(244,236,224,.6)';
        ctx.font = '400 13px Jost, sans-serif';
        ctx.fillText(c.desc, CARD_W / 2, y);
        y += 36;
      }
      y += 12;
    }

    drawSection('COCKTAILS', cocktails);
    drawSection('MOCKTAILS', mocktails);

    ctx.fillStyle = 'rgba(244,236,224,.5)';
    ctx.font = 'italic 500 14px "Cormorant Garamond", serif';
    ctx.fillText('Cheers to the celebration', CARD_W / 2, CARD_H - 50);
  }, [selected, signatureName, signatureDesc, eventName, palette]);

  function downloadCard() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    triggerDownload(canvas.toDataURL('image/png'), 'brass-lantern-cocktail-menu.png');
  }

  return (
    <Modal title="Brass Lantern — Cocktail Menu" onClose={closeModal} wide>
      <p className="text-[12.5px] leading-[1.5] opacity-70">
        Design a cocktail &amp; mocktail menu card for the bar, themed to your palette.
      </p>
      <div className="grid gap-4" style={{ gridTemplateColumns: '260px 1fr' }}>
        <div className="flex flex-col gap-3">
          <div>
            <div className="lbl mb-1.5">Menu title</div>
            <input className="inp" value={eventName} onChange={(e) => setEventName(e.target.value)} maxLength={30} />
          </div>
          <div>
            <div className="lbl mb-1.5">Signature cocktail</div>
            <input className="inp mb-1.5" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Name" maxLength={30} />
            <input className="inp" value={signatureDesc} onChange={(e) => setSignatureDesc(e.target.value)} placeholder="Description" maxLength={60} />
          </div>
          <div>
            <div className="lbl mb-1.5 flex items-baseline justify-between">
              <span>Pick up to {MAX_DRINKS} drinks</span>
              <span className="opacity-60">{selected.length}/{MAX_DRINKS}</span>
            </div>
            <div className="flex max-h-[260px] flex-col gap-1 overflow-auto pr-1">
              {COCKTAILS.map((c) => (
                <label key={c.id} className="check">
                  <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
                  <span>
                    {c.name} <small className="opacity-60">({c.kind})</small>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <button type="button" className="btn primary" onClick={downloadCard}>
            Download menu card
          </button>
        </div>
        <div className="flex items-start justify-center">
          <canvas ref={canvasRef} style={{ width: 320, height: 440, borderRadius: 8 }} />
        </div>
      </div>
    </Modal>
  );
}
