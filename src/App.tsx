import { StudioCanvas } from './components/Studio/StudioCanvas';
import { CataloguePanel } from './components/ui/CataloguePanel';
import { TopToolbar } from './components/ui/TopToolbar';
import { RightColumn } from './components/ui/RightColumn';
import { VenueStrip } from './components/ui/VenueStrip';
import { HintPill } from './components/ui/HintPill';
import { Toast } from './components/ui/Toast';
import { ComingSoonOverlay } from './components/ui/ComingSoonOverlay';
import { DesignsModal } from './components/ui/DesignsModal';
import { QuoteModal } from './components/ui/QuoteModal';
import { AddonsModal } from './components/ui/AddonsModal';
import { StorybookModal } from './components/ui/StorybookModal';
import { BrassLanternModal } from './components/ui/BrassLanternModal';
import { FlowerStudioOverlay } from './components/flowerStudio/FlowerStudioOverlay';
import { useDesignStore } from './store/designStore';
import { useFlowerStudioStore } from './store/flowerStudioStore';
import { useKeyboardShortcuts } from './lib/useKeyboardShortcuts';

export default function App() {
  const modal = useDesignStore((s) => s.modal);
  const flowerStudioOpen = useFlowerStudioStore((s) => s.isOpen);
  useKeyboardShortcuts();

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
      {modal === 'designs' && <DesignsModal />}
      {modal === 'quote' && <QuoteModal />}
      {modal === 'addons' && <AddonsModal />}
      {modal === 'storybook' && <StorybookModal />}
      {modal === 'brassLantern' && <BrassLanternModal />}
      {flowerStudioOpen && <FlowerStudioOverlay />}
    </div>
  );
}
