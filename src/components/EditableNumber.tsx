import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { formatCLP, parseCLP } from "@/lib/format";
import { Pencil } from "lucide-react";

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

  const startEdit = () => {
    setInputValue(value.toString());
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const parsed = parseCLP(inputValue);
    if (!isNaN(parsed) && parsed !== value) {
      onChange(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
      <span>{isCurrency ? formatCLP(value) : value}</span>
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
