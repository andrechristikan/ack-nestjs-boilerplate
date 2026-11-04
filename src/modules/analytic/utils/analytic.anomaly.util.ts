import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import type { IActivityLogIpUserGroup } from '@modules/activity-log/interfaces/activity-log.interface';
import type {
    IAnalyticImpossibleTravel,
    IAnalyticIpGroup,
    IAnalyticLoginTimeAnomaly,
} from '@modules/analytic/interfaces/analytic.interface';
import type { ISessionAnalyticSession } from '@modules/session/interfaces/session.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticAnomalyUtil {
    constructor(
        private readonly helperDateService: HelperDateService,
        private readonly helperNumberService: HelperNumberService
    ) {}

    private distanceKm(
        lat1: number,
        lng1: number,
        lat2: number,
        lng2: number
    ): number {
        const toRad = (degree: number): number => (degree * Math.PI) / 180;
        const earthRadiusKm = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);
        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) *
                Math.cos(toRad(lat2)) *
                Math.sin(dLng / 2) ** 2;

        return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
    }

    findImpossibleTravel(
        sessions: ISessionAnalyticSession[],
        minDistanceKm: number,
        maxDeltaInMs: number
    ): IAnalyticImpossibleTravel[] {
        const byUser = new Map<string, ISessionAnalyticSession[]>();
        for (const session of sessions) {
            const list = byUser.get(session.userId) ?? [];
            list.push(session);
            byUser.set(session.userId, list);
        }

        const flagged: IAnalyticImpossibleTravel[] = [];
        for (const [userId, list] of byUser) {
            for (let i = 1; i < list.length; i++) {
                const prev = list[i - 1]!;
                const curr = list[i]!;
                if (!prev.geoLocation || !curr.geoLocation) {
                    continue;
                }
                const distanceKm = this.distanceKm(
                    prev.geoLocation.latitude,
                    prev.geoLocation.longitude,
                    curr.geoLocation.latitude,
                    curr.geoLocation.longitude
                );
                const deltaMs =
                    curr.createdAt.getTime() - prev.createdAt.getTime();
                if (distanceKm > minDistanceKm && deltaMs < maxDeltaInMs) {
                    flagged.push({
                        userId,
                        fromSessionId: prev.id,
                        toSessionId: curr.id,
                        distanceKm,
                        deltaMs,
                    });
                }
            }
        }

        return flagged;
    }

    groupByIp(pairs: IActivityLogIpUserGroup[]): Map<string, IAnalyticIpGroup> {
        const groups = new Map<string, IAnalyticIpGroup>();
        for (const pair of pairs) {
            const ip = pair.ipAddress ?? 'unknown';
            const group = groups.get(ip) ?? { users: new Set(), count: 0 };
            group.users.add(pair.userId);
            group.count += pair.count;
            groups.set(ip, group);
        }

        return groups;
    }

    findLoginTimeAnomaly(
        userId: string,
        loginDates: Date[],
        thresholdPercent: number
    ): IAnalyticLoginTimeAnomaly | null {
        const hours = loginDates.map(loginDate =>
            this.helperDateService.getHour(loginDate)
        );
        const lastHour = hours[hours.length - 1]!;
        const history = hours.slice(0, -1);
        const histogram = new Array<number>(24).fill(0);
        for (const hour of history) {
            histogram[hour]!++;
        }
        const frequency = this.helperNumberService.percent(
            histogram[lastHour]!,
            history.length
        );
        if (frequency >= thresholdPercent) {
            return null;
        }

        return { userId, lastHour, historicalFrequencyPercent: frequency };
    }
}
