import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";

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

  const startEdit = () => {
    setInputValue(value);
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const trimmed = inputValue.trim();
    if (trimmed && trimmed !== value) {
      onChange(trimmed);
    } else {
      setInputValue(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`h-7 text-xs ${className}`}
      />
    );
  }

  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      <span>{value}</span>
      <button
        type="button"
        onClick={startEdit}
        className="text-muted-foreground hover:text-primary transition-colors ml-0.5"
        aria-label="Editar"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </span>
  );
}
