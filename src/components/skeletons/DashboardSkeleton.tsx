import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Action Buttons Skeletons */}
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-24 w-full rounded-lg" />

      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Skeleton className="h-9 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>

      {/* Quick Actions Card Skeleton */}
      <Card className="border-teal-200">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-10 w-full sm:w-48" />
            <Skeleton className="h-10 w-full sm:w-24" />
          </div>
        </CardContent>
      </Card>

      {/* Developmental Checkup Card Skeleton */}
      <Card className="border-teal-200">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-40 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Total Family Value Card Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-48 mt-2" />
            </div>
            <Skeleton className="h-9 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-32 mb-4" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </CardContent>
      </Card>

      {/* Approval Center Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-56 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-l-4 border-l-yellow-500">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-9 w-20" />
                      <Skeleton className="h-9 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-52 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

