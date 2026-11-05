import { EnumRoleType } from '@generated/prisma-client/client';
import type { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { RoleRank } from '@modules/role/constants/role.constant';
import { Injectable } from '@nestjs/common';
import type { IRole } from '@modules/role/interfaces/role.interface';

@Injectable()
export class RoleUtil {
    mapActivityLogMetadata(role: IRole, timestamp: Date): IActivityLogMetadata {
        return {
            roleId: role.id,
            roleName: role.name,
            roleType: role.type,
            timestamp,
        };
    }

    /** A superAdmin actor outranks every target; any other actor must rank strictly above it. */
    outranks(
        actorRoleType: EnumRoleType,
        targetRoleType: EnumRoleType
    ): boolean {
        return (
            actorRoleType === EnumRoleType.superAdmin ||
            RoleRank[actorRoleType] > RoleRank[targetRoleType]
        );
    }

    changesImmutableType(role: IRole, type: EnumRoleType): boolean {
        return role.isImmutable && role.type !== type;
    }
}
