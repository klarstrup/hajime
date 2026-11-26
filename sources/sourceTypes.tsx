/* eslint-disable @typescript-eslint/no-namespace */

import { TZDate } from "@date-fns/tz";

export interface LoadParams {
  cotemporality: "past" | "future";
  now: Date | TZDate;
}

export enum CMS {
  Klubmodul = "Klubmodul",
  ForeningLet = "ForeningLet",
  Mentoclub = "Mentoclub",
  Holdsport = "Holdsport",
  Zakobo = "Zakobo",
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type HajimeMeta = {
  _h_source: string;
  _h_url: string;
};
export namespace SquareSpace {
  export interface GetItemsByMonthEvent {
    recordType: number;
    structuredContent: StructuredContent;
    addedOn: number;
    title: string;
    fullUrl: string;
    assetUrl: string;
    excerpt: string;
    location: Location | null;
    systemDataId?: string;
    originalSize?: string;
  }

  export interface Location {
    addressTitle: string;
    addressLine1: string;
    addressLine2: string;
    addressCountry: AddressCountry;
  }

  export enum AddressCountry {
    Denmark = "Denmark",
    Empty = "",
    Letland = "Letland",
    Polen = "Polen",
    Svendborg = "Svendborg",
  }

  export interface StructuredContent {
    startDate: Date;
    endDate: Date;
  }
}

export interface AllEventsResponse {
  error: number;
  message: string;
  request: Request;
  data: Datum[];
  count: number;
}

export interface Datum {
  event_id: string;
  eventname: string;
  eventname_raw: string;
  thumb_url: string;
  thumb_url_large: null;
  banner_url: string;
  start_time: number;
  start_time_display: string;
  end_time: number;
  end_time_display: string;
  location: string;
  venue: Venue;
  label: Label;
  event_url: string;
  share_url: string;
  origin_url: string;
  ticket_url: null | string;
  buy_ticket: number;
  categories: string[];
  tags: string[];
  rsvp_status: number;
  params: ParamsUnion;
  tickets: Tickets;
  organizer: Organizer;
  display_time_label: string;
  display_month: string;
  display_day: number;
  app_display_time: string;
  sort_time: number;
  id: null;
  timezone?: string;
  app_display_time_past?: string;
}

export enum Label {
  Empty = "",
  Upcoming = "Upcoming",
}

export interface Organizer {
  org_id: number;
  username: string;
  is_verified: number;
  name: string;
  org_review: OrgReview;
}

export interface OrgReview {
  rating: number;
  count: number;
}

export type ParamsUnion = unknown[] | ParamsClass | number;

export interface ParamsClass {
  total_interested_count?: number;
  x_categories?: string[];
  xscore_categories?: number[];
}

export interface Tickets {
  has_tickets: boolean;
  ticket_url: string;
}

export interface Venue {
  street: string;
  city: string;
  state: string;
  country: string;
  latitude: string;
  longitude: string;
  full_address: string;
}

export interface Request {
  organizer_id: string;
  past: number;
  count: number;
  city: number;
  past_events_filter: number;
}

export namespace KlubModul {
  export interface Event {
    id: number;
    title: string;
    start: Date;
    end: Date;
    description: string;
    color: string;
    backgroundColor: string;
    borderColor: string;
    calendarEventTimeID: number;
    hasInvites: boolean;
    classNames: ClassName[];
    location: string;
    meetingPlace: MeetingPlace;
    meetingHour: number;
    linkEvent: string;
    address: string;
    clubName: ClubName;
    startDate: string;
    startHour: string;
    endDate: string;
    endHour: string;
    allDay: boolean;
    isClosingDay: boolean;
  }

  export enum ClassName {
    KMCardX = "km-card-x",
  }

  export enum ClubName {
    KlubModulKøbenhavn = "Karateklubben Kyokushinkai København",
  }

  export enum MeetingPlace {
    Empty = "",
    LilleHoldsal = "Lille Holdsal",
  }
}

export interface HoldsportActivity {
  id: number;
  start: Date;
  title: string;
  end: Date | null;
  color: string;
  event_type: number;
  allDay: boolean;
  tooltip: string;
}

export interface KumiteTechnologyEventsResponse {
  data: Data;
}

export interface Data {
  events: Events;
}

export interface Events {
  edges: Edge[];
}

export interface Edge {
  node: Node;
}

export interface Node {
  id: string;
  entityId: number;
  name: string;
  info: string;
  website: null | string;
  date: Date;
  type: Type;
  cover: null | string;
  isActivated: boolean;
  discipline: Discipline;
  address: Address;
}

export interface Address {
  fullAddress: string;
  countryCode: string;
  region: null | string;
  city: null | string;
  country: Country;
}

export interface Country {
  name: string;
  code: string;
}

export enum Discipline {
  Ashihara = "ASHIHARA",
  Kickboxing = "KICKBOXING",
  Kudo = "KUDO",
  Kyokushin = "KYOKUSHIN",
  Shotokan = "SHOTOKAN",
}

export enum Type {
  Tournament = "TOURNAMENT",
}

export interface FightCollectiveEvent {
  id: string;
  name: string;
  subtitle: string;
  venue: string;
  date: string;
  time: string;
  address: string;
  registered_count: number;
  max_capacity: number;
  telegram_bot_link: null;
  telegram_community_link: null;
  is_active: boolean;
  created_at: Date;
  announcement_message_id: null | string;
  media_notification_message_id: null | string;
  event_type: string;
  price_dkk: number;
  description: string;
  format_bullets: string[];
  hero_photos: string[] | null;
  cta_label: null | string;
  cta_url: null | string;
  end_date: null;
  reserved_count: number;
  instructor: null | string;
  featured: boolean;
  post_signup_message: null;
  pay_mobilepay: null;
  pay_bank: null | string;
  recap_notes: null;
  content_thread_id: null | string;
  content_topic_link: null | string;
  content_file_count: number;
  content_announced_at: Date | null;
  slug: string;
  confirmed_count: number;
  waitlist_count: number;
  is_full?: boolean;
}

export namespace Mentoclub {
  export interface GettrainingsTraining {
    id: number;
    title: string;
    start: string;
    end: string;
    color: string;
    teamid: number;
    classNames: ClassNames;
    tip: string;
    theme: string;
    ident: null | string;
  }

  enum ClassNames {
    CursorPointer = "cursor-pointer",
    Empty = "",
  }
}
