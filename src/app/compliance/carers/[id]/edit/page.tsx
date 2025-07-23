import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Save, 
  X,
  Plus,
  Calendar,
  Home
} from "lucide-react";
import { getUsers } from "@/lib/data-store";
import Link from "next/link";
import { notFound } from "next/navigation";

interface EditCarerPageProps {
  params: {
    id: string;
  };
}

export default async function EditCarerPage({ params }: EditCarerPageProps) {
  const users = await getUsers();
  const carer = users.find(u => u.id === params.id);
  
  if (!carer) {
    notFound();
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="outline" size="icon">
                <Home className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/compliance/carers/${carer.id}`}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Edit Carer</h1>
            <p className="text-muted-foreground">
              Update carer information and compliance details
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/compliance/carers/${carer.id}`}>
            <Button variant="outline">
              Cancel
            </Button>
          </Link>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <form className="space-y-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Update carer's personal and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input 
                  id="fullName" 
                  defaultValue={carer.fullName}
                  placeholder="Enter full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  defaultValue={carer.email}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select defaultValue={carer.role}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Carer">Carer</SelectItem>
                    <SelectItem value="Veterinarian">Veterinarian</SelectItem>
                    <SelectItem value="Coordinator">Coordinator</SelectItem>
                    <SelectItem value="Administrator">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jurisdiction">Jurisdiction</Label>
                <Select defaultValue={carer.jurisdiction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select jurisdiction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACT">ACT</SelectItem>
                    <SelectItem value="NSW">NSW</SelectItem>
                    <SelectItem value="VIC">VIC</SelectItem>
                    <SelectItem value="QLD">QLD</SelectItem>
                    <SelectItem value="WA">WA</SelectItem>
                    <SelectItem value="SA">SA</SelectItem>
                    <SelectItem value="TAS">TAS</SelectItem>
                    <SelectItem value="NT">NT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Licence Information */}
        <Card>
          <CardHeader>
            <CardTitle>Licence Information</CardTitle>
            <CardDescription>
              Update licence details and expiry information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="licenceNumber">Licence Number</Label>
                <Input 
                  id="licenceNumber" 
                  defaultValue={carer.licenceNumber}
                  placeholder="Enter licence number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="licenceExpiry">Licence Expiry Date</Label>
                <Input 
                  id="licenceExpiry" 
                  type="date"
                  defaultValue={carer.licenceExpiry}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Authorised Species */}
        <Card>
          <CardHeader>
            <CardTitle>Authorised Species</CardTitle>
            <CardDescription>
              Manage species the carer is authorised to care for
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Select>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Add species" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Eastern Grey Kangaroo">Eastern Grey Kangaroo</SelectItem>
                    <SelectItem value="Red Kangaroo">Red Kangaroo</SelectItem>
                    <SelectItem value="Swamp Wallaby">Swamp Wallaby</SelectItem>
                    <SelectItem value="Common Brushtail Possum">Common Brushtail Possum</SelectItem>
                    <SelectItem value="Common Ringtail Possum">Common Ringtail Possum</SelectItem>
                    <SelectItem value="Koala">Koala</SelectItem>
                    <SelectItem value="Sugar Glider">Sugar Glider</SelectItem>
                    <SelectItem value="Feathertail Glider">Feathertail Glider</SelectItem>
                    <SelectItem value="Common Wombat">Common Wombat</SelectItem>
                    <SelectItem value="Echidna">Echidna</SelectItem>
                    <SelectItem value="Platypus">Platypus</SelectItem>
                    <SelectItem value="Flying Fox">Flying Fox</SelectItem>
                    <SelectItem value="Microbat">Microbat</SelectItem>
                    <SelectItem value="Kookaburra">Kookaburra</SelectItem>
                    <SelectItem value="Magpie">Magpie</SelectItem>
                    <SelectItem value="Cockatoo">Cockatoo</SelectItem>
                    <SelectItem value="Lorikeet">Lorikeet</SelectItem>
                    <SelectItem value="Owl">Owl</SelectItem>
                    <SelectItem value="Eagle">Eagle</SelectItem>
                    <SelectItem value="Hawk">Hawk</SelectItem>
                    <SelectItem value="Falcon">Falcon</SelectItem>
                    <SelectItem value="Duck">Duck</SelectItem>
                    <SelectItem value="Swan">Swan</SelectItem>
                    <SelectItem value="Pelican">Pelican</SelectItem>
                    <SelectItem value="Ibis">Ibis</SelectItem>
                    <SelectItem value="Heron">Heron</SelectItem>
                    <SelectItem value="Egret">Egret</SelectItem>
                    <SelectItem value="Cormorant">Cormorant</SelectItem>
                    <SelectItem value="Tern">Tern</SelectItem>
                    <SelectItem value="Gull">Gull</SelectItem>
                    <SelectItem value="Plover">Plover</SelectItem>
                    <SelectItem value="Stilt">Stilt</SelectItem>
                    <SelectItem value="Grebe">Grebe</SelectItem>
                    <SelectItem value="Coot">Coot</SelectItem>
                    <SelectItem value="Moorhen">Moorhen</SelectItem>
                    <SelectItem value="Rail">Rail</SelectItem>
                    <SelectItem value="Crake">Crake</SelectItem>
                    <SelectItem value="Bittern">Bittern</SelectItem>
                    <SelectItem value="Bustard">Bustard</SelectItem>
                    <SelectItem value="Button-quail">Button-quail</SelectItem>
                    <SelectItem value="Quail">Quail</SelectItem>
                    <SelectItem value="Pheasant">Pheasant</SelectItem>
                    <SelectItem value="Partridge">Partridge</SelectItem>
                    <SelectItem value="Grouse">Grouse</SelectItem>
                    <SelectItem value="Ptarmigan">Ptarmigan</SelectItem>
                    <SelectItem value="Capercaillie">Capercaillie</SelectItem>
                    <SelectItem value="Black Grouse">Black Grouse</SelectItem>
                    <SelectItem value="Red Grouse">Red Grouse</SelectItem>
                    <SelectItem value="Willow Grouse">Willow Grouse</SelectItem>
                    <SelectItem value="Rock Ptarmigan">Rock Ptarmigan</SelectItem>
                    <SelectItem value="White-tailed Ptarmigan">White-tailed Ptarmigan</SelectItem>
                    <SelectItem value="Western Capercaillie">Western Capercaillie</SelectItem>
                    <SelectItem value="Black-billed Capercaillie">Black-billed Capercaillie</SelectItem>
                    <SelectItem value="Eurasian Black Grouse">Eurasian Black Grouse</SelectItem>
                    <SelectItem value="Caucasian Black Grouse">Caucasian Black Grouse</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {carer.authorisedSpecies.map((species, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {species}
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-4 w-4 ml-1 hover:bg-red-100"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Training History */}
        <Card>
          <CardHeader>
            <CardTitle>Training History</CardTitle>
            <CardDescription>
              Add or update training courses and certifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {carer.trainingHistory.map((training, index) => (
                <div key={training.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Training Course {index + 1}</h4>
                    <Button type="button" variant="outline" size="icon">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Course Name</Label>
                      <Input defaultValue={training.courseName} />
                    </div>
                    <div className="space-y-2">
                      <Label>Provider</Label>
                      <Input defaultValue={training.provider} />
                    </div>
                    <div className="space-y-2">
                      <Label>Date Completed</Label>
                      <Input type="date" defaultValue={training.date} />
                    </div>
                    <div className="space-y-2">
                      <Label>Expiry Date (if applicable)</Label>
                      <Input type="date" defaultValue={training.expiryDate || ''} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Certificate URL</Label>
                    <Input defaultValue={training.certificateUrl || ''} placeholder="Enter certificate URL" />
                  </div>
                </div>
              ))}
              
              <Button type="button" variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Training Course
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Notes</CardTitle>
            <CardDescription>
              Any additional information about the carer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea 
                id="notes" 
                placeholder="Enter any additional notes about the carer..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Link href={`/compliance/carers/${carer.id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
} 