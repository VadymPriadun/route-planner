export interface AppEnv {
    port: number;
    jwtSecret: string;
    jwtExpiresInSeconds: number;
    corsOrigin: string;
}

export function loadEnv(): AppEnv {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.length < 32) {
        throw new Error('JWT_SECRET must be set in .env and be at least 32 characters long');
    }
    return {
        port: Number(process.env.API_PORT ?? 4000),
        jwtSecret,
        jwtExpiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 86400),
        corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    };
}