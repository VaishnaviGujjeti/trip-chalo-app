import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUserId } from "@/modules/auth/session";
import { getTripById } from "@/modules/trips/queries";
import { TripForm } from "@/modules/trips/components/TripForm";
import { updateTripAction } from "@/modules/trips/actions";

export const metadata = { title: "Edit trip · Trip Chalo" };

export default async function EditTripPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const trip = await getTripById(tripId);

  if (!trip) {
    notFound();
  }

  // Avoids showing a form that RLS would reject on submit. updateTripAction
  // does not rely on this: trips_update_owner (0007) is what actually
  // prevents a non-owner from editing.
  const isOwner = (await getCurrentUserId()) === trip.owner_id;

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center">
        <h1 className="text-xl font-semibold text-gray-900">
          Only the owner can edit this trip
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          You&rsquo;re a member of this trip, but editing is limited to the trip owner.
        </p>
        <Link
          href={`/trips/${trip.id}`}
          className="mt-6 inline-block text-sm font-medium text-gray-900 underline"
        >
          Back to trip
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">Edit trip</h1>
      <div className="mt-8">
        <TripForm action={updateTripAction} mode="edit" trip={trip} />
      </div>
    </div>
  );
}