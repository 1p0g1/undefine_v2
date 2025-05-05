import React from "react";

interface MultipleChoiceOptionProps {
  option: string;
  onSelect: (option: string) => void;
  isSelected: boolean;
}

export function MultipleChoiceOption({ option, onSelect, isSelected }: MultipleChoiceOptionProps) {
  return (
    <button
      className={`rounded-lg border border-navy bg-white py-2 px-4 text-lg font-semibold shadow-sm transition-colors w-full text-left flex items-center gap-2 ${
        isSelected ? "bg-navy text-white" : "hover:bg-navy hover:text-white"
      }`}
      style={{ outline: isSelected ? "2px solid #4ade80" : undefined }}
      onClick={() => onSelect(option)}
      aria-pressed={isSelected}
      type="button"
    >
      <span className="flex-1">{option}</span>
      {isSelected && <span className="ml-2 text-green-500 font-bold">✓</span>}
    </button>
  );
} 