"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScanLine, BookOpen, Clock } from "lucide-react";

interface UserInfo {
  name: string;
}

interface EnrolledClass {
  id: string;
  classId: string;
  class: {
    id: string;
    name: string;
    code: string;
    schedule: string | null;
  };
}

export default function StudentHome() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [classes, setClasses] = useState<EnrolledClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/student/classes").then((r) => r.json()),
    ])
      .then(([userData, classesData]) => {
        setUser(userData.user || userData);
        setClasses(classesData.classes || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-1 pt-2">
        <h1 className="text-2xl font-bold">
          Hi, {user?.name?.split(" ")[0] || "Student"}!
        </h1>
        <p className="text-sm text-muted-foreground">
          Ready to take attendance?
        </p>
      </div>

      <Link href="/scan" className="block">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <p className="text-lg font-semibold">Scan QR Code</p>
              <p className="text-sm opacity-80">
                Tap to open scanner
              </p>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-foreground/20">
              <ScanLine className="h-7 w-7" />
            </div>
          </CardContent>
        </Card>
      </Link>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Classes</h2>
          <Link href="/classes" className="text-sm text-primary">
            View all
          </Link>
        </div>

        {classes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground" />
              <div>
                <p className="font-medium">No classes yet</p>
                <p className="text-sm text-muted-foreground">
                  Join a class to start taking attendance
                </p>
              </div>
              <Link href="/classes/join">
                <Button size="sm">Join a Class</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {classes.slice(0, 5).map((enrollment) => (
              <Link
                key={enrollment.id}
                href={`/classes/${enrollment.class.id}`}
              >
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-0.5">
                      <p className="font-medium">{enrollment.class.name}</p>
                      {enrollment.class.schedule && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {enrollment.class.schedule}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline">{enrollment.class.code}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
