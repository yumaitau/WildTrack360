import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AnimalStatus } from "@prisma/client"

interface StatusBadgeProps {
	status: AnimalStatus;
	className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
	return (
		<Badge
			variant="outline"
			className={cn(className, {
			  'bg-blue-100 text-blue-800 border-blue-300': status === 'IN_CARE',
			  'bg-green-100 text-green-800 border-green-300': status === 'RELEASED',
			  'bg-gray-100 text-gray-800 border-gray-300': status === 'DECEASED',
			})}
		  >
			{status}
		</Badge>
	)
}
