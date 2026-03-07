import { Panel } from '@/components/ui/Panel';
import { THEME } from '@/constants/theme';
import { useVisualizerStore } from '@/store/useVisualizerStore';
import { MemoryBlockCard } from './MemoryBlockCard';
import { HeapSection } from './HeapSection';

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
      borderColor={THEME.colors.border.webAPIs}
      className="flex-1"
    >
      {isEmpty ? (
        <div className="flex items-center justify-center h-full">
          <span style={{ color: THEME.colors.text.muted, fontSize: 13 }}>Empty</span>
        </div>
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: '100%' }}>
          {reversed.map((block) => (
            <MemoryBlockCard key={block.frameId} block={block} />
          ))}
          <HeapSection heap={heap} />
        </div>
      )}
    </Panel>
  );
}
