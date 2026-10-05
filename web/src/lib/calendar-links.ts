// "Add to Google Calendar" links (SPEC-0006 RF-2a): no integration, the user
// saves the event by hand in their own calendar.

/** 2030-01-10T13:00:00.000Z → "20300110T130000Z" (UTC, the format Google expects). */
function googleDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Google Calendar "create event" page with the event filled in. */
export function googleCalendarUrl(event: { title: string; startsAt: string; endsAt: string; details?: string; location?: string }): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${googleDate(event.startsAt)}/${googleDate(event.endsAt)}`,
  });
  if (event.details) params.set("details", event.details);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
