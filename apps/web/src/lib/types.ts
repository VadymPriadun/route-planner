export type ActivityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Requirements {
  city: string;
  days: number;
  hoursPerDay: number;
  activityLevel: ActivityLevel;
  interests: string[];
}

export interface RouteSummary {
  id: string;
  city: string;
  days: number;
  hoursPerDay: number;
  activityLevel: ActivityLevel;
  interests: string[];
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  algorithm: string | null;
  totalDistanceM: number | null;
  requestText: string | null;
  createdAt: string;
  savedBy2optM: number | null;
}

export interface RoutePointDto {
  id: string;
  order: number;
  arrivalTime: string | null;
  visitMinutes: number;
  note: string | null;
  poi: {
    id: string;
    name: string;
    category: string;
    lat: number;
    lon: number;
    address: string | null;
    website: string | null;
  };
  outsideMin: number | null;
  insideMin: number | null;
  enterable: boolean;
  inside: boolean;
}

export interface RouteDayDto {
  id: string;
  dayNumber: number;
  distanceM: number | null;
  durationMin: number | null;
  points: RoutePointDto[];
}

export interface RouteDto extends RouteSummary {
  routeDays: RouteDayDto[];
}

export interface NearbyPoi {
  id: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  distanceM: number;
}
