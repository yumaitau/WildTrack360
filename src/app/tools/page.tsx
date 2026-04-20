import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bird, PawPrint, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Tools — WildTrack360",
};

const tools = [
  {
    href: "/tools/feed-calculator/flying-fox",
    title: "Flying Fox Feed Calculator",
    description:
      "Calculate daily milk volumes, per-feed amounts, and stage guidance for Grey-headed and Little Red Flying Fox pups.",
    icon: Bird,
  },
  {
    href: "/tools/feed-calculator/macropod",
    title: "Macropod Joey Feed Calculator",
    description:
      "Determine the correct Wombaroo formula stage and daily feed plan for Eastern Grey Kangaroos, Red-necked Wallabies, Swamp Wallabies and Common Wallaroos.",
    icon: PawPrint,
  },
];

export default function ToolsPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-5xl">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Care Tools</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Quick-reference calculators for rehabilitation care. These tools
          produce guideline values — always confirm feed plans with your vet
          and the formula manufacturer&apos;s documentation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.href} href={tool.href} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{tool.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription>{tool.description}</CardDescription>
                  <Button variant="outline" size="sm" className="gap-1">
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
