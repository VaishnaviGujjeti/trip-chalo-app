import Link from "next/link";

export default function TripNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-center">
      <h1 className="text-xl font-semibold text-gray-900">Trip not found</h1>
      <p className="mt-2 text-sm text-gray-500">
        This trip doesn&rsquo;t exist, or you don&rsquo;t have access to it.
      </p>
      <Link
        href="/trips"
        className="mt-6 inline-block text-sm font-medium text-gray-900 underline"
      >
        Back to your trips
      </Link>
    </div>
  );
}