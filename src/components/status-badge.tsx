import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { AnimalStatus } from "@prisma/client"

interface StatusBadgeProps {
	status: AnimalStatus;
	className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
	const getStatusLabel = (status: AnimalStatus) => {
		switch (status) {
			case 'IN_CARE':
				return 'In Care';
			case 'RELEASED':
				return 'Released';
			case 'DECEASED':
				return 'Deceased';
			case 'READY_FOR_RELEASE':
				return 'Ready for Release';
			case 'TRANSFERRED':
				return 'Transferred';
			default:
				return status;
		}
	};

	return (
		<Badge
			variant="outline"
			className={cn(className, {
			  'bg-blue-100 text-blue-800 border-blue-300': status === 'IN_CARE',
			  'bg-green-100 text-green-800 border-green-300': status === 'RELEASED',
			  'bg-gray-100 text-gray-800 border-gray-300': status === 'DECEASED',
			  'bg-yellow-100 text-yellow-800 border-yellow-300': status === 'READY_FOR_RELEASE',
			  'bg-purple-100 text-purple-800 border-purple-300': status === 'TRANSFERRED',
			})}
		  >
			{getStatusLabel(status)}
		</Badge>
	)
}
