import { GeoLocation, UserAgent } from '@generated/prisma-client';

export interface IRequestContextService {
    getHostname(): string;
    resolveCity(geoLocation?: GeoLocation): string;
    resolveDevice(userAgent: UserAgent): string;
}
