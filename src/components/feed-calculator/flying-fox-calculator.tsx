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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import {
  calculateFlyingFoxFeed,
  FLYING_FOX_FORMULAS,
  FLYING_FOX_SPECIES,
  type FlyingFoxFormula,
  type FlyingFoxSpecies,
} from "@/lib/feed-calculators/flyingFox";

type InputMode = "age" | "forearm";

export function FlyingFoxCalculator() {
  const [species, setSpecies] = useState<FlyingFoxSpecies>("grey-headed");
  const [formula, setFormula] = useState<FlyingFoxFormula>(
    "wombaroo-flying-fox"
  );
  const [mode, setMode] = useState<InputMode>("age");
  const [ageDays, setAgeDays] = useState<string>("");
  const [forearmMm, setForearmMm] = useState<string>("");

  const result = useMemo(() => {
    const ageNum = ageDays === "" ? undefined : Number(ageDays);
    const forearmNum = forearmMm === "" ? undefined : Number(forearmMm);
    const validAge =
      mode === "age" &&
      ageNum !== undefined &&
      Number.isFinite(ageNum) &&
      ageNum >= 0 &&
      ageNum <= 365;
    const validForearm =
      mode === "forearm" &&
      forearmNum !== undefined &&
      Number.isFinite(forearmNum) &&
      forearmNum > 0 &&
      forearmNum <= 250;
    if (!validAge && !validForearm) return null;
    try {
      return calculateFlyingFoxFeed({
        species,
        formula,
        ageDays: validAge ? ageNum : undefined,
        forearmMm: validForearm ? forearmNum : undefined,
      });
    } catch {
      return null;
    }
  }, [species, formula, mode, ageDays, forearmMm]);

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
          Flying Fox Feed Calculator
        </h1>
        <p className="text-muted-foreground text-sm">
          Calculate daily milk intake for Grey-headed and Little Red Flying
          Fox pups based on age or forearm length.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pup Details</CardTitle>
          <CardDescription>
            Enter the species, milk formula, and one developmental
            measurement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Species</Label>
              <Select
                value={species}
                onValueChange={(v) => setSpecies(v as FlyingFoxSpecies)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLYING_FOX_SPECIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Milk Formula</Label>
              <Select
                value={formula}
                onValueChange={(v) => setFormula(v as FlyingFoxFormula)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FLYING_FOX_FORMULAS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Measurement</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "age" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("age")}
              >
                Age (days)
              </Button>
              <Button
                type="button"
                variant={mode === "forearm" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("forearm")}
              >
                Forearm (mm)
              </Button>
            </div>
          </div>

          {mode === "age" ? (
            <div className="space-y-2">
              <Label htmlFor="ffAge">Age in days</Label>
              <Input
                id="ffAge"
                type="number"
                inputMode="numeric"
                min={0}
                max={365}
                placeholder="e.g. 21"
                value={ageDays}
                onChange={(e) => setAgeDays(e.target.value)}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="ffForearm">Forearm length (mm)</Label>
              <Input
                id="ffForearm"
                type="number"
                inputMode="decimal"
                min={0}
                max={250}
                placeholder="e.g. 90"
                value={forearmMm}
                onChange={(e) => setForearmMm(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Feed Plan</CardTitle>
            <CardDescription>{result.stage.label}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.warnings.map((w, i) => (
              <Alert key={i} variant="default" className="border-amber-300 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                <AlertDescription className="text-amber-900 text-sm">
                  {w}
                </AlertDescription>
              </Alert>
            ))}

            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile
                label="Expected weight"
                value={`${result.expectedWeightGrams} g`}
                sub={`range ${result.stage.weightGramsMin}–${result.stage.weightGramsMax} g`}
              />
              <StatTile
                label="Total daily feed"
                value={`${result.dailyFeedMl} ml`}
                sub={`${Math.round(result.stage.dailyIntakeFraction * 100)}% of body weight`}
              />
              <StatTile
                label="Feeds per day"
                value={`${result.feedsPerDay}`}
                sub={`${result.perFeedMl} ml per feed`}
              />
            </div>

            <div className="space-y-2 rounded-md bg-muted/50 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Stage notes</Badge>
                <span className="text-muted-foreground">
                  {result.stage.notes}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Formula</Badge>
                <span className="text-muted-foreground">
                  {result.formulaRecommendation}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Alert className="border-blue-200 bg-blue-50">
        <AlertTriangle className="h-4 w-4 text-blue-700" />
        <AlertDescription className="text-blue-900 text-sm">
          These figures are guideline only. Adjust feed volumes based on the
          pup&apos;s actual body condition, weight gain, and vet advice.
          Always follow the formula manufacturer&apos;s mixing and hygiene
          instructions.
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
