import { VenuePanel } from './VenuePanel';
import { LayoutPanel } from './LayoutPanel';
import { ViewPanel } from './ViewPanel';
import { InspectorPanel } from './InspectorPanel';

export function RightColumn() {
  return (
    <div className="scroll fixed right-4 top-4 z-[3] flex w-[276px] flex-col gap-2.5 overflow-auto" style={{ maxHeight: 'calc(100vh - 146px)' }}>
      <VenuePanel />
      <LayoutPanel />
      <ViewPanel />
      <InspectorPanel />
    </div>
  );
}
