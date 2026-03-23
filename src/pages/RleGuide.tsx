import { useState } from "react";
import { BookOpen, Search, FileText, Plus, Edit2, Trash2, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRleGuides } from "@/hooks/useRleGuides";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function RleGuide() {
  const { guides, loading, createGuide, updateGuide, deleteGuide } = useRleGuides();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGuide, setEditingGuide] = useState<any>(null);
  const [formData, setFormData] = useState({
    year_level: "1st Year" as any,
    title: "",
    description: "",
    topics: "",
  });

  const filtered = guides.filter((guide) => {
    const matchesSearch =
      guide.title.toLowerCase().includes(search.toLowerCase()) ||
      guide.description.toLowerCase().includes(search.toLowerCase()) ||
      guide.topics.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesYear = selectedYear === "all" || guide.year_level === selectedYear;
    return matchesSearch && matchesYear;
  });

  const handleOpenDialog = (guide?: any) => {
    if (guide) {
      setEditingGuide(guide);
      setFormData({
        year_level: guide.year_level,
        title: guide.title,
        description: guide.description,
        topics: guide.topics.join(", "),
      });
    } else {
      setEditingGuide(null);
      setFormData({
        year_level: "1st Year",
        title: "",
        description: "",
        topics: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingGuide(null);
  };

  const handleSubmit = async () => {
    try {
      const topicsArray = formData.topics.split(",").map((t) => t.trim()).filter(Boolean);
      
      if (editingGuide) {
        await updateGuide(editingGuide.id, {
          year_level: formData.year_level,
          title: formData.title,
          description: formData.description,
          topics: topicsArray,
        });
        toast.success("Guide updated successfully");
      } else {
        await createGuide({
          year_level: formData.year_level,
          title: formData.title,
          description: formData.description,
          topics: topicsArray,
        });
        toast.success("Guide created successfully");
      }
      handleCloseDialog();
    } catch (error: any) {
      toast.error(error.message || "Failed to save guide");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this guide?")) return;
    
    try {
      await deleteGuide(id);
      toast.success("Guide deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete guide");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">RLE Guide</h1>
          <p className="text-muted-foreground mt-1">Related Learning Experience guides for all year levels</p>
        </div>
        {user?.role === "sa" && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Guide
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search guides or topics..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {["all", "1st Year", "2nd Year", "3rd Year", "4th Year"].map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                selectedYear === year ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {year === "all" ? "All" : year}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((guide, idx) => (
          <div
            key={guide.id}
            className="bg-card rounded-lg border overflow-hidden hover:shadow-md transition-shadow animate-slide-up"
            style={{ animationDelay: `${120 + idx * 60}ms`, animationFillMode: "both" }}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-primary mb-1">{guide.year_level}</p>
                    <h3 className="font-semibold text-lg">{guide.title}</h3>
                  </div>
                </div>
                {user?.role === "sa" && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleOpenDialog(guide)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(guide.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-4">{guide.description}</p>

              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Key Topics</p>
                <div className="flex flex-wrap gap-2">
                  {guide.topics.map((topic) => (
                    <span key={topic} className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Last updated: {new Date(guide.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-card rounded-lg border">
          <BookOpen className="h-12 w-12 mb-3 opacity-40" />
          <p className="font-medium">No guides found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGuide ? "Edit Guide" : "Add New Guide"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="year_level">Year Level</Label>
              <select
                id="year_level"
                value={formData.year_level}
                onChange={(e) => setFormData({ ...formData, year_level: e.target.value as any })}
                className="w-full mt-1.5 px-3 py-2 rounded-md border bg-background"
              >
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Fundamentals of Nursing"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the guide"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="topics">Topics (comma-separated)</Label>
              <Input
                id="topics"
                value={formData.topics}
                onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
                placeholder="e.g., Vital Signs, Patient Assessment, Basic Life Support"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingGuide ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
