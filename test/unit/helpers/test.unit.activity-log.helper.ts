import type { IActivityLog } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';

export function buildActivityLog(
    id: string,
    createdBy: string | null
): IActivityLog {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');

    return {
        id,
        userId: 'user-1',
        workspaceId: null,
        action: EnumActivityLogAction.userLoginCredential,
        description: 'User login with credential',
        ipAddress: '10.0.0.1',
        userAgent: {
            ua: 'test-agent',
            browser: null,
            cpu: { architecture: null },
            device: { type: null, vendor: null, model: null },
            engine: { name: null, version: null },
            os: { name: null, version: null },
        },
        geoLocation: null,
        metadata: null,
        createdAt,
        createdBy,
        user: {
            id: 'user-1',
            name: null,
            username: 'jane',
            photo: null,
            createdAt,
            createdBy: null,
            updatedAt: createdAt,
            updatedBy: null,
            deletedAt: null,
            deletedBy: null,
        },
    };
}
