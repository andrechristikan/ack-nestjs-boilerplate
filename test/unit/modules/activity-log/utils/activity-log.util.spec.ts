import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { MessageService } from '@common/message/services/message.service';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { EnumActivityLogAction } from '@generated/prisma-client/client';
import type { GeoLocation, UserAgent } from '@generated/prisma-client/client';
import { ActivityLogActionContract } from '@modules/activity-log/contracts/activity-log.action.contract';
import { ActivityLogEmptyMetadataSchema } from '@modules/activity-log/dtos/activity-log.empty-metadata.dto';
import {
    EnumActivityLogUser,
    EnumActivityLogWorkspace,
} from '@modules/activity-log/enums/activity-log.enum';
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
                EnumActivityLogAction.userLogout,
                null
            );

            expect(result).toBe('User logged out');
            expect(messageService.setMessage).toHaveBeenCalledWith(
                `activityLog.${EnumActivityLogAction.userLogout}`,
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
                requestLog,
                null
            );

            expect(result).toEqual({
                workspaceId: null,
                action: EnumActivityLogAction.userLogout,
                description: 'User logged out',
                ipAddress: null,
                userAgent: null,
                geoLocation: null,
                createdBy: 'user-1',
            });
        });
    });

    describe('getContract', () => {
        it('returns the contract for a known action', () => {
            const result = util.getContract(
                EnumActivityLogAction.userLoginCredential
            );

            expect(result).toBe(
                ActivityLogActionContract[
                    EnumActivityLogAction.userLoginCredential
                ]
            );
        });

        it('returns null when the action carries no contract', () => {
            const result = util.getContract(
                'notAnAction' as EnumActivityLogAction
            );

            expect(result).toBeNull();
        });
    });

    describe('parseMetadata', () => {
        const contract =
            ActivityLogActionContract[
                EnumActivityLogAction.userLoginCredential
            ];

        it('returns a successful parse when metadata matches the contract', () => {
            const result = util.parseMetadata(contract, {});

            expect(result).toEqual({ success: true, data: {} });
        });

        it('returns the failed parse with the zod error when metadata breaks the contract', () => {
            const expectedError = ActivityLogEmptyMetadataSchema.safeParse({
                unexpected: 'value',
            }).error;

            const result = util.parseMetadata(contract, {
                unexpected: 'value',
            });

            expect(result.success).toBe(false);
            expect(result.error).toEqual(expectedError);
        });
    });

    describe('isTargetOnlyFieldValid', () => {
        it('accepts a target resolution with a value', () => {
            expect(
                util.isTargetOnlyFieldValid(
                    EnumActivityLogUser.target,
                    'user-1'
                )
            ).toBe(true);
        });

        it('rejects a target resolution with no value', () => {
            expect(
                util.isTargetOnlyFieldValid(EnumActivityLogUser.target, null)
            ).toBe(false);
        });

        it('rejects a target resolution with an empty value', () => {
            expect(
                util.isTargetOnlyFieldValid(EnumActivityLogUser.target, '')
            ).toBe(false);
        });

        it('accepts a payload resolution with no value', () => {
            expect(
                util.isTargetOnlyFieldValid(EnumActivityLogUser.payload, null)
            ).toBe(true);
        });

        it('rejects a payload resolution carrying a value', () => {
            expect(
                util.isTargetOnlyFieldValid(
                    EnumActivityLogUser.payload,
                    'user-1'
                )
            ).toBe(false);
        });
    });

    describe('isWorkspaceFieldValid', () => {
        it('accepts a target resolution with a workspaceId', () => {
            expect(
                util.isWorkspaceFieldValid(
                    EnumActivityLogWorkspace.target,
                    'workspace-1'
                )
            ).toBe(true);
        });

        it('rejects a target resolution with no workspaceId', () => {
            expect(
                util.isWorkspaceFieldValid(
                    EnumActivityLogWorkspace.target,
                    null
                )
            ).toBe(false);
        });

        it('accepts a none resolution with a null workspaceId', () => {
            expect(
                util.isWorkspaceFieldValid(EnumActivityLogWorkspace.none, null)
            ).toBe(true);
        });

        it('rejects a none resolution carrying a workspaceId', () => {
            expect(
                util.isWorkspaceFieldValid(
                    EnumActivityLogWorkspace.none,
                    'workspace-1'
                )
            ).toBe(false);
        });

        it('accepts a payload resolution with a null workspaceId', () => {
            expect(
                util.isWorkspaceFieldValid(
                    EnumActivityLogWorkspace.payload,
                    null
                )
            ).toBe(true);
        });

        it('rejects a payload resolution carrying a workspaceId', () => {
            expect(
                util.isWorkspaceFieldValid(
                    EnumActivityLogWorkspace.payload,
                    'workspace-1'
                )
            ).toBe(false);
        });
    });

    describe('resolveUserId', () => {
        it('returns the staged userId for a target resolution', () => {
            expect(
                util.resolveUserId(EnumActivityLogUser.target, 'user-1', null)
            ).toBe('user-1');
        });

        it('returns null for a target resolution with no staged userId', () => {
            expect(
                util.resolveUserId(
                    EnumActivityLogUser.target,
                    null,
                    'payload-user-1'
                )
            ).toBeNull();
        });

        it('returns the payload userId for a payload resolution', () => {
            expect(
                util.resolveUserId(
                    EnumActivityLogUser.payload,
                    null,
                    'payload-user-1'
                )
            ).toBe('payload-user-1');
        });

        it('returns null for a payload resolution with an empty payload userId', () => {
            expect(
                util.resolveUserId(EnumActivityLogUser.payload, null, '')
            ).toBeNull();
        });
    });

    describe('resolveCreatedBy', () => {
        it('returns the staged createdBy for a target resolution', () => {
            expect(
                util.resolveCreatedBy(
                    EnumActivityLogUser.target,
                    'creator-1',
                    'user-1'
                )
            ).toBe('creator-1');
        });

        it('returns null for a target resolution with no staged createdBy', () => {
            expect(
                util.resolveCreatedBy(
                    EnumActivityLogUser.target,
                    null,
                    'user-1'
                )
            ).toBeNull();
        });

        it('returns the resolved userId for a payload resolution', () => {
            expect(
                util.resolveCreatedBy(
                    EnumActivityLogUser.payload,
                    null,
                    'user-1'
                )
            ).toBe('user-1');
        });
    });

    describe('resolveWorkspaceId', () => {
        it('returns null for a none resolution', () => {
            expect(
                util.resolveWorkspaceId(
                    EnumActivityLogWorkspace.none,
                    'workspace-1'
                )
            ).toBeNull();
        });

        it('returns the staged workspaceId for a target resolution', () => {
            expect(
                util.resolveWorkspaceId(
                    EnumActivityLogWorkspace.target,
                    'workspace-1'
                )
            ).toBe('workspace-1');
        });

        it('returns null for a target resolution with an empty staged workspaceId', () => {
            expect(
                util.resolveWorkspaceId(EnumActivityLogWorkspace.target, '')
            ).toBeNull();
        });
    });
});
