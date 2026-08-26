"use client";

import { useActionState } from "react";
import type { TripActionState } from "@/modules/trips/actions";
import type { Trip } from "@/modules/trips/queries";

type TripFormProps = {
  action: (prevState: TripActionState, formData: FormData) => Promise<TripActionState>;
  mode: "create" | "edit";
  trip?: Trip;
};

const initialState: TripActionState = {};

export function TripForm({ action, mode, trip }: TripFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  // On the first render these are the trip's stored values (or blank, when
  // creating). After a rejected submit they are what the user actually typed:
  // React resets an uncontrolled form once the action resolves, so without
  // this the form would silently revert and discard their input.
  const defaults = state.values ?? {
    name: trip?.name ?? "",
    description: trip?.description ?? "",
    startDate: trip?.start_date ?? "",
    endDate: trip?.end_date ?? "",
  };

  return (
    <form action={formAction} aria-describedby={state.error ? "trip-form-error" : undefined} className="space-y-5">
      {mode === "edit" && trip ? (
        <input type="hidden" name="tripId" value={trip.id} />
      ) : null}

      {/* Announced and read before the fields it refers to, rather than after
          them, so the reason for the rejection is encountered first. */}
      {state.error ? (
        <p
          id="trip-form-error"
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Trip name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={200}
          defaultValue={defaults.name}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={defaults.description}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
            Start date
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={defaults.startDate}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
            End date
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={defaults.endDate}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-500 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60"
      >
        {isPending
          ? mode === "create"
            ? "Creating…"
            : "Saving…"
          : mode === "create"
            ? "Create trip"
            : "Save changes"}
      </button>
    </form>
  );
}
