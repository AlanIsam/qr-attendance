"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Settings,
  UserPlus,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Search,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  role: string;
  createdAt: string;
}

export default function SettingsPage() {
  const [lateThreshold, setLateThreshold] = useState(10);
  const [qrRefreshInterval, setQrRefreshInterval] = useState(30);
  const [sessionDuration, setSessionDuration] = useState(120);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [students, setStudents] = useState<AdminUser[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setLateThreshold(data.settings.lateThreshold);
          setQrRefreshInterval(data.settings.qrRefreshInterval);
          setSessionDuration(data.settings.sessionDuration);
        }
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));

    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const [adminRes, studentRes] = await Promise.all([
        fetch("/api/admin/users?role=admin").then((r) => r.json()),
        fetch("/api/admin/users?role=student").then((r) => r.json()),
      ]);
      setAdmins(adminRes.users || []);
      setStudents(studentRes.users || []);
    } catch {
      toast.error("Failed to load users");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lateThreshold, qrRefreshInterval, sessionDuration }),
      });
      if (!res.ok) throw new Error();
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateAdmin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create admin");
        return;
      }
      toast.success(`Admin account created for ${name}`);
      setCreateDialogOpen(false);
      loadUsers();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  async function handlePromote(userId: string, name: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to promote user");
        return;
      }
      toast.success(`${name} promoted to admin`);
      loadUsers();
    } catch {
      toast.error("Something went wrong");
    }
  }

  async function handleDemote(userId: string, name: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "student" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to demote user");
        return;
      }
      toast.success(`${name} changed to student`);
      loadUsers();
    } catch {
      toast.error("Something went wrong");
    }
  }

  async function handleDeleteAdmin(userId: string, name: string) {
    if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete user");
        return;
      }
      toast.success(`${name} deleted`);
      loadUsers();
    } catch {
      toast.error("Something went wrong");
    }
  }

  const filteredStudents = students.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.studentId?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Admin / Teacher Accounts</CardTitle>
              </div>
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <UserPlus className="mr-1 h-4 w-4" />
                Create Admin
              </Button>
            </div>
            <CardDescription>
              Manage admin and teacher accounts. Admins can create classes, start sessions, and view attendance.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Since</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.name}</TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>{formatDate(new Date(admin.createdAt))}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDemote(admin.id, admin.name)}
                          title="Demote to student"
                        >
                          <ShieldOff className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDeleteAdmin(admin.id, admin.name)}
                          title="Delete account"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Promote Student to Admin</CardTitle>
                <CardDescription>
                  Search for a registered student and promote them to admin/teacher role.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPromoteDialogOpen(true)}
              >
                <Search className="mr-1 h-4 w-4" />
                Find Student
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Attendance Settings</CardTitle>
            </div>
            <CardDescription>
              Configure how attendance sessions work.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="lateThreshold">Late Threshold (minutes)</Label>
              <Input
                id="lateThreshold"
                type="number"
                min={1}
                max={60}
                value={lateThreshold}
                onChange={(e) => setLateThreshold(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Students who check in after this many minutes will be marked as &quot;late&quot;.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qrRefreshInterval">QR Refresh Interval (seconds)</Label>
              <Input
                id="qrRefreshInterval"
                type="number"
                min={10}
                max={120}
                value={qrRefreshInterval}
                onChange={(e) => setQrRefreshInterval(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                How often the QR code refreshes to prevent screenshot sharing.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionDuration">Session Duration (minutes)</Label>
              <Input
                id="sessionDuration"
                type="number"
                min={5}
                max={480}
                value={sessionDuration}
                onChange={(e) => setSessionDuration(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Sessions will remain active for this duration before they need to be manually ended.
              </p>
            </div>

            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Admin Account</DialogTitle>
            <DialogDescription>
              Create a new admin/teacher account. They will be able to manage classes and attendance.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAdmin}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="admin-name">Full Name</Label>
                <Input id="admin-name" name="name" placeholder="Teacher Name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Email</Label>
                <Input id="admin-email" name="email" type="email" placeholder="teacher@school.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Password</Label>
                <Input id="admin-password" name="password" type="password" placeholder="At least 6 characters" required minLength={6} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Create Admin"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Promote Student to Admin</DialogTitle>
            <DialogDescription>
              Search for a student and promote them to admin/teacher role.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or student ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-64 overflow-auto rounded-md border">
              {filteredStudents.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {searchQuery ? "No students found" : "No registered students yet"}
                </div>
              ) : (
                <Table>
                  <TableBody>
                    {filteredStudents.slice(0, 20).map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-xs text-muted-foreground">{student.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {student.studentId && (
                            <Badge variant="outline" className="text-xs">{student.studentId}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => {
                              handlePromote(student.id, student.name);
                              setPromoteDialogOpen(false);
                              setSearchQuery("");
                            }}
                          >
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            Promote
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
