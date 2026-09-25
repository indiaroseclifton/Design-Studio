import { VenuePanel } from './VenuePanel';
import { LayoutPanel } from './LayoutPanel';
import { ViewPanel } from './ViewPanel';
import { InspectorPanel } from './InspectorPanel';
import { TweaksPanel } from './TweaksPanel';
import { useEffect } from 'react';
import { useDesignStore } from '../../store/designStore';
import { useSmall } from '../../lib/useMedia';

export function RightColumn() {
  const small = useSmall();
  const open = useDesignStore((s) => s.drawer === 'panel');
  const selected = useDesignStore((s) => !!s.selection);
  // On small screens this is a bottom drawer; with a selection the inspector comes first.
  const inspectorFirst = small && selected;
  // Selecting something on a small screen opens this drawer so its inspector is in view.
  const selKey = useDesignStore((s) => JSON.stringify(s.selection));
  useEffect(() => {
    if (small && selKey !== 'null') useDesignStore.getState().setDrawer('panel');
  }, [small, selKey]);
  return (
    <div className={`right-col scroll chrome fixed right-4 top-4 z-[3] flex w-[276px] flex-col gap-2.5 overflow-auto ${open ? 'open' : ''}`} style={{ maxHeight: 'calc(100vh - var(--strip) - 16px)' }}>
      {inspectorFirst && <InspectorPanel />}
      <VenuePanel />
      <LayoutPanel />
      <ViewPanel />
      {!inspectorFirst && <InspectorPanel />}
      <TweaksPanel />
    </div>
  );
}
