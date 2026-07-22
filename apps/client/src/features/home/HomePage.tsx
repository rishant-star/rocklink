import { Container } from "@/shared/components/layout/Container";
import { Text } from "@/shared/components/Text";
import { SiteNav } from "./components/SiteNav";
import { HeroSection } from "./components/HeroSection";
import { IndexSection } from "./components/IndexSection";

/**
 * Redesigned against a minimal, editorial reference (thin nav bar,
 * asymmetric hero, numbered index section, thin footer bar) — replaces
 * the earlier centered "game launcher" framing with a wide, scrollable
 * page layout. Content and entry points (Create/Join/AI) are unchanged;
 * only the structural layout and visual language moved.
 */
export function HomePage() {
  return (
    <Container maxWidth="2xl">
      <SiteNav />
      <HeroSection />
      <IndexSection />
      <footer className="flex flex-col gap-2 border-t border-glass-border py-8 sm:flex-row sm:items-center sm:justify-between">
        <Text size="caption" tone="muted" className="normal-case tracking-normal">
          RockLink · Player vs Player · Player vs AI
        </Text>
        <Text size="caption" tone="muted" className="normal-case tracking-normal">
          No video ever leaves your device
        </Text>
      </footer>
    </Container>
  );
}
