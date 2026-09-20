import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { MessageService } from '@common/message/services/message.service';
import { EnumActivityLogAction } from '@generated/prisma-client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';

describe('ActivityLogUtil', () => {
    const messageService = {
        setMessage: vi.fn<MessageService['setMessage']>(),
    } satisfies Pick<MessageService, 'setMessage'>;
    const toPlainObjectMock = vi.fn((_data: unknown): unknown => undefined);
    const databaseUtil = {
        toPlainObject<T, N = T>(data: T): N {
            toPlainObjectMock(data);
            return data as unknown as N;
        },
    } satisfies Pick<DatabaseUtil, 'toPlainObject'>;

    let util: ActivityLogUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogUtil,
                { provide: MessageService, useValue: messageService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();

        util = moduleRef.get(ActivityLogUtil);
    });

    it('resolves descriptions through the message service with metadata properties', () => {
        messageService.setMessage.mockReturnValue('User updated profile');

        expect(
            util.getDescription(EnumActivityLogAction.userUpdateProfile, {
                field: 'name',
            })
        ).toBe('User updated profile');
        expect(messageService.setMessage).toHaveBeenCalledWith(
            'activityLog.userUpdateProfile',
            { properties: { field: 'name' } }
        );
    });

    it('builds create-many user data with plain request objects and optional metadata', () => {
        messageService.setMessage.mockReturnValue('Workspace created');
        const requestLog = {
            ipAddress: '127.0.0.1',
            userAgent: { ua: 'browser' },
            geoLocation: {
                latitude: 1,
                longitude: 2,
                country: 'ID',
                region: 'Jakarta',
                city: 'Jakarta',
            },
        };

        expect(
            util.buildCreateManyUserData(
                'user-id',
                'workspace-id',
                EnumActivityLogAction.workspaceCreated,
                requestLog,
                { workspaceId: 'workspace-id' }
            )
        ).toEqual({
            workspaceId: 'workspace-id',
            action: EnumActivityLogAction.workspaceCreated,
            description: 'Workspace created',
            ipAddress: '127.0.0.1',
            userAgent: requestLog.userAgent,
            geoLocation: requestLog.geoLocation,
            metadata: { workspaceId: 'workspace-id' },
            createdBy: 'user-id',
        });
    });
});
