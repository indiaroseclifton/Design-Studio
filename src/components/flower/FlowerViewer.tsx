import { VESS, buildArrangement } from '../../engine/catalogue.gen';
import type { Draft } from '../../engine/flowers';
import { StudioViewer, type Backdrop, type StudioView } from '../studio3d/StudioViewer';

export type { Backdrop, StudioView };

export function FlowerViewer({ draft, ...rest }: { draft: Draft; turntable: boolean; view: StudioView; viewNonce: number; backdrop: Backdrop }) {
  return (
    <StudioViewer
      {...rest}
      buildKey={JSON.stringify(draft)}
      build={(g) => buildArrangement(g, draft)}
      surf={VESS[draft.vessel]?.surf ?? 'table'}
      frameKey={`${draft.vessel}|${draft.size}`}
    />
  );
}
