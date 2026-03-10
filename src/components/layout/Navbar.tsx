import { Github } from "lucide-react";
import { THEME } from "@/constants/theme";
import { ExamplesDropdown } from "./ExamplesDropdown";

export function Navbar() {
  return (
    <nav
      className="flex items-center justify-between h-12 px-4 shrink-0"
      style={{
        backgroundColor: THEME.colors.bg.secondary,
        borderBottom: `1px solid ${THEME.colors.border.editor}`,
      }}
    >
      {/* Left side - Logo/Title */}
      <div
        className="flex items-center gap-2 text-lg font-semibold"
        style={{
          color: THEME.colors.text.primary,
          fontFamily: THEME.fonts.ui,
        }}
      >
        <span style={{ color: THEME.colors.text.accent }}>&lt;/&gt;</span>
        <span>JS Visualizer</span>
      </div>

      {/* Center - Examples Dropdown */}
      <ExamplesDropdown />

      {/* Right side - GitHub link */}
      <a
        href="https://github.com/kleysondev/js-visualizer"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
        style={{
          border: `1px solid ${THEME.colors.border.editor}`,
          backgroundColor: "transparent",
          color: THEME.colors.text.secondary,
          fontFamily: THEME.fonts.ui,
          fontSize: 13,
          textDecoration: "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = THEME.colors.text.accent;
          e.currentTarget.style.color = THEME.colors.text.primary;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = THEME.colors.border.editor;
          e.currentTarget.style.color = THEME.colors.text.secondary;
        }}
      >
        <Github size={16} />
        <span>★ Star</span>
      </a>
    </nav>
  );
}
