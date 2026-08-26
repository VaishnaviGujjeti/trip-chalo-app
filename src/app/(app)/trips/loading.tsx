export default function TripsLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
      <div className="mt-8 space-y-3">
        <div className="h-16 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-16 animate-pulse rounded-lg bg-gray-100" />
        <div className="h-16 animate-pulse rounded-lg bg-gray-100" />
      </div>
    </div>
  );
}