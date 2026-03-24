import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SkipBack,
  ChevronLeft,
  Play,
  Pause,
  ChevronRight,
  SkipForward,
  RefreshCw,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { useVisualizerStore } from '@/store/useVisualizerStore';
import { useAnimationConfig } from '@/hooks/useAnimationConfig';
import { useIsSmallMobile } from '@/hooks/useMediaQuery';
import { THEME } from '@/constants/theme';
import type { PlaybackSpeed } from '@/types';

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 1.5, 2, 3];

function renderBoldText(text: string) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong
        key={i}
        style={{ color: THEME.colors.syntax.string, fontWeight: 600 }}
      >
        {part}
      </strong>
    ) : (
      part
    )
  );
}

function StepDescription() {
  const currentStep = useVisualizerStore((s) => s.currentStep);

  if (!currentStep) return null;

  const phase = currentStep.eventLoop.phase;
  const isTimer =
    phase === 'checking-tasks' ||
    phase === 'picking-task' ||
    phase === 'draining-microtasks';

  const description = currentStep.description;

  return (
    <div
      className={`px-3 sm:px-4 py-2 flex items-start gap-2 text-xs sm:text-sm`}
      style={{
        backgroundColor: THEME.colors.bg.tertiary,
        borderRadius: THEME.radius.md,
        border: `1px solid ${THEME.colors.border.editor}`,
        color: THEME.colors.text.primary,
        fontFamily: THEME.fonts.ui,
      }}
    >
      <span className='shrink-0 mt-0.5'>
        {isTimer ? (
          <Clock size={14} color={THEME.colors.text.accent} />
        ) : (
          <RefreshCw size={14} color={THEME.colors.text.accent} />
        )}
      </span>
      <span className='min-w-0 wrap-break-word'>
        {renderBoldText(description)}
      </span>
    </div>
  );
}

export function TransportControls() {
  const { t } = useTranslation();
  const {
    currentStepIndex,
    totalSteps,
    isPlaying,
    speed,
    goToStart,
    goBack,
    togglePlayback,
    goNext,
    goToEnd,
    setSpeed,
  } = useVisualizerStore();
  const { duration, shouldReduceMotion } = useAnimationConfig();
  const isSmallMobile = useIsSmallMobile();
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const atStart = currentStepIndex === 0;
  const atEnd = currentStepIndex === totalSteps - 1;
  const noSteps = totalSteps === 0;
  const progress = totalSteps > 1 ? currentStepIndex / (totalSteps - 1) : 0;

  const btnBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.bg.tertiary,
    border: `1px solid ${THEME.colors.border.editor}`,
    borderRadius: THEME.radius.sm,
    cursor: 'pointer',
    transition: 'border-color 0.15s, background-color 0.15s',
    color: THEME.colors.text.secondary,
  };

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    if (totalSteps < 2) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const targetIndex = Math.round(ratio * (totalSteps - 1));
    useVisualizerStore.getState().goToStep(targetIndex);
  }

  return (
    <div
      className='flex flex-col gap-2 shrink-0'
      style={{
        backgroundColor: THEME.colors.bg.secondary,
        borderTop: `1px solid ${THEME.colors.border.editor}`,
        padding: '10px 12px',
      }}
    >
      <StepDescription />

      {/* Progress bar - full width on mobile, at bottom on desktop */}
      <div className='sm:hidden'>
        <div
          onClick={handleProgressClick}
          className='touch-none'
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: THEME.colors.bg.elevated,
            cursor: totalSteps > 1 ? 'pointer' : 'default',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${progress * 100}%`,
              background: `linear-gradient(to right, ${THEME.colors.border.callStack}, ${THEME.colors.border.microtaskQueue})`,
              transition: 'width 0.2s ease',
            }}
          />
        </div>
      </div>

      <div className='flex items-center justify-between gap-2 sm:gap-4 flex-wrap'>
        {/* Transport buttons */}
        <div className='flex items-center gap-1 sm:gap-2'>
          {/* Go to start */}
          <button
            onClick={goToStart}
            disabled={atStart}
            title={t('transport.goToStart')}
            className='min-w-10 min-h-10 sm:min-w-0 sm:min-h-0'
            style={{
              ...btnBase,
              padding: '8px 10px',
              opacity: atStart ? 0.3 : 1,
              cursor: atStart ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!atStart) {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  THEME.colors.text.accent;
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                THEME.colors.border.editor;
            }}
          >
            <SkipBack size={16} />
          </button>

          {/* Step back */}
          <button
            onClick={goBack}
            disabled={atStart}
            title={t('transport.stepBack')}
            className='min-w-10 min-h-10 sm:min-w-0 sm:min-h-0'
            style={{
              ...btnBase,
              padding: '8px 10px',
              opacity: atStart ? 0.3 : 1,
              cursor: atStart ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!atStart) {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  THEME.colors.text.accent;
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                THEME.colors.border.editor;
            }}
          >
            <ChevronLeft size={16} />
          </button>

          {/* Play/Pause — emphasized */}
          <motion.button
            onClick={togglePlayback}
            disabled={noSteps}
            title={isPlaying ? t('transport.pause') : t('transport.play')}
            whileTap={
              shouldReduceMotion || noSteps ? undefined : { scale: 0.92 }
            }
            transition={{ duration: duration.fast }}
            className='min-w-11 min-h-11 sm:min-w-0 sm:min-h-0'
            style={{
              ...btnBase,
              padding: '10px 14px',
              borderColor: THEME.colors.text.accent,
              boxShadow: isPlaying
                ? `0 0 10px ${THEME.colors.text.accent}55`
                : 'none',
              opacity: noSteps ? 0.3 : 1,
              cursor: noSteps ? 'not-allowed' : 'pointer',
              color: THEME.colors.text.accent,
            }}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </motion.button>

          {/* Step forward */}
          <button
            onClick={goNext}
            disabled={atEnd}
            title={t('transport.stepForward')}
            className='min-w-10 min-h-10 sm:min-w-0 sm:min-h-0'
            style={{
              ...btnBase,
              padding: '8px 10px',
              opacity: atEnd ? 0.3 : 1,
              cursor: atEnd ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!atEnd) {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  THEME.colors.text.accent;
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                THEME.colors.border.editor;
            }}
          >
            <ChevronRight size={16} />
          </button>

          {/* Go to end */}
          <button
            onClick={goToEnd}
            disabled={atEnd}
            title={t('transport.goToEnd')}
            className='min-w-10 min-h-10 sm:min-w-0 sm:min-h-0'
            style={{
              ...btnBase,
              padding: '8px 10px',
              opacity: atEnd ? 0.3 : 1,
              cursor: atEnd ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (!atEnd) {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  THEME.colors.text.accent;
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                THEME.colors.border.editor;
            }}
          >
            <SkipForward size={16} />
          </button>
        </div>

        {/* Speed selector - compact on mobile */}
        <div className='relative flex items-center gap-1'>
          {isSmallMobile ? (
            // Compact speed dropdown for mobile
            <div className='relative'>
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className='flex items-center gap-1 min-w-11 min-h-10'
                style={{
                  padding: '6px 10px',
                  borderRadius: THEME.radius.sm,
                  fontSize: 12,
                  fontFamily: THEME.fonts.code,
                  border: `1px solid ${THEME.colors.text.accent}`,
                  backgroundColor: THEME.colors.bg.tertiary,
                  color: THEME.colors.text.accent,
                  cursor: 'pointer',
                }}
              >
                {speed}x
                <ChevronDown size={12} />
              </button>
              <AnimatePresence>
                {showSpeedMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className='absolute bottom-full left-0 mb-1 flex flex-col gap-1 p-1 rounded-md z-50'
                    style={{
                      backgroundColor: THEME.colors.bg.secondary,
                      border: `1px solid ${THEME.colors.border.editor}`,
                    }}
                  >
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setSpeed(s);
                          setShowSpeedMenu(false);
                        }}
                        className='min-h-9'
                        style={{
                          padding: '6px 12px',
                          borderRadius: THEME.radius.sm,
                          fontSize: 12,
                          fontFamily: THEME.fonts.code,
                          border: `1px solid ${s === speed ? THEME.colors.text.accent : 'transparent'}`,
                          backgroundColor:
                            s === speed
                              ? THEME.colors.text.accent
                              : 'transparent',
                          color:
                            s === speed
                              ? THEME.colors.bg.primary
                              : THEME.colors.text.secondary,
                          cursor: 'pointer',
                        }}
                      >
                        {s}x
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            // Full speed selector for desktop
            <>
              <span
                style={{
                  color: THEME.colors.text.muted,
                  fontSize: 12,
                  marginRight: 4,
                  fontFamily: THEME.fonts.ui,
                }}
              >
                {t('transport.speed')}
              </span>
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: THEME.radius.sm,
                    fontSize: 12,
                    fontFamily: THEME.fonts.code,
                    border: `1px solid ${s === speed ? THEME.colors.text.accent : THEME.colors.border.editor}`,
                    backgroundColor:
                      s === speed
                        ? THEME.colors.text.accent
                        : THEME.colors.bg.tertiary,
                    color:
                      s === speed
                        ? THEME.colors.bg.primary
                        : THEME.colors.text.secondary,
                    cursor: 'pointer',
                  }}
                >
                  {s}x
                </button>
              ))}
            </>
          )}
        </div>

        {/* Step indicator - compact on mobile */}
        <span
          style={{
            fontFamily: THEME.fonts.code,
            fontSize: 13,
            color: THEME.colors.text.secondary,
            whiteSpace: 'nowrap',
          }}
        >
          {!isSmallMobile && t('transport.step')}
          <AnimatePresence mode='wait'>
            <motion.span
              key={totalSteps === 0 ? 'empty' : currentStepIndex}
              initial={shouldReduceMotion ? false : { opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: 5 }}
              transition={{ duration: duration.fast }}
            >
              {totalSteps === 0 ? '—' : `${currentStepIndex + 1}/${totalSteps}`}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>

      {/* Progress bar - desktop only */}
      <div className='hidden sm:block'>
        <div
          onClick={handleProgressClick}
          style={{
            height: 4,
            borderRadius: 2,
            backgroundColor: THEME.colors.bg.elevated,
            cursor: totalSteps > 1 ? 'pointer' : 'default',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${progress * 100}%`,
              background: `linear-gradient(to right, ${THEME.colors.border.callStack}, ${THEME.colors.border.microtaskQueue})`,
              transition: 'width 0.2s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}
