"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, BookOpen } from "lucide-react";

interface EnrolledClass {
  id: string;
  classId: string;
  status: string;
  class: {
    id: string;
    name: string;
    code: string;
    schedule: string | null;
    description: string | null;
  };
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<EnrolledClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/student/classes")
      .then((r) => r.json())
      .then((data) => setClasses(data.classes || []))
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
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold">My Classes</h1>
        <Link href="/classes/join">
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" />
            Join
          </Button>
        </Link>
      </div>

      {classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="font-medium">No classes yet</p>
              <p className="text-sm text-muted-foreground">
                Ask your teacher for a class code to get started
              </p>
            </div>
            <Link href="/classes/join">
              <Button>Join a Class</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {classes.map((enrollment) => (
            <Link
              key={enrollment.id}
              href={`/classes/${enrollment.class.id}`}
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold">{enrollment.class.name}</p>
                      {enrollment.class.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {enrollment.class.description}
                        </p>
                      )}
                      {enrollment.class.schedule && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {enrollment.class.schedule}
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary">{enrollment.class.code}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
