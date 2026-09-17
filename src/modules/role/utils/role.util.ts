import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { Injectable } from '@nestjs/common';
import type { Role } from '@generated/prisma-client/client';

@Injectable()
export class RoleUtil {
    mapActivityLogMetadata(role: Role): IActivityLogMetadata {
        return {
            roleId: role.id,
            roleName: role.name,
            roleType: role.type,
            timestamp: role.updatedAt ?? role.createdAt,
        };
    }
}
