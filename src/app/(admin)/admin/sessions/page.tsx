"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QrCode, Eye } from "lucide-react";
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
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

interface SessionItem {
  id: string;
  classId: string;
  className: string;
  classCode: string;
  startedAt: string;
  endedAt: string | null;
  lateThreshold: number;
  checkInCount: number;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch("/api/sessions");
        if (res.ok) {
          const data = await res.json();
          setSessions(data);
        } else {
          toast.error("Failed to load sessions");
        }
      } catch {
        toast.error("Failed to load sessions");
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
        <p className="text-muted-foreground">
          View all attendance sessions
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Sessions</CardTitle>
          <CardDescription>
            {loading
              ? "Loading..."
              : `${sessions.length} session${sessions.length !== 1 ? "s" : ""} total`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">
              Loading sessions...
            </p>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center">
              <QrCode className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground">No sessions yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Start a session from a class page
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check-ins</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">
                      {session.className}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(new Date(session.startedAt))}
                    </TableCell>
                    <TableCell>
                      {session.endedAt === null ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">
                          Ended{" "}
                          {formatDateTime(new Date(session.endedAt))}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{session.checkInCount}</TableCell>
                    <TableCell>
                      {session.endedAt === null ? (
                        <Button
                          variant="outline"
                          size="sm"
                          render={
                            <Link href={`/admin/sessions/${session.id}`} />
                          }
                        >
                          <Eye className="h-4 w-4" />
                          View Live
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          render={
                            <Link href={`/admin/sessions/${session.id}`} />
                          }
                        >
                          View
                        </Button>
                      )}
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
