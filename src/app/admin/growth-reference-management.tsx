"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GrowthReference {
  id: string;
  speciesName: string;
  sex: string;
  ageDays: number;
  weightGrams: number | null;
  headLengthMm: number | null;
  earLengthMm: number | null;
  armLengthMm: number | null;
  legLengthMm: number | null;
  footLengthMm: number | null;
  tailLengthMm: number | null;
  bodyLengthMm: number | null;
  wingLengthMm: number | null;
  reference: string | null;
}

export function GrowthReferenceManagement() {
  const [species, setSpecies] = useState<string[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string>("");
  const [selectedSex, setSelectedSex] = useState<string>("Female");
  const [data, setData] = useState<GrowthReference[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch list of species that have reference data
  useEffect(() => {
    async function fetchSpecies() {
      try {
        const res = await fetch("/api/growth-references/species");
        if (res.ok) {
          const list = await res.json();
          setSpecies(list);
          if (list.length > 0 && !selectedSpecies) {
            setSelectedSpecies(list[0]);
          }
        }
      } catch {
        // Silent
      }
    }
    fetchSpecies();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch reference data when species/sex changes
  useEffect(() => {
    async function fetchData() {
      if (!selectedSpecies) return;
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/growth-references?speciesName=${encodeURIComponent(selectedSpecies)}&sex=${encodeURIComponent(selectedSex)}`
        );
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // Silent
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [selectedSpecies, selectedSex]);

  // Determine which measurement columns have data
  const hasArm = data.some((d) => d.armLengthMm != null);
  const hasFoot = data.some((d) => d.footLengthMm != null);
  const hasWing = data.some((d) => d.wingLengthMm != null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Select species" />
            </SelectTrigger>
            <SelectContent>
              {species.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedSex} onValueChange={setSelectedSex}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Male">Male</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary">{data.length} points</Badge>
        </div>
      </div>

      {species.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Growth Reference Data</CardTitle>
            <CardDescription>
              Growth reference data is loaded via the database seed script.
              Run <code className="text-xs bg-muted px-1 py-0.5 rounded">npm run db:seed</code> to
              load data for macropods, possums, and flying foxes.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {data.length > 0 && (
        <div className="rounded-md border overflow-x-auto max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky top-0 bg-background">Age (days)</TableHead>
                <TableHead className="sticky top-0 bg-background text-right">Weight (g)</TableHead>
                {hasFoot && (
                  <TableHead className="sticky top-0 bg-background text-right">Foot (mm)</TableHead>
                )}
                {hasArm && (
                  <TableHead className="sticky top-0 bg-background text-right">Arm (mm)</TableHead>
                )}
                {hasWing && (
                  <TableHead className="sticky top-0 bg-background text-right">Wing (mm)</TableHead>
                )}
                <TableHead className="sticky top-0 bg-background">Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.ageDays}</TableCell>
                  <TableCell className="text-right">
                    {row.weightGrams != null ? row.weightGrams : "—"}
                  </TableCell>
                  {hasFoot && (
                    <TableCell className="text-right">
                      {row.footLengthMm ?? "—"}
                    </TableCell>
                  )}
                  {hasArm && (
                    <TableCell className="text-right">
                      {row.armLengthMm ?? "—"}
                    </TableCell>
                  )}
                  {hasWing && (
                    <TableCell className="text-right">
                      {row.wingLengthMm ?? "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground text-xs">
                    {row.reference || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading...</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Data Sources &amp; References</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p><span className="font-medium">Macropods (kangaroos, wallabies, wallaroos):</span></p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Poole, W.E., Carpenter, S.M. &amp; Wood, J.T. (1982). &quot;Growth of grey kangaroos and the reliability of age determination from body measurements. I. The Eastern Grey Kangaroo, <em>Macropus giganteus</em>.&quot; <em>Australian Wildlife Research</em>, 9(1), 33-49.</li>
            <li>ARAZPA (Australasian Regional Association of Zoological Parks and Aquaria). &quot;Birth Date Determination in Marsupials&quot; — growth rate tables for wallabies and wallaroos.</li>
          </ul>
          <p><span className="font-medium">Possums:</span></p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Kerle, J.A. (1984). &quot;Growth and development of <em>Trichosurus vulpecula</em> (Marsupialia: Phalangeridae).&quot; In A.P. Smith &amp; I.D. Hume (Eds.), <em>Possums and Gliders</em>, Australian Mammal Society.</li>
            <li>How, R.A. (1983). &quot;Growth and development of the common ringtail possum, <em>Pseudocheirus peregrinus</em>.&quot; In A.P. Smith &amp; I.D. Hume (Eds.), <em>Possums and Gliders</em>, Australian Mammal Society.</li>
          </ul>
          <p><span className="font-medium">Flying foxes:</span></p>
          <ul className="list-disc ml-4 space-y-1">
            <li>Divljan, A. (2006). &quot;Population ecology of the grey-headed flying fox, <em>Pteropus poliocephalus</em>.&quot; PhD thesis, University of Sydney.</li>
            <li>Hall, L.S. &amp; Richards, G.C. (2000). <em>Flying Foxes: Fruit and Blossom Bats of Australia</em>. UNSW Press, Sydney.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
