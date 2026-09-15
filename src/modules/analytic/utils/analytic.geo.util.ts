import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticGeoUtil {
    distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const toRad = (d: number): number => (d * Math.PI) / 180;
        const r = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) *
                Math.cos(toRad(lat2)) *
                Math.sin(dLng / 2) ** 2;
        return 2 * r * Math.asin(Math.sqrt(a));
    }
}
