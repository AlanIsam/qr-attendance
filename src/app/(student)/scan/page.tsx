"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Camera, RotateCcw, Clock } from "lucide-react";
import { toast } from "sonner";

type ScanState = "idle" | "scanning" | "success" | "error";

interface CheckInResult {
  className: string;
  status: string;
  checkedAt: string;
}

export default function ScanPage() {
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<unknown>(null);
  const processedRef = useRef(false);

  const stopScanner = useCallback(async () => {
    if (html5QrRef.current) {
      try {
        const scanner = html5QrRef.current as { stop: () => Promise<void>; clear: () => void };
        await scanner.stop();
        scanner.clear();
      } catch {
        // ignore
      }
      html5QrRef.current = null;
    }
  }, []);

  const handleCheckIn = useCallback(async (qrData: string) => {
    if (processedRef.current) return;
    processedRef.current = true;

    await stopScanner();

    try {
      const parsed = JSON.parse(qrData);
      if (!parsed.token || !parsed.sessionId) {
        throw new Error("Invalid QR code format");
      }

      const res = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: parsed.token,
          sessionId: parsed.sessionId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setScanState("error");
        setErrorMsg(data.error || "Check-in failed");
        return;
      }

      setScanState("success");
      setResult({
        className: data.className || "Class",
        status: data.status || "present",
        checkedAt: data.checkedAt || new Date().toISOString(),
      });
    } catch {
      setScanState("error");
      setErrorMsg("Invalid QR code. Please scan the attendance QR code.");
    }
  }, [stopScanner]);

  const startScanner = useCallback(async () => {
    processedRef.current = false;
    setScanState("scanning");
    setResult(null);
    setErrorMsg("");

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (!scannerRef.current) return;

      const scanner = new Html5Qrcode("qr-reader");
      html5QrRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          handleCheckIn(decodedText);
        },
        () => {
          // ignore scan failures
        }
      );
    } catch (err) {
      setScanState("error");
      if (err instanceof Error && err.message.includes("Permission")) {
        setErrorMsg("Camera permission denied. Please allow camera access and try again.");
      } else {
        setErrorMsg("Could not start camera. Please check permissions.");
      }
    }
  }, [handleCheckIn]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  function handleReset() {
    processedRef.current = false;
    setScanState("idle");
    setResult(null);
    setErrorMsg("");
  }

  return (
    <div className="flex flex-col items-center space-y-6 p-4">
      <div className="w-full pt-2">
        <h1 className="text-2xl font-bold text-center">Scan Attendance</h1>
        <p className="text-center text-sm text-muted-foreground mt-1">
          Point your camera at the QR code
        </p>
      </div>

      {scanState === "idle" && (
        <Card className="w-full">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Camera className="h-10 w-10 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Tap the button below to open your camera and scan the QR code displayed by your teacher.
            </p>
            <Button onClick={startScanner} size="lg" className="w-full max-w-xs">
              <Camera className="mr-2 h-4 w-4" />
              Open Scanner
            </Button>
          </CardContent>
        </Card>
      )}

      {scanState === "scanning" && (
        <Card className="w-full overflow-hidden">
          <CardContent className="p-0">
            <div
              id="qr-reader"
              ref={scannerRef}
              className="w-full"
            />
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Scanning... Point at the QR code
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => {
                  stopScanner();
                  handleReset();
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {scanState === "success" && result && (
        <Card className="w-full">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-green-600">
                {result.status === "late" ? "Checked In (Late)" : "Checked In!"}
              </h2>
              <p className="text-lg font-medium">{result.className}</p>
              <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                {new Date(result.checkedAt).toLocaleTimeString()}
              </div>
              {result.status === "late" && (
                <p className="text-sm text-yellow-600 flex items-center justify-center gap-1 mt-2">
                  <Clock className="h-3 w-3" />
                  You were marked as late
                </p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={handleReset}
              className="mt-2"
            >
              Done
            </Button>
          </CardContent>
        </Card>
      )}

      {scanState === "error" && (
        <Card className="w-full">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-red-600">Check-in Failed</h2>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
            </div>
            <Button onClick={() => { handleReset(); toast.dismiss(); }} className="mt-2">
              <RotateCcw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
