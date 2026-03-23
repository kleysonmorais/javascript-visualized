import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MonacoEditor, { type OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { RiFireLine } from 'react-icons/ri';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Lightbulb,
  BookOpen,
  RotateCcw,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { ConceptBadge } from '@/components/ui/ConceptBadge';
import { THEME } from '@/constants/theme';
import { getChallengeById, ALL_CHALLENGES } from '@/challenges';
import { markAttempt, markCompleted } from '@/lib/progress';
import { generateSteps } from '@/engine';
import { useVisualizerStore } from '@/store/useVisualizerStore';
import type { ChallengeResult } from '@/challenges/types';
import { LEVEL_CONFIG } from '@/constants/level-config';

const THEME_NAME = 'js-visualizer-dark';

function defineEditorTheme(monaco: typeof Monaco) {
  monaco.editor.defineTheme(THEME_NAME, {
    base: 'vs-dark',
    inherit: false,
    rules: [
      {
        token: 'keyword',
        foreground: THEME.colors.syntax.keyword.replace('#', ''),
      },
      {
        token: 'string',
        foreground: THEME.colors.syntax.string.replace('#', ''),
      },
      {
        token: 'number',
        foreground: THEME.colors.syntax.number.replace('#', ''),
      },
      {
        token: 'identifier',
        foreground: THEME.colors.text.primary.replace('#', ''),
      },
      {
        token: 'comment',
        foreground: THEME.colors.syntax.comment.replace('#', ''),
      },
      {
        token: 'delimiter',
        foreground: THEME.colors.text.secondary.replace('#', ''),
      },
      {
        token: 'type',
        foreground: THEME.colors.syntax.function.replace('#', ''),
      },
      {
        token: 'variable',
        foreground: THEME.colors.syntax.variable.replace('#', ''),
      },
    ],
    colors: {
      'editor.background': THEME.colors.bg.secondary,
      'editor.foreground': THEME.colors.text.primary,
      'editor.lineHighlightBackground': '#00000000',
      'editor.selectionBackground': '#22d3ee22',
      'editor.inactiveSelectionBackground': '#22d3ee11',
      'editorCursor.foreground': THEME.colors.text.accent,
      'editorLineNumber.foreground': THEME.colors.text.muted,
      'editorLineNumber.activeForeground': THEME.colors.text.accent,
      'editorGutter.background': THEME.colors.bg.secondary,
      'editor.selectionHighlightBackground': '#22d3ee15',
      'scrollbarSlider.background': '#ffffff15',
      'scrollbarSlider.hoverBackground': '#ffffff25',
      'scrollbarSlider.activeBackground': '#ffffff35',
    },
  });
}

// ─── HintButton ───────────────────────────────────────────────────────────────

function HintButton({ hint }: { hint: string }) {
  const { t } = useTranslation();
  const [showHint, setShowHint] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showHint) return;
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowHint(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [showHint]);

  return (
    <div className='relative' ref={ref}>
      <button
        onClick={() => setShowHint((v) => !v)}
        className='inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm
          border border-white/10 transition-all cursor-pointer'
        style={{ color: THEME.colors.text.secondary }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            'rgba(255,255,255,0.2)';
          (e.currentTarget as HTMLButtonElement).style.color =
            THEME.colors.text.primary;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            'rgba(255,255,255,0.1)';
          (e.currentTarget as HTMLButtonElement).style.color =
            THEME.colors.text.secondary;
        }}
      >
        <Lightbulb size={16} />
        {t('challenges.hint')}
      </button>

      {showHint && (
        <div
          className='absolute bottom-full left-0 mb-2 w-72 p-3 rounded-lg text-sm border shadow-lg z-50'
          style={{
            background: THEME.colors.bg.elevated,
            borderColor: THEME.colors.border.editor,
            color: THEME.colors.text.secondary,
          }}
        >
          <div className='flex items-start gap-2'>
            <Lightbulb size={14} className='text-yellow-500 shrink-0 mt-0.5' />
            <p>{hint}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SolutionButton ───────────────────────────────────────────────────────────

function SolutionButton({ challengeId }: { challengeId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/challenges/solution/${challengeId}`)}
      className='inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm
        border border-white/10 transition-all cursor-pointer'
      style={{ color: THEME.colors.text.secondary }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          'rgba(255,255,255,0.2)';
        (e.currentTarget as HTMLButtonElement).style.color =
          THEME.colors.text.primary;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor =
          'rgba(255,255,255,0.1)';
        (e.currentTarget as HTMLButtonElement).style.color =
          THEME.colors.text.secondary;
      }}
    >
      <BookOpen size={16} />
      {t('challenges.solution')}
    </button>
  );
}

// ─── ChallengeDetailPage ──────────────────────────────────────────────────────

export default function ChallengeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isPtBr = i18n.language === 'pt-BR';

  const challenge = getChallengeById(id!);

  const challengeIndex = ALL_CHALLENGES.findIndex((c) => c.id === id);
  const totalChallenges = ALL_CHALLENGES.length;
  const nextChallenge =
    challengeIndex < totalChallenges - 1
      ? ALL_CHALLENGES[challengeIndex + 1]
      : null;

  const starterCode =
    isPtBr && challenge?.starterCodePtBr
      ? challenge.starterCodePtBr
      : (challenge?.starterCode ?? '');

  const [code, setCode] = useState(starterCode);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Used to force SolutionButton to re-read attempts after a submit
  const [submitCount, setSubmitCount] = useState(0);

  if (!challenge) {
    return (
      <div
        className='h-full overflow-y-auto flex flex-col'
        style={{ background: THEME.colors.bg.primary }}
      >
        <main className='flex-1 flex items-center justify-center'>
          <div className='text-center'>
            <p
              className='text-lg mb-4'
              style={{ color: THEME.colors.text.secondary }}
            >
              {t('challenges.notFound')}
            </p>
            <Link
              to='/challenges'
              className='text-sm no-underline'
              style={{ color: THEME.colors.text.accent }}
            >
              {t('challenges.backToChallenges')}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const levelConfig = LEVEL_CONFIG[challenge.level];

  async function handleSubmit() {
    setIsSubmitting(true);
    setResult(null);

    try {
      const engineResult = generateSteps(code);

      if (!engineResult.success) {
        const errMsg = engineResult.error.message;
        markAttempt(challenge!.id);
        setSubmitCount((c) => c + 1);
        setTimeout(() => {
          setResult({
            passed: false,
            feedback: `Code error: ${errMsg}`,
            details: 'Check your syntax and try again.',
          });
          setIsSubmitting(false);
        }, 300);
        return;
      }

      const validationResult = challenge!.validate(engineResult.steps);

      markAttempt(challenge!.id);
      setSubmitCount((c) => c + 1);
      if (validationResult.passed) {
        markCompleted(challenge!.id);
      }

      setTimeout(() => {
        setResult(validationResult);
        setIsSubmitting(false);
      }, 300);
    } catch (error) {
      markAttempt(challenge!.id);
      setSubmitCount((c) => c + 1);
      setResult({
        passed: false,
        feedback: `Code error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: 'Check your syntax and try again.',
      });
      setIsSubmitting(false);
    }
  }

  function handleVisualize() {
    useVisualizerStore.getState().setSourceCode(code);
    useVisualizerStore.getState().reset();
    navigate('/');
  }

  const handleMount: OnMount = (_editor, monaco) => {
    defineEditorTheme(monaco);
    monaco.editor.setTheme(THEME_NAME);
  };

  return (
    <div
      className='h-full overflow-y-auto flex flex-col'
      style={{ background: THEME.colors.bg.primary }}
    >
      <main
        className='flex-1 px-4 py-8 w-full mx-auto'
        style={{ maxWidth: '768px' }}
      >
        {/* Back link */}
        <Link
          to='/challenges'
          className='inline-flex items-center gap-1.5 text-sm no-underline transition-colors mb-6'
          style={{ color: THEME.colors.text.secondary }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = THEME.colors.text.accent)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = THEME.colors.text.secondary)
          }
        >
          <ArrowLeft size={16} />
          {t('challenges.backLink')}
        </Link>

        {/* Level badge + position */}
        <div className='flex items-center gap-2 mb-3'>
          <span
            className='inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full'
            style={{
              backgroundColor: `${levelConfig.color}20`,
              color: levelConfig.color,
            }}
          >
            <RiFireLine />
            {levelConfig.label}
          </span>
          <span className='text-xs' style={{ color: THEME.colors.text.muted }}>
            {t('challenges.challenge')} {challengeIndex + 1}{' '}
            {t('challenges.of')} {totalChallenges}
          </span>
        </div>

        {/* Title */}
        <h1
          className='text-2xl font-bold mb-4'
          style={{
            color: THEME.colors.text.primary,
            fontFamily: THEME.fonts.ui,
          }}
        >
          {isPtBr && challenge.titlePtBr
            ? challenge.titlePtBr
            : challenge.title}
        </h1>

        {/* Description */}
        <p
          className='leading-relaxed mb-4'
          style={{ color: THEME.colors.text.secondary }}
        >
          {isPtBr && challenge.descriptionPtBr
            ? challenge.descriptionPtBr
            : challenge.description}
        </p>

        {/* Concept badges */}
        <div className='flex flex-wrap gap-1.5 mb-6'>
          {challenge.concepts.map((concept) => (
            <ConceptBadge key={concept} concept={concept} />
          ))}
        </div>

        {/* Code editor */}
        <div
          className='rounded-lg border overflow-hidden mb-6'
          style={{ borderColor: THEME.colors.border.editor }}
        >
          <div
            className='px-3 py-2 text-xs font-medium border-b'
            style={{
              borderColor: THEME.colors.border.editor,
              background: THEME.colors.bg.secondary,
              color: THEME.colors.text.muted,
              fontFamily: THEME.fonts.ui,
            }}
          >
            CODE
          </div>
          <MonacoEditor
            height='300px'
            language='javascript'
            theme={THEME_NAME}
            value={code}
            onChange={(value) => setCode(value ?? '')}
            onMount={handleMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: THEME.fonts.code,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
              wordWrap: 'on',
              tabSize: 2,
              renderLineHighlight: 'none',
              readOnly: false,
              folding: false,
              overviewRulerBorder: false,
            }}
          />
        </div>

        {/* Action buttons */}
        <div className='flex items-center gap-3 mb-6'>
          <HintButton
            hint={
              isPtBr && challenge.hintPtBr ? challenge.hintPtBr : challenge.hint
            }
          />
          <SolutionButton key={submitCount} challengeId={challenge.id} />

          <div className='flex-1' />

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className='inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium
              transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
            style={{
              background: 'rgba(6, 182, 212, 0.1)',
              color: '#22d3ee',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'rgba(6, 182, 212, 0.2)';
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  'rgba(6, 182, 212, 0.5)';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                'rgba(6, 182, 212, 0.1)';
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                'rgba(6, 182, 212, 0.3)';
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className='animate-spin' />
                {t('challenges.checking')}
              </>
            ) : (
              <>
                <Play size={16} />
                {t('challenges.submit')}
              </>
            )}
          </button>
        </div>

        {/* Result area */}
        {result && (
          <motion.div
            initial={
              result.passed
                ? { opacity: 0, y: 10, scale: 0.98 }
                : { opacity: 0, x: 0 }
            }
            animate={
              result.passed
                ? { opacity: 1, y: 0, scale: 1 }
                : { opacity: 1, x: [0, -8, 8, -4, 4, 0] }
            }
            transition={
              result.passed
                ? { type: 'spring', stiffness: 300, damping: 25 }
                : { duration: 0.4 }
            }
            className='rounded-lg border p-5'
            style={{
              borderColor: result.passed
                ? 'rgba(34,197,94,0.3)'
                : 'rgba(239,68,68,0.3)',
              background: result.passed
                ? 'rgba(34,197,94,0.05)'
                : 'rgba(239,68,68,0.05)',
            }}
          >
            {/* Header */}
            <div
              className='flex items-center gap-2 text-lg font-semibold mb-3'
              style={{ color: result.passed ? '#4ade80' : '#f87171' }}
            >
              {result.passed ? (
                <CheckCircle size={22} />
              ) : (
                <XCircle size={22} />
              )}
              {result.passed
                ? t('challenges.passed')
                : t('challenges.notQuite')}
            </div>

            {/* Feedback */}
            <p className='mb-2' style={{ color: THEME.colors.text.secondary }}>
              {result.feedback}
            </p>

            {/* Details on failure */}
            {!result.passed && result.details && (
              <p
                className='text-sm mb-4'
                style={{ color: THEME.colors.text.muted }}
              >
                {result.details}
              </p>
            )}

            {/* Action buttons */}
            <div className='flex items-center gap-3 mt-4'>
              {result.passed ? (
                <>
                  <button
                    onClick={handleVisualize}
                    className='inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm
                      transition-all cursor-pointer'
                    style={{
                      background: 'rgba(6, 182, 212, 0.1)',
                      color: '#22d3ee',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        'rgba(6, 182, 212, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background =
                        'rgba(6, 182, 212, 0.1)';
                    }}
                  >
                    <Play size={14} />
                    {t('challenges.visualizeSolution')}
                  </button>

                  {nextChallenge && (
                    <Link
                      to={`/challenges/${nextChallenge.id}`}
                      className='inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm
                        border border-white/10 no-underline transition-all'
                      style={{ color: THEME.colors.text.secondary }}
                      onMouseEnter={(e) => {
                        (
                          e.currentTarget as HTMLAnchorElement
                        ).style.borderColor = 'rgba(255,255,255,0.2)';
                        (e.currentTarget as HTMLAnchorElement).style.color =
                          THEME.colors.text.primary;
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLAnchorElement
                        ).style.borderColor = 'rgba(255,255,255,0.1)';
                        (e.currentTarget as HTMLAnchorElement).style.color =
                          THEME.colors.text.secondary;
                      }}
                    >
                      {t('challenges.nextChallenge')}
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setResult(null)}
                  className='inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm
                    border border-white/10 transition-all cursor-pointer'
                  style={{ color: THEME.colors.text.secondary }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      'rgba(255,255,255,0.2)';
                    (e.currentTarget as HTMLButtonElement).style.color =
                      THEME.colors.text.primary;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      'rgba(255,255,255,0.1)';
                    (e.currentTarget as HTMLButtonElement).style.color =
                      THEME.colors.text.secondary;
                  }}
                >
                  <RotateCcw size={14} />
                  {t('challenges.tryAgain')}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
