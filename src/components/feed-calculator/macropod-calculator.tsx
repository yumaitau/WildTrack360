"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import {
  calculateMacropodFeed,
  MACROPOD_SPECIES,
  type MacropodSpecies,
} from "@/lib/feed-calculators/macropod";

export function MacropodCalculator() {
  const [species, setSpecies] = useState<MacropodSpecies>(
    "eastern-grey-kangaroo"
  );
  const [ageDays, setAgeDays] = useState<string>("");
  const [weightGrams, setWeightGrams] = useState<string>("");

  const result = useMemo(() => {
    const ageNum = ageDays === "" ? undefined : Number(ageDays);
    const weightNum = weightGrams === "" ? undefined : Number(weightGrams);
    const hasAge = ageNum != null && !isNaN(ageNum);
    const hasWeight = weightNum != null && !isNaN(weightNum);
    if (!hasAge && !hasWeight) return null;
    try {
      return calculateMacropodFeed({
        species,
        ageDays: hasAge ? ageNum : undefined,
        weightGrams: hasWeight ? weightNum : undefined,
      });
    } catch {
      return null;
    }
  }, [species, ageDays, weightGrams]);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-3xl">
      <Link
        href="/tools"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Tools
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold">
          Macropod Joey Feed Calculator
        </h1>
        <p className="text-muted-foreground text-sm">
          Determine the correct Wombaroo formula stage and daily feed plan
          for orphaned kangaroo, wallaby and wallaroo joeys.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Joey Details</CardTitle>
          <CardDescription>
            Enter weight for the most accurate result. Age alone will
            estimate weight.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Species</Label>
            <Select
              value={species}
              onValueChange={(v) => setSpecies(v as MacropodSpecies)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MACROPOD_SPECIES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mpWeight">Weight (g)</Label>
              <Input
                id="mpWeight"
                type="number"
                inputMode="numeric"
                min={0}
                max={50000}
                placeholder="e.g. 1500"
                value={weightGrams}
                onChange={(e) => setWeightGrams(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mpAge">
                Age (days){" "}
                <span className="text-xs text-muted-foreground">
                  optional
                </span>
              </Label>
              <Input
                id="mpAge"
                type="number"
                inputMode="numeric"
                min={0}
                max={720}
                placeholder="e.g. 180"
                value={ageDays}
                onChange={(e) => setAgeDays(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Feed Plan</CardTitle>
            <CardDescription>{result.stageLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.warnings.map((w, i) => (
              <Alert key={i} className="border-amber-300 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                <AlertDescription className="text-amber-900 text-sm">
                  {w}
                </AlertDescription>
              </Alert>
            ))}

            {result.transitionNote && (
              <Alert className="border-blue-300 bg-blue-50">
                <AlertTriangle className="h-4 w-4 text-blue-700" />
                <AlertDescription className="text-blue-900 text-sm">
                  {result.transitionNote}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile
                label="Recommended stage"
                value={result.stage}
                sub={result.stageLabel}
              />
              <StatTile
                label="Total daily feed"
                value={`${result.dailyFeedMl} ml`}
                sub={`${Math.round(result.dailyIntakePercent * 100)}% of ${result.effectiveWeightGrams} g body weight`}
              />
              <StatTile
                label="Feeds per day"
                value={`${result.feedsPerDay}`}
                sub={`${result.perFeedMl} ml per feed`}
              />
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Stage guidance</Badge>
                <span className="text-muted-foreground">
                  {result.guidance}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Alert className="border-blue-200 bg-blue-50">
        <AlertTriangle className="h-4 w-4 text-blue-700" />
        <AlertDescription className="text-blue-900 text-sm">
          These figures are guideline only. Always follow the Wombaroo
          feeding guide for the applicable species, monitor weight gain, and
          consult a vet for any joey outside normal growth ranges.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}
