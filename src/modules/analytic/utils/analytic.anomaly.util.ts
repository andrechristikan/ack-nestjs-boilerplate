import type { IActivityLogIpUserGroup } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IAnalyticIpGroup } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AnalyticAnomalyUtil {
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
}
