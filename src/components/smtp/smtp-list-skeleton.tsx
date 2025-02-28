import { Skeleton } from "@/components/ui/skeleton";

export default function SMTPListSkeleton() {
  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-24" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(3).fill(null).map((_, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-2/5" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </div>
            
            <div className="space-y-2 pt-2">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-5 w-1/3" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-5 w-1/4" />
                <Skeleton className="h-5 w-1/4" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-5 w-1/5" />
                <Skeleton className="h-5 w-1/5" />
              </div>
            </div>
            
            <Skeleton className="h-8 w-full mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}