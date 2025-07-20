import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getRecordIcon } from './icons';
import type { Record } from '@/lib/types';
import { FileText } from 'lucide-react';

interface RecordTimelineProps {
  records: Record[];
}

export default function RecordTimeline({ records }: RecordTimelineProps) {
  return (
    <Card className="shadow-lg h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Record History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {records.length > 0 ? (
        <ScrollArea className="h-[600px] pr-4">
          <div className="relative pl-6">
            <div className="absolute left-0 top-0 h-full w-0.5 bg-border rounded"></div>
            {records.map((record, index) => (
              <div key={record.id} className="relative mb-8">
                <div className="absolute -left-[31px] top-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-background border-2 border-primary">
                   <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {getRecordIcon(record.type, { className: 'h-5 w-5' })}
                   </div>
                </div>
                <div className="ml-8">
                  <p className="font-semibold text-primary">{record.type}</p>
                  <time className="text-sm text-muted-foreground">
                    {new Date(record.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                  <p className="mt-2 text-foreground">{record.notes}</p>
                  {record.details && (
                     <div className="mt-2 text-sm text-muted-foreground bg-muted p-2 rounded-md">
                        {Object.entries(record.details).map(([key, value]) => (
                            <p key={key}><span className="font-semibold capitalize">{key}:</span> {value}</p>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        ) : (
             <div className="text-center py-8 text-muted-foreground">
                <p>No records found for this animal.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
