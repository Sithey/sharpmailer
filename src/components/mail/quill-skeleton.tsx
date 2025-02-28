import { Skeleton } from "@/components/ui/skeleton";

export default function QuillSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-10 w-32" />
        <div className="flex space-x-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-80 w-full" />
      
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}