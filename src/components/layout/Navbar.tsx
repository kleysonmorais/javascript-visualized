import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import GitHubButton from 'react-github-btn';
import { FaJsSquare, FaTrophy } from 'react-icons/fa';
import { THEME } from '@/constants/theme';
import { useTranslation } from 'react-i18next';

export function Navbar() {
  const { t } = useTranslation();
  const location = useLocation();
  const [hovered, setHovered] = useState(false);
  const isChallenges =
    location.pathname === '/challenges' ||
    location.pathname.startsWith('/challenges/');

  return (
    <nav
      className='flex items-center justify-between h-12 px-3 sm:px-4 shrink-0'
      style={{
        backgroundColor: THEME.colors.bg.secondary,
        borderBottom: `1px solid ${THEME.colors.border.editor}`,
      }}
    >
      <Link
        to='/'
        className='flex items-center gap-2 text-base sm:text-lg font-semibold no-underline'
        style={{
          color: THEME.colors.text.primary,
          fontFamily: THEME.fonts.ui,
        }}
      >
        <FaJsSquare size={25} style={{ color: THEME.colors.text.accent }} />
        <span>JS Visualized</span>
      </Link>

      <div className='flex items-center gap-3'>
        <Link
          to='/challenges'
          className={`flex items-center gap-1.5 text-sm rounded-xs font-medium 
            no-underline transition-colors duration-150 px-2 py-1.25`}
          style={{
            color:
              isChallenges || hovered
                ? THEME.colors.text.accent
                : THEME.colors.text.secondary,
            fontFamily: THEME.fonts.ui,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <FaTrophy size={16} />
          <span>{t('challenges.pageTitle')}</span>
        </Link>

        <div className='pt-1.25'>
          <GitHubButton
            href='https://github.com/kleysonmorais/javascript-visualized'
            data-color-scheme='no-preference: light; light: light; dark: dark;'
            data-icon='octicon-star'
            data-size='large'
            data-show-count='true'
            aria-label='Star kleysonmorais/javascript-visualized on GitHub'
          >
            Star on GitHub
          </GitHubButton>
        </div>
      </div>
    </nav>
  );
}
