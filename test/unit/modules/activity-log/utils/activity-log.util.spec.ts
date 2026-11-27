import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { MessageService } from '@common/message/services/message.service';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { GeoLocation, UserAgent } from '@generated/prisma-client/client';
import { buildActivityLog } from '@test/unit/helpers/test.unit.activity-log.helper';
import { ActivityLogUtil } from '@modules/activity-log/utils/activity-log.util';

describe('ActivityLogUtil', () => {
    const messageService: MockProxy<MessageService> = mock<MessageService>();

    let util: ActivityLogUtil;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ActivityLogUtil,
                { provide: MessageService, useValue: messageService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        util = module.get(ActivityLogUtil);
    });

    describe('getDescription', () => {
        it('resolves the i18n key scoped to the action with metadata properties', () => {
            messageService.setMessage.mockReturnValue('User logged in');
            const metadata = { targetUserId: 'user-1' };

            const result = util.getDescription(
                EnumActivityLogAction.userLoggedInWithCredential,
                metadata
            );

            expect(result).toBe('User logged in');
            expect(messageService.setMessage).toHaveBeenCalledWith(
                `activityLog.${EnumActivityLogAction.userLoggedInWithCredential}`,
                { properties: metadata }
            );
        });

        it('resolves the i18n key with no metadata', () => {
            messageService.setMessage.mockReturnValue('User logged out');

            const result = util.getDescription(
                EnumActivityLogAction.userLoggedOut,
                null
            );

            expect(result).toBe('User logged out');
            expect(messageService.setMessage).toHaveBeenCalledWith(
                `activityLog.${EnumActivityLogAction.userLoggedOut}`,
                {}
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
            messageService.setMessage.mockReturnValue('User logged in');

            const result = util.buildCreateManyUserData(
                'user-1',
                'workspace-1',
                EnumActivityLogAction.userLoggedInWithCredential,
                requestLog,
                metadata
            );

            expect(result).toEqual({
                workspaceId: 'workspace-1',
                apiKeyId: null,
                action: EnumActivityLogAction.userLoggedInWithCredential,
                description: 'User logged in',
                ipAddress: '127.0.0.1',
                userAgent,
                geoLocation,
                metadata,
                createdBy: 'user-1',
            });
        });

        it('builds a row for a null workspace with no metadata', () => {
            const userAgent: UserAgent = {
                ua: null,
                browser: null,
                cpu: { architecture: null },
                device: { type: null, vendor: null, model: null },
                engine: { name: null, version: null },
                os: { name: null, version: null },
            };
            const requestLog: IRequestLog = {
                userAgent,
                ipAddress: null,
                geoLocation: null,
            };
            messageService.setMessage.mockReturnValue('User logged out');

            const result = util.buildCreateManyUserData(
                'user-1',
                null,
                EnumActivityLogAction.userLoggedOut,
                requestLog,
                null
            );

            expect(result).toEqual({
                workspaceId: null,
                apiKeyId: null,
                action: EnumActivityLogAction.userLoggedOut,
                description: 'User logged out',
                ipAddress: null,
                userAgent,
                geoLocation: null,
                createdBy: 'user-1',
            });
        });
    });

    describe('toMaskedList', () => {
        const geoLocation: GeoLocation = {
            latitude: 1,
            longitude: 2,
            country: 'ID',
            region: 'Jakarta',
            city: 'Jakarta',
        };

        it('hides the request details and actorUserId of another actor entry', () => {
            const row = {
                ...buildActivityLog('log-1', 'admin-1'),
                geoLocation,
                metadata: {
                    actorUserId: 'admin-1',
                    targetUserId: 'user-1',
                },
            };

            const [result] = util.toMaskedList([row], 'user-1');

            expect(result).toEqual({
                ...row,
                apiKeyId: null,
                ipAddress: null,
                userAgent: null,
                geoLocation: null,
                createdBy: null,
                metadata: { targetUserId: 'user-1' },
            });
        });

        it('returns an empty list for an empty page', () => {
            expect(util.toMaskedList([], 'user-1')).toEqual([]);
        });

        it('returns the reader own entry unchanged', () => {
            const row = {
                ...buildActivityLog('log-1', 'user-1'),
                metadata: { actorUserId: 'user-1' },
            };

            expect(util.toMaskedList([row], 'user-1')).toEqual([
                { ...row, apiKeyId: null },
            ]);
        });

        it('keeps null metadata null on another actor entry', () => {
            const row = buildActivityLog('log-1', 'admin-1');

            const [result] = util.toMaskedList([row], 'user-1');

            expect(result).toEqual({
                ...row,
                apiKeyId: null,
                ipAddress: null,
                userAgent: null,
                geoLocation: null,
                createdBy: null,
                metadata: null,
            });
        });
    });
});
