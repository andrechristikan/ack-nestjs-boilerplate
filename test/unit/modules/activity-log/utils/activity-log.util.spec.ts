import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { MessageService } from '@common/message/services/message.service';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { GeoLocation, UserAgent } from '@generated/prisma-client/client';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';

describe('ActivityLogUtil', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    let util: ActivityLogUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogUtil,
                { provide: MessageService, useValue: messageService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();

        util = module.get(ActivityLogUtil);
    });

    describe('getDescription', () => {
        it('resolves the i18n key scoped to the action with metadata properties', () => {
            messageService.setMessage.mockReturnValue('User logged in');
            const metadata = { targetUserId: 'user-1' };

            const result = util.getDescription(
                EnumActivityLogAction.userLoginCredential,
                metadata
            );

            expect(result).toBe('User logged in');
            expect(messageService.setMessage).toHaveBeenCalledWith(
                `activityLog.${EnumActivityLogAction.userLoginCredential}`,
                { properties: metadata }
            );
        });

        it('resolves the i18n key with no metadata', () => {
            messageService.setMessage.mockReturnValue('User logged out');

            const result = util.getDescription(
                EnumActivityLogAction.userLogout
            );

            expect(result).toBe('User logged out');
            expect(messageService.setMessage).toHaveBeenCalledWith(
                `activityLog.${EnumActivityLogAction.userLogout}`,
                { properties: undefined }
            );
        });
    });

    describe('buildCreateManyUserData', () => {
        it('builds the create-many-user row from the actor, request log, and metadata', () => {
            const userAgent: UserAgent = {
                ua: 'test-agent',
                browser: null,
                cpu: { architecture: null },
                device: { type: null, vendor: null, model: null },
                engine: { name: null, version: null },
                os: { name: null, version: null },
            };
            const geoLocation: GeoLocation = {
                latitude: 1,
                longitude: 2,
                country: 'US',
                region: 'CA',
                city: 'SF',
            };
            const requestLog: IRequestLog = {
                userAgent,
                ipAddress: '127.0.0.1',
                geoLocation,
            };
            const metadata = { targetUserId: 'user-1' };
            const plainUserAgent = { ua: 'test-agent' };
            const plainGeoLocation = { country: 'US' };
            messageService.setMessage.mockReturnValue('User logged in');
            databaseUtil.toPlainObject.mockReturnValueOnce(plainUserAgent);
            databaseUtil.toPlainObject.mockReturnValueOnce(plainGeoLocation);

            const result = util.buildCreateManyUserData(
                'user-1',
                'workspace-1',
                EnumActivityLogAction.userLoginCredential,
                requestLog,
                metadata
            );

            expect(result).toEqual({
                workspaceId: 'workspace-1',
                action: EnumActivityLogAction.userLoginCredential,
                description: 'User logged in',
                ipAddress: '127.0.0.1',
                userAgent: plainUserAgent,
                geoLocation: plainGeoLocation,
                metadata,
                createdBy: 'user-1',
            });
            expect(databaseUtil.toPlainObject).toHaveBeenNthCalledWith(
                1,
                userAgent
            );
            expect(databaseUtil.toPlainObject).toHaveBeenNthCalledWith(
                2,
                geoLocation
            );
        });

        it('builds a row for a null workspace with no metadata', () => {
            const requestLog: IRequestLog = {
                userAgent: {
                    ua: null,
                    browser: null,
                    cpu: { architecture: null },
                    device: { type: null, vendor: null, model: null },
                    engine: { name: null, version: null },
                    os: { name: null, version: null },
                },
                ipAddress: null,
                geoLocation: null,
            };
            messageService.setMessage.mockReturnValue('User logged out');
            databaseUtil.toPlainObject.mockReturnValue(null);

            const result = util.buildCreateManyUserData(
                'user-1',
                null,
                EnumActivityLogAction.userLogout,
                requestLog
            );

            expect(result).toEqual({
                workspaceId: null,
                action: EnumActivityLogAction.userLogout,
                description: 'User logged out',
                ipAddress: null,
                userAgent: null,
                geoLocation: null,
                metadata: undefined,
                createdBy: 'user-1',
            });
        });
    });

    describe('buildCreateArgs', () => {
        it('wraps buildCreateManyUserData into a create-args data payload', () => {
            const requestLog: IRequestLog = {
                userAgent: {
                    ua: null,
                    browser: null,
                    cpu: { architecture: null },
                    device: { type: null, vendor: null, model: null },
                    engine: { name: null, version: null },
                    os: { name: null, version: null },
                },
                ipAddress: '127.0.0.1',
                geoLocation: null,
            };
            messageService.setMessage.mockReturnValue('Workspace created');
            databaseUtil.toPlainObject.mockReturnValue(null);

            const result = util.buildCreateArgs(
                'user-1',
                'workspace-1',
                EnumActivityLogAction.workspaceCreated,
                requestLog
            );

            expect(result).toEqual({
                data: {
                    userId: 'user-1',
                    workspaceId: 'workspace-1',
                    action: EnumActivityLogAction.workspaceCreated,
                    description: 'Workspace created',
                    ipAddress: '127.0.0.1',
                    userAgent: null,
                    geoLocation: null,
                    metadata: undefined,
                    createdBy: 'user-1',
                },
            });
        });
    });
});
