import { Text } from "@/shared/components/Text";

const links = [
  { href: "#multiplayer", label: "Multiplayer" },
  { href: "#ai", label: "Play vs AI" },
  { href: "#camera", label: "Camera" },
];

/**
 * Thin, borderless-except-bottom-hairline header — replaces the old
 * centered "game launcher" framing with the reference's site-header
 * pattern: wordmark left, nav labels right. Links are in-page anchors
 * (no new routes) to the corresponding HeroSection/IndexSection blocks.
 */
export function SiteNav() {
  return (
    <nav className="flex items-center justify-between border-b border-glass-border py-6">
      <Text as="span" size="md" className="font-display font-semibold tracking-tight normal-case">
        RockLink
      </Text>
      <ul className="hidden gap-8 sm:flex">
        {links.map((link) => (
          <li key={link.href}>
            <a href={link.href}>
              <Text
                size="caption"
                tone="muted"
                className="transition-colors duration-micro hover:text-text-primary"
              >
                {link.label}
              </Text>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
