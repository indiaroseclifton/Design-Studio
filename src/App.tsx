import { StudioCanvas } from './components/Studio/StudioCanvas';
import { CataloguePanel } from './components/ui/CataloguePanel';
import { TopToolbar } from './components/ui/TopToolbar';
import { RightColumn } from './components/ui/RightColumn';
import { VenueStrip } from './components/ui/VenueStrip';
import { HintPill } from './components/ui/HintPill';
import { Toast } from './components/ui/Toast';
import { ComingSoonOverlay } from './components/ui/ComingSoonOverlay';

export default function App() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <StudioCanvas />
      <CataloguePanel />
      <TopToolbar />
      <RightColumn />
      <VenueStrip />
      <HintPill />
      <Toast />
      <ComingSoonOverlay />
    </div>
  );
}
