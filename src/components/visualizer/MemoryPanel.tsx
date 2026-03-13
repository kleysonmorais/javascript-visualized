import { motion, AnimatePresence } from "framer-motion";
import { Panel } from "@/components/ui/Panel";
import { THEME } from "@/constants/theme";
import { useVisualizerStore } from "@/store/useVisualizerStore";
import { useAnimationConfig } from "@/hooks/useAnimationConfig";
import { MemoryBlockCard } from "./MemoryBlockCard";
import { HeapSection } from "./HeapSection";

export function MemoryPanel() {
  const currentStep = useVisualizerStore((s) => s.currentStep);
  const memoryBlocks = currentStep?.memoryBlocks ?? [];
  const heap = currentStep?.heap ?? [];
  const { duration, shouldReduceMotion } = useAnimationConfig();

  // Render in reverse so most recent context (top of stack) appears first
  const reversed = [...memoryBlocks].reverse();

  const isEmpty = reversed.length === 0 && heap.length === 0;

  return (
    <Panel title="Memory" className="flex-1 min-h-0">
      {isEmpty ? (
        <div className="flex items-center justify-center h-full">
          <span
            className="text-center text-xs"
            style={{
              color: THEME.colors.text.muted,
              fontFamily: THEME.fonts.ui,
            }}
          >
            Run code to see Memory allocation
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {reversed.map((block) => (
              <motion.div
                key={block.frameId}
                initial={
                  shouldReduceMotion
                    ? false
                    : { opacity: 0, y: -20, scale: 0.95 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  shouldReduceMotion
                    ? undefined
                    : { opacity: 0, y: -20, scale: 0.95 }
                }
                transition={{ duration: duration.medium, ease: "easeOut" }}
              >
                <MemoryBlockCard block={block} />
              </motion.div>
            ))}
          </AnimatePresence>
          <HeapSection heap={heap} />
        </div>
      )}
    </Panel>
  );
}
