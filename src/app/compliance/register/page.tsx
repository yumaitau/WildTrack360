import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, Plus, Filter, ArrowLeft } from "lucide-react";
import { getAnimals, getSpecies, getCarers } from "@/lib/data";
import Link from "next/link";

export default async function WildlifeRegisterPage() {
  const animals = await getAnimals();
  const species = await getSpecies();
  const carers = await getCarers();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/compliance">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Wildlife Admission & Outcome Register</h1>
            <p className="text-muted-foreground">
              Section 7.1.1, 7.1.2 - Maintain records of all wildlife in care
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Link href="/animals/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Animal
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Search</label>
              <Input placeholder="Search by name, species, or ID..." />
            </div>
            <div>
              <label className="text-sm font-medium">Species</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All species" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All species</SelectItem>
                  {species.map((s) => (
                    <SelectItem key={s} value={s.toLowerCase()}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="in-care">In Care</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                  <SelectItem value="deceased">Deceased</SelectItem>
                  <SelectItem value="transferred">Transferred</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Carer</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All carers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All carers</SelectItem>
                  {carers.map((c) => (
                    <SelectItem key={c} value={c.toLowerCase()}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{animals.length}</div>
            <div className="text-sm text-muted-foreground">Total Animals</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {animals.filter(a => a.status === 'In Care').length}
            </div>
            <div className="text-sm text-muted-foreground">Currently in Care</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {animals.filter(a => a.status === 'Released').length}
            </div>
            <div className="text-sm text-muted-foreground">Successfully Released</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">
              {animals.filter(a => a.status === 'Deceased').length}
            </div>
            <div className="text-sm text-muted-foreground">Deceased</div>
          </CardContent>
        </Card>
      </div>

      {/* Register Table */}
      <Card>
        <CardHeader>
          <CardTitle>Wildlife Register</CardTitle>
          <CardDescription>
            Complete record of all wildlife admissions and outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Animal ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Species</TableHead>
                <TableHead>Sex</TableHead>
                <TableHead>Age Class</TableHead>
                <TableHead>Rescue Location</TableHead>
                <TableHead>Rescue Date</TableHead>
                <TableHead>Carer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {animals.map((animal) => (
                <TableRow key={animal.id}>
                  <TableCell className="font-mono text-sm">
                    {animal.animalId}
                  </TableCell>
                  <TableCell className="font-medium">{animal.name}</TableCell>
                  <TableCell>{animal.species}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {animal.sex}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {animal.ageClass}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {animal.rescueLocation}
                  </TableCell>
                  <TableCell>{animal.rescueDate}</TableCell>
                  <TableCell>{animal.carer}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        animal.status === 'In Care' ? 'default' :
                        animal.status === 'Released' ? 'secondary' :
                        animal.status === 'Deceased' ? 'destructive' : 'outline'
                      }
                    >
                      {animal.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/animals/${animal.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Compliance Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Required Fields (Section 7.1.1)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Animal identification number</li>
                <li>• Species and sex</li>
                <li>• Age class</li>
                <li>• Rescue location and date</li>
                <li>• Reason for admission</li>
                <li>• Carer responsible</li>
                <li>• Current status</li>
                <li>• Final outcome and date</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Record Keeping (Section 7.1.2)</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Maintain records for minimum 3 years</li>
                <li>• Available for inspection by authorities</li>
                <li>• Regular updates as status changes</li>
                <li>• Secure storage and backup</li>
                <li>• Export capability for reporting</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 