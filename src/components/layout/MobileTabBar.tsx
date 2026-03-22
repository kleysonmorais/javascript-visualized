import { useTranslation } from 'react-i18next';
import { THEME } from '@/constants/theme';
import { useVisualizerStore } from '@/store/useVisualizerStore';

export type MobileTab =
  | 'code'
  | 'callStack'
  | 'memory'
  | 'webAPIs'
  | 'microtaskQueue'
  | 'taskQueue';

interface TabConfig {
  id: MobileTab;
  labelKey: string;
  getBadge: (
    step: ReturnType<typeof useVisualizerStore.getState>['currentStep']
  ) => number;
}

const TABS: TabConfig[] = [
  {
    id: 'code',
    labelKey: 'appShell.code',
    getBadge: () => 0,
  },
  {
    id: 'callStack',
    labelKey: 'callStack.title',
    getBadge: (step) => step?.callStack?.length ?? 0,
  },
  {
    id: 'memory',
    labelKey: 'memory.title',
    getBadge: (step) => step?.memoryBlocks?.length ?? 0,
  },
  {
    id: 'webAPIs',
    labelKey: 'webAPIs.title',
    getBadge: (step) =>
      step?.webAPIs?.filter((e) => e.status === 'running').length ?? 0,
  },
  {
    id: 'microtaskQueue',
    labelKey: 'microtaskQueue.title',
    getBadge: (step) => step?.microtaskQueue?.length ?? 0,
  },
  {
    id: 'taskQueue',
    labelKey: 'taskQueue.title',
    getBadge: (step) => step?.taskQueue?.length ?? 0,
  },
];

interface MobileTabBarProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

export function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  const { t } = useTranslation();
  const currentStep = useVisualizerStore((s) => s.currentStep);

  return (
    <div
      className='flex overflow-x-auto scrollbar-hide lg:hidden shrink-0'
      style={{
        backgroundColor: THEME.colors.bg.elevated,
        borderBottom: `1px solid ${THEME.colors.border.console}`,
      }}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        const badge = tab.getBadge(currentStep);

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className='flex items-center gap-1.5 px-3 py-2.5 whitespace-nowrap shrink-0 transition-colors relative'
            style={{
              fontFamily: THEME.fonts.ui,
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              color: isActive
                ? THEME.colors.text.accent
                : THEME.colors.text.secondary,
              borderBottom: isActive
                ? `2px solid ${THEME.colors.text.accent}`
                : '2px solid transparent',
              backgroundColor: 'transparent',
              cursor: 'pointer',
            }}
          >
            <span>{t(tab.labelKey)}</span>
            {badge > 0 && (
              <span
                className='flex items-center justify-center rounded-full min-w-4 h-4 px-1'
                style={{
                  backgroundColor: THEME.colors.text.accent,
                  color: THEME.colors.bg.primary,
                  fontSize: 9,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
