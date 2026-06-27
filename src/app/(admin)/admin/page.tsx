"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  BookOpen,
  Radio,
  ClipboardCheck,
  Plus,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDateTime, formatTime } from "@/lib/utils";
import { toast } from "sonner";

interface ClassItem {
  id: string;
  name: string;
  code: string;
  enrollmentCount: number;
}

interface SessionItem {
  id: string;
  classId: string;
  className: string;
  startedAt: string;
  endedAt: string | null;
  checkInCount: number;
}

interface AttendanceRecord {
  id: string;
  userName: string;
  className: string;
  checkedAt: string;
  status: string;
}

export default function DashboardPage() {
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [activeSessions, setActiveSessions] = useState(0);
  const [todayCheckIns, setTodayCheckIns] = useState(0);
  const [recentSessions, setRecentSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [classesRes, sessionsRes, recordsRes] = await Promise.all([
          fetch("/api/classes"),
          fetch("/api/sessions"),
          fetch(
            `/api/attendance/records?dateFrom=${new Date().toISOString().split("T")[0]}`
          ),
        ]);

        if (classesRes.ok) {
          const classes: ClassItem[] = await classesRes.json();
          setTotalClasses(classes.length);
          const studentCount = classes.reduce(
            (sum, c) => sum + c.enrollmentCount,
            0
          );
          setTotalStudents(studentCount);
        }

        if (sessionsRes.ok) {
          const sessions: SessionItem[] = await sessionsRes.json();
          const active = sessions.filter((s) => s.endedAt === null);
          setActiveSessions(active.length);
          setRecentSessions(sessions.slice(0, 5));
        }

        if (recordsRes.ok) {
          const records: AttendanceRecord[] = await recordsRes.json();
          setTodayCheckIns(records.length);
        }
      } catch {
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      label: "Total Students",
      value: totalStudents,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Total Classes",
      value: totalClasses,
      icon: BookOpen,
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      label: "Active Sessions",
      value: activeSessions,
      icon: Radio,
      color: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-950/30",
    },
    {
      label: "Today's Check-ins",
      value: todayCheckIns,
      icon: ClipboardCheck,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/30",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your attendance system
          </p>
        </div>
        <Button render={<Link href="/admin/classes" />}>
          <Plus className="h-4 w-4" />
          Start New Session
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardDescription>{stat.label}</CardDescription>
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">
                {loading ? "..." : stat.value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Separator />

      <div>
        <h2 className="mb-4 text-lg font-semibold">Recent Sessions</h2>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : recentSessions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No sessions yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a class and start your first attendance session
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium">{session.className}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDateTime(new Date(session.startedAt))}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {session.checkInCount} check-ins
                    </span>
                    {session.endedAt === null ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Ended</Badge>
                    )}
                    {session.endedAt === null && (
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <Link href={`/admin/sessions/${session.id}`} />
                        }
                      >
                        View Live
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
