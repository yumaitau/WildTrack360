"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, Calendar, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { useOrganization } from '@clerk/nextjs';

interface Training {
  id: string;
  courseName: string;
  expiryDate: string | null;
  carer: {
    name: string;
  };
}

export function TrainingExpiryAlerts() {
  const { organization } = useOrganization();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrainings = async () => {
      try {
        const orgId = organization?.id || 'default-org';
        const res = await fetch(`/api/carer-training?orgId=${orgId}`);
        if (res.ok) {
          const data = await res.json();
          setTrainings(data);
        }
      } catch (error) {
        console.error('Error fetching trainings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrainings();
  }, [organization]);

  const getExpiringTrainings = () => {
    const now = new Date();
    const thirtyDaysFromNow = addDays(now, 30);
    
    return trainings.filter(training => {
      if (!training.expiryDate) return false;
      const expiry = new Date(training.expiryDate);
      return isBefore(expiry, thirtyDaysFromNow);
    }).sort((a, b) => {
      const dateA = new Date(a.expiryDate!);
      const dateB = new Date(b.expiryDate!);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const expiringTrainings = getExpiringTrainings();
  const expiredCount = expiringTrainings.filter(t => 
    t.expiryDate && isBefore(new Date(t.expiryDate), new Date())
  ).length;
  const expiringSoonCount = expiringTrainings.length - expiredCount;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Training Certificate Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (expiringTrainings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Training Certificate Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-3">All training certificates are up to date.</p>
          <Link href="/compliance/carers/training">
            <Button variant="outline" size="sm" className="w-full">
              <Calendar className="mr-2 h-4 w-4" />
              Manage Training Certificates
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Training Certificate Alerts
          </CardTitle>
          <Link href="/compliance/carers/training">
            <Button variant="ghost" size="sm">
              View All
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          {expiredCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="destructive">{expiredCount} Expired</Badge>
            </div>
          )}
          {expiringSoonCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="warning" className="bg-yellow-500">
                {expiringSoonCount} Expiring Soon
              </Badge>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          {expiringTrainings.slice(0, 5).map(training => {
            const isExpired = training.expiryDate && 
              isBefore(new Date(training.expiryDate), new Date());
            
            return (
              <div
                key={training.id}
                className="flex items-center justify-between p-2 rounded-lg border"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{training.carer.name}</p>
                  <p className="text-xs text-muted-foreground">{training.courseName}</p>
                </div>
                <div className="flex items-center gap-2">
                  {isExpired ? (
                    <Badge variant="destructive" className="text-xs">
                      Expired {format(new Date(training.expiryDate!), 'dd/MM/yyyy')}
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="bg-yellow-500 text-xs">
                      Expires {format(new Date(training.expiryDate!), 'dd/MM/yyyy')}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {expiringTrainings.length > 5 && (
          <p className="text-xs text-muted-foreground mt-2">
            And {expiringTrainings.length - 5} more...
          </p>
        )}
      </CardContent>
    </Card>
  );
}