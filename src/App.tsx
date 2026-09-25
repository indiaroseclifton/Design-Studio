import { StudioCanvas } from "./components/Studio/StudioCanvas";
import { CataloguePanel } from "./components/ui/CataloguePanel";
import { TopToolbar } from "./components/ui/TopToolbar";
import { RightColumn } from "./components/ui/RightColumn";
import { VenueStrip } from "./components/ui/VenueStrip";
import { HintPill } from "./components/ui/HintPill";
import { Toast } from "./components/ui/Toast";
import { Letterbox } from "./components/ui/Letterbox";
import { Suspense, lazy, useEffect } from "react";
import { useVenuePhoto } from "./lib/venuePhoto";
import { useDesignStore } from "./store/designStore";
import { useKeyboardShortcuts } from "./lib/useKeyboardShortcuts";
import { useApplyTweaks } from "./lib/useApplyTweaks";
import { useShareLink } from "./lib/useShareLink";

// Studios, overlays and modals load on first use, which keeps the first download to the studio itself.
const DesignsModal = lazy(() =>
  import("./components/ui/DesignsModal").then((m) => ({
    default: m.DesignsModal,
  })),
);
const QuoteModal = lazy(() =>
  import("./components/ui/QuoteModal").then((m) => ({ default: m.QuoteModal })),
);
const AddonsModal = lazy(() =>
  import("./components/ui/AddonsModal").then((m) => ({
    default: m.AddonsModal,
  })),
);
const FlowerStudio = lazy(() =>
  import("./components/flower/FlowerStudio").then((m) => ({
    default: m.FlowerStudio,
  })),
);
const CakeStudio = lazy(() =>
  import("./components/cake/CakeStudio").then((m) => ({
    default: m.CakeStudio,
  })),
);
const BrassLantern = lazy(() =>
  import("./components/overlays/BrassLantern").then((m) => ({
    default: m.BrassLantern,
  })),
);
const ArViewer = lazy(() =>
  import("./components/overlays/ArViewer").then((m) => ({
    default: m.ArViewer,
  })),
);
const StorybookOverlay = lazy(() =>
  import("./components/overlays/StorybookOverlay").then((m) => ({
    default: m.StorybookOverlay,
  })),
);

export default function App() {
  const modal = useDesignStore((s) => s.modal);
  const studio = useDesignStore((s) => s.studio);
  const cakeStudio = useDesignStore((s) => s.cakeStudio);
  const overlay = useDesignStore((s) => s.overlay);
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
      <Suspense fallback={<div className="lazy-wait">Loading…</div>}>
        {/* key: reopening the studio (or editing another arrangement) starts from fresh state */}
        {studio.open && <FlowerStudio key={studio.editId ?? "new"} />}
        {cakeStudio.open && <CakeStudio key={cakeStudio.editId ?? "new"} />}
        {modal === "designs" && <DesignsModal />}
        {modal === "quote" && <QuoteModal />}
        {modal === "addons" && <AddonsModal />}
        {overlay === "lantern" && <BrassLantern />}
        {overlay === "ar" && <ArViewer />}
        {overlay === "storybook" && <StorybookOverlay />}
      </Suspense>
    </div>
  );
}
