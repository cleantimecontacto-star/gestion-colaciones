import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function EditableText({ value, onChange, className = "" }: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    const trimmed = inputValue.trim();
    if (trimmed && trimmed !== value) {
      onChange(trimmed);
    } else {
      setInputValue(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setInputValue(value);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        className={`h-7 px-1 py-0 text-sm min-w-[100px] w-full ${className}`}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <span
      className={`cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 px-1 rounded transition-colors break-words ${className}`}
      onClick={() => {
        setInputValue(value);
        setIsEditing(true);
      }}
    >
      {value}
    </span>
  );
}
