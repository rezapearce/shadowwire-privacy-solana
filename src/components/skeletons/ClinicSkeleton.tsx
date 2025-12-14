import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ClinicSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-teal-200">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-40 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-40 mb-2" />
            <Skeleton className="h-4 w-56" />
          </CardContent>
        </Card>

        <Card className="border-teal-200">
          <CardHeader>
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-36 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-16 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardContent>
        </Card>
      </div>

      {/* Screening Queue Card Skeleton */}
      <Card className="border-teal-200 bg-teal-50/30">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-9 w-16 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>

      {/* QR Code Card Skeleton */}
      <Card className="border-teal-200">
        <CardHeader>
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6">
            <Skeleton className="h-52 w-52 rounded-lg" />
            <Skeleton className="h-4 w-40 mt-4" />
          </div>
        </CardContent>
      </Card>

      {/* Transaction Table Skeleton */}
      <Card className="border-teal-200">
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">
                    <Skeleton className="h-4 w-16" />
                  </th>
                  <th className="text-left py-3 px-4">
                    <Skeleton className="h-4 w-20" />
                  </th>
                  <th className="text-left py-3 px-4">
                    <Skeleton className="h-4 w-20" />
                  </th>
                  <th className="text-left py-3 px-4">
                    <Skeleton className="h-4 w-16" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-48" />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

