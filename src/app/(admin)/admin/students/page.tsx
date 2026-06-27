"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  createdAt: string;
  _count?: { enrollments: number };
}

interface PendingEnrollment {
  id: string;
  status: string;
  createdAt: string;
  user: { name: string; email: string; studentId: string | null };
  class: { name: string; code: string };
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [pending, setPending] = useState<PendingEnrollment[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [sessions, setSessions] = useState<{ id: string; class: { name: string }; startedAt: string }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/classes").then((r) => r.json()),
      fetch("/api/enrollments/pending").then((r) => r.json()).catch(() => ({ enrollments: [] })),
      fetch("/api/sessions").then((r) => r.json()),
    ]).then(([classesData, pendingData, sessionsData]) => {
      const allStudents: Student[] = [];
      const seen = new Set<string>();
      if (classesData.classes) {
        for (const cls of classesData.classes) {
          if (cls.enrollments) {
            for (const enrollment of cls.enrollments) {
              if (enrollment.user && !seen.has(enrollment.user.id)) {
                seen.add(enrollment.user.id);
                allStudents.push(enrollment.user);
              }
            }
          }
        }
      }
      setStudents(allStudents);
      setPending(pendingData.enrollments || []);
      setSessions((sessionsData.sessions || []).filter((s: { endedAt: string | null }) => !s.endedAt));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetch("/api/attendance/records")
      .then((r) => r.json())
      .then((data) => {
        if (data.records) {
          const studentMap = new Map<string, Student>();
          for (const record of data.records) {
            if (record.user && !studentMap.has(record.user.id)) {
              studentMap.set(record.user.id, record.user);
            }
          }
        }
      })
      .catch(() => {});
  }, []);

  async function handleEnrollmentAction(id: string, status: "approved" | "rejected") {
    try {
      const res = await fetch(`/api/enrollments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setPending((prev) => prev.filter((e) => e.id !== id));
      toast.success(`Enrollment ${status}`);
    } catch {
      toast.error("Action failed");
    }
  }

  async function handleManualCheckin() {
    if (!selectedSession || !selectedStudent) {
      toast.error("Select a session and student");
      return;
    }
    try {
      const res = await fetch("/api/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: selectedSession, userId: selectedStudent }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Check-in failed");
        return;
      }
      toast.success("Student checked in manually");
      setManualDialogOpen(false);
      setSelectedSession("");
      setSelectedStudent("");
    } catch {
      toast.error("Something went wrong");
    }
  }

  const filtered = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.studentId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Students</h1>
        <Button onClick={() => setManualDialogOpen(true)}>
          Manual Check-in
        </Button>
      </div>

      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Pending Enrollments
              <Badge variant="secondary" className="ml-2">
                {pending.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.user.name}</TableCell>
                    <TableCell>{e.user.email}</TableCell>
                    <TableCell>{e.class.name}</TableCell>
                    <TableCell>{formatDate(new Date(e.createdAt))}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEnrollmentAction(e.id, "approved")}
                        >
                          <UserCheck className="mr-1 h-3 w-3" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEnrollmentAction(e.id, "rejected")}
                        >
                          <UserX className="mr-1 h-3 w-3" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">All Students</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No students found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.studentId || "—"}</TableCell>
                    <TableCell>{s.email}</TableCell>
                    <TableCell>{formatDate(new Date(s.createdAt))}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Check-in</DialogTitle>
            <DialogDescription>
              Manually mark a student as present in an active session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Active Session</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
              >
                <option value="">Select a session</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.class.name} — {new Date(s.startedAt).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Student</label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
              >
                <option value="">Select a student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.studentId || s.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleManualCheckin}>Check In</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
