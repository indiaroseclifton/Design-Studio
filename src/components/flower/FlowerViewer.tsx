import { VESS } from '../../engine/catalogue.gen';
import { buildFullArrangement } from '../../engine/placed';
import type { Draft } from '../../engine/flowers';
import { StudioViewer, type Backdrop, type Placing, type StudioView } from '../studio3d/StudioViewer';

export type { Backdrop, StudioView };

export function FlowerViewer({ draft, ...rest }: { draft: Draft; turntable: boolean; view: StudioView; viewNonce: number; backdrop: Backdrop; placing?: Placing }) {
  return (
    <StudioViewer
      {...rest}
      buildKey={JSON.stringify(draft)}
      build={(g) => buildFullArrangement(g, draft)}
      surf={VESS[draft.vessel]?.surf ?? 'table'}
      frameKey={`${draft.vessel}|${draft.size}`}
    />
  );
}
