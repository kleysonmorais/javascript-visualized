import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Panel } from "@/components/ui/Panel";
import { THEME } from "@/constants/theme";
import { useVisualizerStore } from "@/store/useVisualizerStore";
import { useAnimationConfig } from "@/hooks/useAnimationConfig";
import { useIsMobile } from "@/hooks/useMediaQuery";

export function TaskQueue() {
  const { t } = useTranslation();
  const currentStep = useVisualizerStore((s) => s.currentStep);
  const tasks = currentStep?.taskQueue ?? [];
  const { getSpringTransition, shouldReduceMotion } = useAnimationConfig();
  const isMobile = useIsMobile();

  if (!isMobile && tasks.length === 0) {
    return null;
  }

  return (
    <Panel
      title={t("taskQueue.title")}
      scrollable={false}
      className="flex-1 lg:flex-none shrink-0"
    >
      {tasks.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <span
            className="text-center text-xs"
            style={{
              color: THEME.colors.text.muted,
              fontFamily: THEME.fonts.ui,
            }}
          >
            {t("taskQueue.empty")}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {/* Dequeue direction indicator */}
          <span
            style={{
              fontSize: 12,
              color: THEME.colors.text.muted,
              flexShrink: 0,
              userSelect: "none",
            }}
          >
            ▶
          </span>
          <AnimatePresence mode="popLayout">
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                initial={shouldReduceMotion ? false : { opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={shouldReduceMotion ? undefined : { opacity: 0, x: -30 }}
                transition={getSpringTransition()}
                style={{
                  backgroundColor: THEME.colors.bg.tertiary,
                  border: `1px solid ${THEME.colors.border.taskQueue}`,
                  borderRadius: THEME.radius.md,
                  padding: "6px 10px",
                  flexShrink: 0,
                  minWidth: 100,
                  maxWidth: 160,
                }}
              >
                <div
                  style={{
                    fontFamily: THEME.fonts.code,
                    fontSize: 12,
                    color: THEME.colors.text.primary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={task.callbackLabel}
                >
                  {task.callbackLabel.length > 40
                    ? task.callbackLabel.slice(0, 40) + "…"
                    : task.callbackLabel}
                </div>
                <div
                  style={{
                    fontFamily: THEME.fonts.ui,
                    fontSize: 10,
                    color: THEME.colors.text.muted,
                    marginTop: 2,
                  }}
                >
                  {task.sourceType}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </Panel>
  );
}
