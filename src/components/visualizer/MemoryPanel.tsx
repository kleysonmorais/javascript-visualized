import { Panel } from "@/components/ui/Panel";
import { THEME } from "@/constants/theme";
import { useVisualizerStore } from "@/store/useVisualizerStore";
import { MemoryBlockCard } from "./MemoryBlockCard";
import { HeapSection } from "./HeapSection";

export function MemoryPanel() {
  const currentStep = useVisualizerStore((s) => s.currentStep);
  const memoryBlocks = currentStep?.memoryBlocks ?? [];
  const heap = currentStep?.heap ?? [];

  // Render in reverse so most recent context (top of stack) appears first
  const reversed = [...memoryBlocks].reverse();

  const isEmpty = reversed.length === 0 && heap.length === 0;

  return (
    <Panel
      title="Memory"
      borderColor={THEME.colors.border.memory}
      className="flex-1 min-h-0"
    >
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
          {reversed.map((block) => (
            <MemoryBlockCard key={block.frameId} block={block} />
          ))}
          <HeapSection heap={heap} />
        </div>
      )}
    </Panel>
  );
}
