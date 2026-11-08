export type ActivityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RouteRequirements {
    city: string;
    days: number;
    hoursPerDay: number;
    interests: string[];
    activityLevel: ActivityLevel;
}
