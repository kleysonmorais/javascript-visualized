import { Link, useLocation } from 'react-router-dom';
import GitHubButton from 'react-github-btn';
import { Dumbbell } from 'lucide-react';
import { FaJsSquare } from 'react-icons/fa';
import { THEME } from '@/constants/theme';

export function Navbar() {
  const location = useLocation();
  const isChallenges =
    location.pathname === '/challenges' ||
    location.pathname.startsWith('/challenges/');

  return (
    <nav
      className="flex items-center justify-between h-12 px-3 sm:px-4 shrink-0"
      style={{
        backgroundColor: THEME.colors.bg.secondary,
        borderBottom: `1px solid ${THEME.colors.border.editor}`,
      }}
    >
      <Link
        to="/"
        className="flex items-center gap-2 text-base sm:text-lg font-semibold no-underline"
        style={{
          color: THEME.colors.text.primary,
          fontFamily: THEME.fonts.ui,
        }}
      >
        <FaJsSquare size={25} style={{ color: THEME.colors.text.accent }} />
        <span>JS Visualized</span>
      </Link>

      <div className="flex items-center gap-4">
        <Link
          to="/challenges"
          className="flex items-center gap-1.5 text-sm font-medium no-underline transition-colors duration-150 pb-0.5"
          style={{
            color: isChallenges ? THEME.colors.text.accent : THEME.colors.text.secondary,
            borderBottom: isChallenges
              ? `2px solid ${THEME.colors.text.accent}`
              : '2px solid transparent',
            fontFamily: THEME.fonts.ui,
          }}
        >
          <Dumbbell size={16} />
          <span>Challenges</span>
        </Link>

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
      </div>
    </nav>
  );
}
