/**
 * The Brass Lantern (handoff §4): the self-contained cocktail menu designer from the handoff, embedded full
 * screen. The toolbar stays visible above it; Esc or any other toolbar button closes it.
 */
export function BrassLantern() {
  return (
    <div className="bl-root" role="dialog" aria-label="The Brass Lantern cocktail bar">
      <iframe title="The Brass Lantern" src={`${import.meta.env.BASE_URL}modules/brass-lantern.html`} allow="clipboard-write" />
    </div>
  );
}
