"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

interface AttendanceEntry {
  id: string;
  status: string;
  checkedAt: string;
  session: {
    startedAt: string;
  };
}

interface ClassInfo {
  id: string;
  name: string;
  code: string;
  schedule: string | null;
  description: string | null;
}

export default function ClassHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [history, setHistory] = useState<AttendanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/student/history/${id}`).then((r) => r.json()),
    ])
      .then(([historyData]) => {
        const records = (historyData.history || historyData.records || []).map((r: Record<string, unknown>) => ({
          id: r.id,
          status: r.status,
          checkedAt: r.checkInTime || r.checkedAt,
          session: { startedAt: r.sessionDate || (r.session as Record<string, unknown>)?.startedAt },
        }));
        setHistory(records);
        if (historyData.class) setClassInfo(historyData.class);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const presentCount = history.filter(
    (h) => h.status === "present" || h.status === "manual"
  ).length;
  const lateCount = history.filter((h) => h.status === "late").length;
  const totalSessions = history.length;
  const attendanceRate =
    totalSessions > 0 ? Math.round(((presentCount + lateCount) / totalSessions) * 100) : 0;

  const statusIcon = (status: string) => {
    switch (status) {
      case "present":
      case "manual":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "late":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      present: "default",
      late: "secondary",
      manual: "outline",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="text-xs">
        {status === "manual" ? "Manual" : status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center gap-2 pt-2">
        <Link href="/classes">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">{classInfo?.name || "Class"}</h1>
          {classInfo?.code && (
            <p className="text-xs text-muted-foreground">{classInfo.code}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{attendanceRate}%</p>
            <p className="text-xs text-muted-foreground">Attendance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{presentCount}</p>
            <p className="text-xs text-muted-foreground">Present</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{lateCount}</p>
            <p className="text-xs text-muted-foreground">Late</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Attendance History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {history.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No attendance records yet
            </div>
          ) : (
            <div className="divide-y">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {statusIcon(entry.status)}
                    <div>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {formatDate(new Date(entry.session.startedAt))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Checked in at {formatTime(new Date(entry.checkedAt))}
                      </p>
                    </div>
                  </div>
                  {statusBadge(entry.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
