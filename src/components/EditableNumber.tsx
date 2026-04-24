import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { formatCLP, parseCLP } from "@/lib/format";

interface EditableNumberProps {
  value: number;
  onChange: (value: number) => void;
  isCurrency?: boolean;
  className?: string;
}

export function EditableNumber({ value, onChange, isCurrency = false, className = "" }: EditableNumberProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseCLP(inputValue);
    if (!isNaN(parsed) && parsed !== value) {
      onChange(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        className={`h-7 px-1 py-0 text-sm font-medium min-w-[60px] text-right w-full ${className}`}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <span
      className={`cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 px-1 rounded transition-colors ${className}`}
      onClick={() => {
        setInputValue(isCurrency ? value.toString() : value.toString()); // If they want pure number editing
        setIsEditing(true);
      }}
    >
      {isCurrency ? formatCLP(value) : value}
    </span>
  );
}
