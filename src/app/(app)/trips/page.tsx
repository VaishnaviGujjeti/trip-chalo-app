import Link from "next/link";
import { listMyTrips } from "@/modules/trips/queries";
import { formatTripDateRange } from "@/modules/trips/format";

export const metadata = { title: "Your trips · Trip Chalo" };

export default async function TripsPage() {
  const trips = await listMyTrips();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Your trips</h1>
        <Link
          href="/trips/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          New trip
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-600">You don&rsquo;t have any trips yet.</p>
          <Link
            href="/trips/new"
            className="mt-4 inline-block text-sm font-medium text-gray-900 underline"
          >
            Create your first trip
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-gray-200 rounded-lg border border-gray-200">
          {trips.map((trip) => (
            <li key={trip.id}>
              <Link
                href={`/trips/${trip.id}`}
                className="flex flex-col gap-1 px-4 py-4 hover:bg-gray-50"
              >
                <span className="font-medium text-gray-900">{trip.name}</span>
                <span className="text-sm text-gray-500">
                  {formatTripDateRange(trip.start_date, trip.end_date)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}