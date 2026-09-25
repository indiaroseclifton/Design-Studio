import { StudioCanvas } from './components/Studio/StudioCanvas';
import { CataloguePanel } from './components/ui/CataloguePanel';
import { TopToolbar } from './components/ui/TopToolbar';
import { RightColumn } from './components/ui/RightColumn';
import { VenueStrip } from './components/ui/VenueStrip';
import { HintPill } from './components/ui/HintPill';
import { Toast } from './components/ui/Toast';
import { ComingSoonOverlay } from './components/ui/ComingSoonOverlay';
import { Letterbox } from './components/ui/Letterbox';
import { DesignsModal } from './components/ui/DesignsModal';
import { QuoteModal } from './components/ui/QuoteModal';
import { AddonsModal } from './components/ui/AddonsModal';
import { useEffect } from 'react';
import { useVenuePhoto } from './lib/venuePhoto';
import { useDesignStore } from './store/designStore';
import { useKeyboardShortcuts } from './lib/useKeyboardShortcuts';
import { useApplyTweaks } from './lib/useApplyTweaks';
import { useShareLink } from './lib/useShareLink';

export default function App() {
  const modal = useDesignStore((s) => s.modal);
  useKeyboardShortcuts();
  useApplyTweaks();
  useShareLink();
  const loadPhoto = useVenuePhoto((s) => s.load);
  useEffect(() => {
    loadPhoto();
  }, [loadPhoto]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <StudioCanvas />
      <Letterbox />
      <CataloguePanel />
      <TopToolbar />
      <RightColumn />
      <VenueStrip />
      <HintPill />
      <Toast />
      {modal === 'designs' && <DesignsModal />}
      {modal === 'quote' && <QuoteModal />}
      {modal === 'addons' && <AddonsModal />}
      <ComingSoonOverlay />
    </div>
  );
}
