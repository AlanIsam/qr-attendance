"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ClassItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  schedule: string | null;
  enrollmentCount: number;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSchedule, setFormSchedule] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function fetchClasses() {
    try {
      const res = await fetch("/api/classes");
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
      } else {
        toast.error("Failed to load classes");
      }
    } catch {
      toast.error("Failed to load classes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClasses();
  }, []);

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormSchedule("");
  }

  async function handleCreate() {
    if (!formName.trim()) {
      toast.error("Class name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || undefined,
          schedule: formSchedule.trim() || undefined,
        }),
      });

      if (res.ok) {
        toast.success("Class created successfully");
        setCreateOpen(false);
        resetForm();
        fetchClasses();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create class");
      }
    } catch {
      toast.error("Failed to create class");
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(cls: ClassItem) {
    setSelectedClass(cls);
    setFormName(cls.name);
    setFormDescription(cls.description || "");
    setFormSchedule(cls.schedule || "");
    setEditOpen(true);
  }

  async function handleEdit() {
    if (!selectedClass || !formName.trim()) {
      toast.error("Class name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/classes/${selectedClass.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDescription.trim() || null,
          schedule: formSchedule.trim() || null,
        }),
      });

      if (res.ok) {
        toast.success("Class updated successfully");
        setEditOpen(false);
        setSelectedClass(null);
        resetForm();
        fetchClasses();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update class");
      }
    } catch {
      toast.error("Failed to update class");
    } finally {
      setSubmitting(false);
    }
  }

  function openDelete(cls: ClassItem) {
    setSelectedClass(cls);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!selectedClass) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/classes/${selectedClass.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Class deleted successfully");
        setDeleteOpen(false);
        setSelectedClass(null);
        fetchClasses();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete class");
      }
    } catch {
      toast.error("Failed to delete class");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Classes</h1>
          <p className="text-muted-foreground">
            Manage your classes and enrollment
          </p>
        </div>
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger
            render={
              <Button>
                <Plus className="h-4 w-4" />
                Create Class
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Class</DialogTitle>
              <DialogDescription>
                Add a new class to your attendance system.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Name *</Label>
                <Input
                  id="create-name"
                  placeholder="e.g. Introduction to Computer Science"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  placeholder="Brief description of the class"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-schedule">Schedule</Label>
                <Input
                  id="create-schedule"
                  placeholder="e.g. MWF 10:00 AM - 11:00 AM"
                  value={formSchedule}
                  onChange={(e) => setFormSchedule(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? "Creating..." : "Create Class"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Classes</CardTitle>
          <CardDescription>
            {loading
              ? "Loading..."
              : `${classes.length} class${classes.length !== 1 ? "es" : ""} total`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">
              Loading classes...
            </p>
          ) : classes.length === 0 ? (
            <div className="py-8 text-center">
              <BookOpen className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No classes yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first class to get started
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead className="w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((cls) => (
                  <TableRow key={cls.id}>
                    <TableCell>
                      <Link
                        href={`/admin/classes/${cls.id}`}
                        className="font-medium hover:underline"
                      >
                        {cls.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {cls.code}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {cls.schedule || "--"}
                    </TableCell>
                    <TableCell>{cls.enrollmentCount}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(cls)}>
                            <Pencil className="h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => openDelete(cls)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setSelectedClass(null);
            resetForm();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>
              Update the class details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-schedule">Schedule</Label>
              <Input
                id="edit-schedule"
                value={formSchedule}
                onChange={(e) => setFormSchedule(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button onClick={handleEdit} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setSelectedClass(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Class</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedClass?.name}&quot;?
              This action cannot be undone. All enrollments and attendance
              records for this class will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? "Deleting..." : "Delete Class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
