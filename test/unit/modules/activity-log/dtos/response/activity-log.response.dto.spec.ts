import { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogResponseSchema } from '@modules/activity-log/dtos/response/activity-log.response.dto';

describe('ActivityLogResponseSchema', () => {
    const createdAt: Date = new Date('2026-01-01T00:00:00.000Z');
    const userAgent = {
        ua: 'test-agent',
        browser: null,
        cpu: { architecture: null },
        device: { type: null, vendor: null, model: null },
        engine: { name: null, version: null },
        os: { name: null, version: null },
    };
    const row = {
        id: 'activity-log-1',
        createdAt,
        createdBy: 'user-1',
        userId: 'user-1',
        user: {
            id: 'user-1',
            createdAt,
            createdBy: 'user-1',
            updatedAt: createdAt,
            updatedBy: 'user-1',
            deletedAt: null,
            deletedBy: null,
            name: 'Jane Doe',
            username: 'jane',
            photo: null,
        },
        action: EnumActivityLogAction.userLoginCredential,
        description: 'User login with credential',
        ipAddress: '127.0.0.1',
        userAgent,
        geoLocation: null,
        metadata: null,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = ActivityLogResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('parses a row with createdBy, userAgent, ipAddress, and geoLocation all null', () => {
        const masked = {
            ...row,
            createdBy: null,
            userAgent: null,
            ipAddress: null,
            geoLocation: null,
        };

        expect(ActivityLogResponseSchema.parse(masked)).toEqual(masked);
    });

    it('strips updatedAt, updatedBy, deletedAt, deletedBy, and an undeclared key', () => {
        const result = ActivityLogResponseSchema.parse({
            ...row,
            updatedAt: createdAt,
            updatedBy: 'user-1',
            deletedAt: createdAt,
            deletedBy: 'user-1',
            secret: 'top-secret',
        });

        expect(result).toEqual(row);
    });

    it('rejects an action outside the enum', () => {
        const result = ActivityLogResponseSchema.safeParse({
            ...row,
            action: 'notAnAction',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ['action'],
                code: 'invalid_value',
            }),
        ]);
    });
});
