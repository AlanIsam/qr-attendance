"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  Play,
  Users,
  Calendar,
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface ClassDetail {
  id: string;
  name: string;
  code: string;
  description: string | null;
  schedule: string | null;
  enrollmentCount: number;
}

interface Student {
  id: string;
  name: string;
  studentId: string | null;
  email: string;
  enrollmentId: string;
  totalSessions: number;
  attendedCount: number;
  lateCount: number;
  attendancePercentage: number;
}

export default function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();
  const [classData, setClassData] = useState<ClassDetail | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [startingSession, setStartingSession] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [classRes, studentsRes] = await Promise.all([
          fetch(`/api/classes/${id}`),
          fetch(`/api/classes/${id}/students`),
        ]);

        if (classRes.ok) {
          const data = await classRes.json();
          setClassData(data);
        } else {
          toast.error("Failed to load class");
        }

        if (studentsRes.ok) {
          const data = await studentsRes.json();
          setStudents(data);
        }
      } catch {
        toast.error("Failed to load class data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  async function handleCopyCode() {
    if (!classData) return;
    try {
      await navigator.clipboard.writeText(classData.code);
      setCopied(true);
      toast.success("Class code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  }

  async function handleStartSession() {
    if (!classData) return;

    setStartingSession(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: classData.id }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Attendance session started");
        router.push(`/admin/sessions/${data.id}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to start session");
      }
    } catch {
      toast.error("Failed to start session");
    } finally {
      setStartingSession(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading class details...</p>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Class not found</p>
        <Button
          variant="outline"
          className="mt-4"
          render={<Link href="/admin/classes" />}
        >
          Back to Classes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          render={<Link href="/admin/classes" />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {classData.name}
          </h1>
          <p className="text-muted-foreground">Class details and enrollment</p>
        </div>
        <Button onClick={handleStartSession} disabled={startingSession}>
          <Play className="h-4 w-4" />
          {startingSession ? "Starting..." : "Start Attendance Session"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Class Code</CardDescription>
            <div className="flex items-center gap-2">
              <code className="rounded bg-muted px-2 py-1 text-lg font-mono font-bold">
                {classData.code}
              </code>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCopyCode}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Enrolled Students</CardDescription>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-2xl font-bold">
                {classData.enrollmentCount}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Schedule</CardDescription>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">
                {classData.schedule || "Not set"}
              </CardTitle>
            </div>
          </CardHeader>
        </Card>
      </div>

      {classData.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{classData.description}</p>
          </CardContent>
        </Card>
      )}

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Enrolled Students</CardTitle>
          <CardDescription>
            {students.length} student{students.length !== 1 ? "s" : ""} enrolled
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">
                No students enrolled yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Students can enroll using the class code:{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {classData.code}
                </code>
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Attendance Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.name}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs">
                        {student.studentId || "--"}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {student.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{
                              width: `${student.attendancePercentage}%`,
                            }}
                          />
                        </div>
                        <Badge
                          variant={
                            student.attendancePercentage >= 80
                              ? "default"
                              : student.attendancePercentage >= 60
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {student.attendancePercentage}%
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
