"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Maximize,
  Minimize,
  StopCircle,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { formatDateTime, formatTime } from "@/lib/utils";
import { toast } from "sonner";

interface SessionInfo {
  id: string;
  classId: string;
  className: string;
  classCode: string;
  startedAt: string;
  endedAt: string | null;
  lateThreshold: number;
  checkInCount: number;
  totalEnrolled: number;
}

interface QRData {
  token: string;
  sessionId: string;
  expiresAt: number;
  refreshInterval: number;
}

interface CheckIn {
  id: string;
  userId: string;
  name: string;
  studentId: string | null;
  email: string;
  status: string;
  checkedAt: string;
}

export default function LiveSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [ending, setEnding] = useState(false);

  const qrContainerRef = useRef<HTMLDivElement>(null);
  const expiresAtRef = useRef<number>(0);

  // Fetch session info
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (res.ok) {
        const data: SessionInfo = await res.json();
        setSession(data);
        return data;
      }
    } catch {
      // Silently fail for polling
    }
    return null;
  }, [id]);

  // Fetch and generate QR code
  const fetchQR = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${id}/qr`);
      if (res.ok) {
        const data: QRData = await res.json();
        expiresAtRef.current = data.expiresAt;

        const qrPayload = JSON.stringify({
          token: data.token,
          sessionId: data.sessionId,
          expiresAt: data.expiresAt,
        });

        const dataUrl = await QRCode.toDataURL(qrPayload, {
          width: 400,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });
        setQrDataUrl(dataUrl);
      } else {
        const data = await res.json();
        if (data.error === "Session has ended") {
          // Session ended externally, refresh session info
          fetchSession();
        }
      }
    } catch {
      // Silently fail for polling
    }
  }, [id, fetchSession]);

  // Fetch check-ins
  const fetchCheckins = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${id}/checkins`);
      if (res.ok) {
        const data: CheckIn[] = await res.json();
        setCheckins(data);
      }
    } catch {
      // Silently fail for polling
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    async function init() {
      const sessionData = await fetchSession();
      if (sessionData && !sessionData.endedAt) {
        await Promise.all([fetchQR(), fetchCheckins()]);
      } else if (sessionData?.endedAt) {
        await fetchCheckins();
      }
      setLoading(false);
    }
    init();
  }, [fetchSession, fetchQR, fetchCheckins]);

  // QR polling (every 5 seconds)
  useEffect(() => {
    if (!session || session.endedAt) return;

    const interval = setInterval(fetchQR, 5000);
    return () => clearInterval(interval);
  }, [session, fetchQR]);

  // Check-in polling (every 3 seconds)
  useEffect(() => {
    if (!session || session.endedAt) return;

    const interval = setInterval(() => {
      fetchCheckins();
      fetchSession();
    }, 3000);
    return () => clearInterval(interval);
  }, [session, fetchCheckins, fetchSession]);

  // Countdown timer
  useEffect(() => {
    if (!session || session.endedAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(
        0,
        Math.ceil((expiresAtRef.current - now) / 1000)
      );
      setCountdown(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Fullscreen toggle
  async function toggleFullscreen() {
    if (!qrContainerRef.current) return;

    if (!document.fullscreenElement) {
      try {
        await qrContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch {
        toast.error("Fullscreen not supported");
      }
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }

  // Listen for fullscreen change
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // End session
  async function handleEndSession() {
    setEnding(true);
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Session ended successfully");
        setEndDialogOpen(false);
        fetchSession();
        fetchCheckins();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to end session");
      }
    } catch {
      toast.error("Failed to end session");
    } finally {
      setEnding(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "present":
        return (
          <Badge
            variant="default"
            className="bg-green-600 text-white"
          >
            Present
          </Badge>
        );
      case "late":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
          >
            Late
          </Badge>
        );
      case "manual":
        return (
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
          >
            Manual
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading session...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">Session not found</p>
        <Button
          variant="outline"
          className="mt-4"
          render={<Link href="/admin/sessions" />}
        >
          Back to Sessions
        </Button>
      </div>
    );
  }

  const isActive = session.endedAt === null;

  // Session ended summary view
  if (!isActive) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            render={<Link href="/admin/sessions" />}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {session.className}
            </h1>
            <p className="text-muted-foreground">Session Summary</p>
          </div>
          <Badge variant="secondary" className="text-sm">
            Ended
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription>Started</CardDescription>
              <CardTitle className="text-base">
                {formatDateTime(new Date(session.startedAt))}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Ended</CardDescription>
              <CardTitle className="text-base">
                {session.endedAt
                  ? formatDateTime(new Date(session.endedAt))
                  : "--"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription>Attendance</CardDescription>
              <CardTitle className="text-2xl font-bold">
                {checkins.length} / {session.totalEnrolled}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Check-in Records</CardTitle>
            <CardDescription>
              {checkins.length} student{checkins.length !== 1 ? "s" : ""}{" "}
              checked in
            </CardDescription>
          </CardHeader>
          <CardContent>
            {checkins.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                No check-ins recorded
              </p>
            ) : (
              <div className="space-y-2">
                {checkins.map((checkin) => (
                  <div
                    key={checkin.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium">{checkin.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {checkin.studentId || checkin.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {formatTime(new Date(checkin.checkedAt))}
                      </span>
                      {getStatusBadge(checkin.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active session live view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          render={<Link href="/admin/sessions" />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {session.className}
          </h1>
          <p className="text-sm text-muted-foreground">
            Started {formatDateTime(new Date(session.startedAt))}
          </p>
        </div>
        <Badge variant="default" className="animate-pulse">
          Live
        </Badge>
        <Button
          variant="destructive"
          onClick={() => setEndDialogOpen(true)}
        >
          <StopCircle className="h-4 w-4" />
          End Session
        </Button>
      </div>

      {/* Main layout: QR + Feed */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* QR Code Section */}
        <div ref={qrContainerRef} className="flex flex-col items-center">
          <Card className="w-full">
            <CardHeader className="text-center">
              <CardTitle>Scan to Check In</CardTitle>
              <CardDescription>
                Point your phone camera at the QR code
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Attendance QR Code"
                  className="h-[300px] w-[300px] rounded-lg border lg:h-[350px] lg:w-[350px]"
                />
              ) : (
                <div className="flex h-[300px] w-[300px] items-center justify-center rounded-lg border bg-muted lg:h-[350px] lg:w-[350px]">
                  <p className="text-muted-foreground">Loading QR...</p>
                </div>
              )}

              {/* Countdown */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Refreshes in{" "}
                  <span className="font-mono font-bold text-foreground">
                    {countdown}s
                  </span>
                </span>
              </div>

              {/* Fullscreen button */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <>
                    <Minimize className="h-4 w-4" />
                    Exit Fullscreen
                  </>
                ) : (
                  <>
                    <Maximize className="h-4 w-4" />
                    Fullscreen
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Live Check-in Feed */}
        <div className="flex flex-col">
          <Card className="flex-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Live Check-ins
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {checkins.length} / {session.totalEnrolled} students
                    checked in
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">
                    {checkins.length}
                  </span>
                  <span className="text-muted-foreground">
                    / {session.totalEnrolled}
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{
                    width: `${session.totalEnrolled > 0 ? (checkins.length / session.totalEnrolled) * 100 : 0}%`,
                  }}
                />
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="max-h-[500px] overflow-y-auto">
              {checkins.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <Users className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Waiting for students to check in...
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {checkins.map((checkin) => (
                    <div
                      key={checkin.id}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium">{checkin.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {checkin.studentId || checkin.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {formatTime(new Date(checkin.checkedAt))}
                        </span>
                        {getStatusBadge(checkin.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* End Session Confirmation Dialog */}
      <Dialog open={endDialogOpen} onOpenChange={setEndDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to end this attendance session? Students
              will no longer be able to check in. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleEndSession}
              disabled={ending}
            >
              {ending ? "Ending..." : "End Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
