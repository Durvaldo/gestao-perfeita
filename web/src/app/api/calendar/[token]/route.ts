import { calendarFeedRoutes } from "@/server/calendar/calendar-feed";

// The URL ends in ".ics": /api/calendar/{token}.ics
export const { GET } = calendarFeedRoutes.feed;
