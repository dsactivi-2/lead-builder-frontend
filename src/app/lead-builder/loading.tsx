export default function LeadBuilderLoading() {
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="animate-pulse">
          <div className="h-[600px] bg-muted rounded-lg" />
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-[400px] bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  )
}
