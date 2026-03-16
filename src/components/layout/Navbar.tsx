import GitHubButton from "react-github-btn";
import { THEME } from "@/constants/theme";
import { FaJsSquare } from "react-icons/fa";

export function Navbar() {
  return (
    <nav
      className="flex items-center justify-between h-12 px-3 sm:px-4 shrink-0"
      style={{
        backgroundColor: THEME.colors.bg.secondary,
        borderBottom: `1px solid ${THEME.colors.border.editor}`,
      }}
    >
      <div
        className="flex items-center gap-2 text-base sm:text-lg font-semibold"
        style={{
          color: THEME.colors.text.primary,
          fontFamily: THEME.fonts.ui,
        }}
      >
        <FaJsSquare size={25} style={{ color: THEME.colors.text.accent }} />
        <span className="">JS Visualized</span>
      </div>

      <GitHubButton
        href="https://github.com/kleysonmorais/javascript-visualized"
        data-color-scheme="no-preference: light; light: light; dark: dark;"
        data-icon="octicon-star"
        data-size="large"
        data-show-count="true"
        aria-label="Star kleysonmorais/javascript-visualized on GitHub"
      >
        Star on GitHub
      </GitHubButton>
    </nav>
  );
}
