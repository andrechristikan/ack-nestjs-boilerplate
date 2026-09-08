import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { Injectable } from '@nestjs/common';
import { Role } from '@generated/prisma-client';

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
