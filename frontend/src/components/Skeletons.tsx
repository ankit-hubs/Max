import { Card, CardContent } from "@/components/ui/card";

export function ChatSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2].map((i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
        >
          <div className="max-w-[85%] rounded-3xl px-5 py-4 bg-muted/50">
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
              <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="h-4 w-64 bg-muted rounded animate-pulse" />
      <div className="h-4 w-56 bg-muted rounded animate-pulse" />
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
        >
          <div className="h-4 w-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded flex-1 animate-pulse" />
        </div>
      ))}
    </div>
  );
}
