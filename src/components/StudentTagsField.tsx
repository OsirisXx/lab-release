import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StudentTagInput } from "@/hooks/useTransactions";

interface StudentTagsFieldProps {
  tags: StudentTagInput[];
  onChange: (tags: StudentTagInput[]) => void;
  description?: string;
  minTags?: number;
}

export function StudentTagsField({ tags, onChange, description, minTags = 1 }: StudentTagsFieldProps) {
  const updateTag = (index: number, field: keyof StudentTagInput, value: string) => {
    onChange(tags.map((tag, tagIndex) => tagIndex === index ? { ...tag, [field]: value } : tag));
  };

  const addTag = () => {
    if (tags.length < 3) onChange([...tags, { name: "", student_number: "" }]);
  };

  const removeTag = (index: number) => {
    if (tags.length > minTags) onChange(tags.filter((_, tagIndex) => tagIndex !== index));
  };

  return (
    <div className="space-y-2">
      <div>
        <Label>Accompanying Students</Label>
        <p className="text-xs text-muted-foreground mt-1">
          {description || "Tag 1 to 3 students accompanying the Clinical Instructor."}
        </p>
      </div>
      {tags.map((tag, index) => (
        <div key={index} className="grid grid-cols-[1fr_0.75fr_auto] gap-2 items-end">
          <div>
            <Label htmlFor={`student-name-${index}`} className="text-xs">Student {index + 1} name</Label>
            <Input
              id={`student-name-${index}`}
              value={tag.name}
              onChange={(event) => updateTag(index, "name", event.target.value)}
              placeholder="Full name"
              maxLength={120}
            />
          </div>
          <div>
            <Label htmlFor={`student-number-${index}`} className="text-xs">Student number</Label>
            <Input
              id={`student-number-${index}`}
              value={tag.student_number || ""}
              onChange={(event) => updateTag(index, "student_number", event.target.value)}
              placeholder="Optional"
              maxLength={40}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 text-destructive"
            onClick={() => removeTag(index)}
            disabled={tags.length <= minTags}
            aria-label={`Remove student ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {tags.length < 3 && (
        <Button type="button" variant="outline" size="sm" onClick={addTag}>
          <Plus className="h-4 w-4 mr-1" /> Add student ({tags.length}/3)
        </Button>
      )}
    </div>
  );
}
