import { TripForm } from "@/modules/trips/components/TripForm";
import { createTripAction } from "@/modules/trips/actions";

export const metadata = { title: "New trip · Trip Chalo" };

export default function NewTripPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900">New trip</h1>
      <p className="mt-1 text-sm text-gray-500">
        Give your trip a name to get started. You can fill in the rest later.
      </p>
      <div className="mt-8">
        <TripForm action={createTripAction} mode="create" />
      </div>
    </div>
  );
}