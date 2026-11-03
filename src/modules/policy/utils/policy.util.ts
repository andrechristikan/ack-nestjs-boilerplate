import type { Policy } from '@generated/prisma-client/client';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PolicyUtil {
    mapActivityLogMetadata(policy: Policy): IActivityLogMetadata {
        return {
            roleId: policy.roleId,
            subject: policy.subject,
            action: policy.action.join(','),
        };
    }
}
