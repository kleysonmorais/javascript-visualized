import { Link } from 'react-router-dom';
import { CheckCircle, Circle, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { THEME } from '@/constants/theme';
import { ALL_CHALLENGES, getChallengesByLevel } from '@/challenges/index';
import { isCompleted, getCompletedCount } from '@/lib/progress';
import type { Challenge, ChallengeLevel } from '@/challenges/types';
import { FaTrophy } from 'react-icons/fa';
import { LEVEL_CONFIG, LEVELS } from '@/constants/level-config';
import { RiFireLine } from 'react-icons/ri';

interface ChallengeCardProps {
  challenge: Challenge;
}

function ChallengeCard({ challenge }: ChallengeCardProps) {
  const completed = isCompleted(challenge.id);
  const { i18n } = useTranslation();
  const isPtBr = i18n.language === 'pt-BR';

  return (
    <Link to={`/challenges/${challenge.id}`} className='block'>
      <div
        className='flex items-start gap-3 p-4 rounded-lg transition-colors duration-150 cursor-pointer group'
        style={
          { '--hover-bg': THEME.colors.bg.tertiary } as React.CSSProperties
        }
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = THEME.colors.bg.tertiary)
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.backgroundColor = 'transparent')
        }
      >
        <div className='shrink-0 mt-0.5'>
          {completed ? (
            <CheckCircle size={22} style={{ color: '#22c55e' }} />
          ) : (
            <Circle size={22} style={{ color: THEME.colors.text.muted }} />
          )}
        </div>

        <div className='flex-1 min-w-0'>
          <h3
            className='font-semibold transition-colors duration-150'
            style={{
              color: THEME.colors.text.primary,
              fontFamily: THEME.fonts.ui,
            }}
          >
            {isPtBr && challenge.titlePtBr ? challenge.titlePtBr : challenge.title}
          </h3>
          <p
            className='text-sm mt-1 line-clamp-1'
            style={{ color: THEME.colors.text.muted }}
          >
            {isPtBr && challenge.descriptionPtBr ? challenge.descriptionPtBr : challenge.description}
          </p>
        </div>

        <ChevronRight
          size={18}
          className='shrink-0 mt-1 transition-colors duration-150'
          style={{ color: THEME.colors.text.muted }}
        />
      </div>
    </Link>
  );
}

interface LevelSectionProps {
  level: ChallengeLevel;
  challenges: Challenge[];
}

function LevelSection({ level, challenges }: LevelSectionProps) {
  if (challenges.length === 0) return null;

  const config = LEVEL_CONFIG[level];
  const completedCount = challenges.filter((c) => isCompleted(c.id)).length;

  return (
    <div className='mb-6'>
      <div
        className='flex items-center justify-between px-4 py-3 rounded-t-lg mb-0.5'
        style={{
          borderLeft: `3px solid ${config.color}`,
          backgroundColor: THEME.colors.bg.secondary,
        }}
      >
        <div
          className='flex items-center gap-2'
          style={{ color: config.color, fontFamily: THEME.fonts.ui }}
        >
          <RiFireLine />
          <span className='font-bold text-sm uppercase tracking-wide'>
            {config.label}
          </span>
        </div>
        <span
          className='text-sm font-medium'
          style={{ color: THEME.colors.text.muted }}
        >
          {completedCount}/{challenges.length}
        </span>
      </div>

      <div
        className='rounded-b-lg overflow-hidden'
        style={{ backgroundColor: THEME.colors.bg.secondary }}
      >
        {challenges.map((challenge, i) => (
          <div key={challenge.id}>
            {i > 0 && (
              <div
                className='mx-4'
                style={{ borderTop: `1px solid rgba(255,255,255,0.05)` }}
              />
            )}
            <ChallengeCard challenge={challenge} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChallengesListPage() {
  const { t } = useTranslation();
  const completedCount = getCompletedCount();
  const totalCount = ALL_CHALLENGES.length;

  return (
    <div
      className='h-full overflow-y-auto flex flex-col'
      style={{ backgroundColor: THEME.colors.bg.primary }}
    >
      <main className='flex-1 px-4 py-8 max-w-4xl mx-auto w-full'>
        {/* Header */}
        <div className='flex items-start justify-between mb-8'>
          <div>
            <h1
              className='text-3xl font-bold flex items-center gap-3'
              style={{
                color: THEME.colors.text.primary,
                fontFamily: THEME.fonts.ui,
              }}
            >
              <FaTrophy size={28} />
              {t('challenges.pageTitle')}
            </h1>
            <p
              className='mt-1 text-sm'
              style={{ color: THEME.colors.text.secondary }}
            >
              {t('challenges.pageSubtitle')}
            </p>
          </div>
          <div
            className='flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium shrink-0'
            style={{ backgroundColor: THEME.colors.bg.tertiary }}
          >
            <span style={{ color: THEME.colors.text.accent }}>
              {completedCount}
            </span>
            <span style={{ color: THEME.colors.text.muted }}>
              /{totalCount} {t('challenges.completed')}
            </span>
          </div>
        </div>

        {/* Level sections */}
        {ALL_CHALLENGES.length === 0 ? (
          <p className='text-center' style={{ color: THEME.colors.text.muted }}>
            No challenges available
          </p>
        ) : (
          LEVELS.map((level) => (
            <LevelSection
              key={level}
              level={level}
              challenges={getChallengesByLevel(level)}
            />
          ))
        )}
      </main>
    </div>
  );
}
