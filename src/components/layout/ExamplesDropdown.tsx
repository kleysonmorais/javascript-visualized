import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { THEME } from "@/constants/theme";
import { CODE_EXAMPLES } from "@/constants/examples";
import { useVisualizerStore } from "@/store/useVisualizerStore";
import type { CodeExample } from "@/types";

const CATEGORY_LABELS: Record<CodeExample["category"], string> = {
  sync: "Basics",
  async: "Async",
  promise: "Promise",
  advanced: "Advanced",
};

export function ExamplesDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const setSourceCode = useVisualizerStore((s) => s.setSourceCode);
  const reset = useVisualizerStore((s) => s.reset);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelectExample = (example: CodeExample) => {
    setSourceCode(example.code);
    reset();
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all"
        style={{
          border: `1px solid ${isOpen ? THEME.colors.text.accent : THEME.colors.border.editor}`,
          backgroundColor: "transparent",
          color: isOpen
            ? THEME.colors.text.primary
            : THEME.colors.text.secondary,
          fontFamily: THEME.fonts.ui,
          fontSize: 13,
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = THEME.colors.text.accent;
            e.currentTarget.style.color = THEME.colors.text.primary;
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = THEME.colors.border.editor;
            e.currentTarget.style.color = THEME.colors.text.secondary;
          }
        }}
      >
        <span>Examples</span>
        <ChevronDown
          size={14}
          className="transition-transform duration-200"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 z-50 w-80 overflow-y-auto"
          style={{
            backgroundColor: THEME.colors.bg.elevated,
            border: `1px solid ${THEME.colors.border.editor}`,
            borderRadius: THEME.radius.lg,
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
            maxHeight: "400px",
          }}
        >
          {CODE_EXAMPLES.map((example, index) => (
            <div key={example.id}>
              {index > 0 && (
                <div
                  className="h-px"
                  style={{ backgroundColor: `${THEME.colors.border.editor}50` }}
                />
              )}
              <button
                onClick={() => handleSelectExample(example)}
                className="w-full text-left px-4 py-3 transition-colors cursor-pointer"
                style={{
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    THEME.colors.bg.tertiary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className="font-medium"
                    style={{
                      color: THEME.colors.text.primary,
                      fontFamily: THEME.fonts.ui,
                      fontSize: 14,
                    }}
                  >
                    {example.title}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs shrink-0"
                    style={{
                      backgroundColor: `${THEME.colors.text.muted}20`,
                      color: THEME.colors.text.muted,
                      fontFamily: THEME.fonts.ui,
                    }}
                  >
                    {CATEGORY_LABELS[example.category]}
                  </span>
                </div>
                <p
                  className="line-clamp-2"
                  style={{
                    color: THEME.colors.text.muted,
                    fontFamily: THEME.fonts.ui,
                    fontSize: 12,
                    lineHeight: 1.4,
                  }}
                >
                  {example.description}
                </p>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
