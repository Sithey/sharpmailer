import { Skeleton } from "@/components/ui/skeleton";

export default function LeadListSkeleton() {
  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-24" />
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center justify-between bg-muted/20 p-3 rounded-md">
          <div className="flex w-2/3 gap-2">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-5 w-1/3" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        
        {Array(5).fill(null).map((_, index) => (
          <div key={index} className="flex items-center justify-between p-3 border-b">
            <div className="flex w-2/3 gap-4">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-5 w-1/6" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}