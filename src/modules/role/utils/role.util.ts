import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { Injectable } from '@nestjs/common';
import type { IRole } from '@modules/role/interfaces/role.interface';

@Injectable()
export class RoleUtil {
    mapActivityLogMetadata(role: IRole, timestamp: Date): IActivityLogMetadata {
        return {
            roleId: role.id,
            roleName: role.name,
            roleKey: role.key,
            roleScope: role.scope,
            timestamp,
        };
    }
}
