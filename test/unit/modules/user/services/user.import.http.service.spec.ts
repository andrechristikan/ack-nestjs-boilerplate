import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { FileService } from '@common/file/services/file.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { UserDefaultStatus } from '@modules/user/constants/user.list.constant';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { UserImportDomain } from '@modules/user/domains/user.import.domain';
import { OnboardingDomain } from '@modules/onboarding/domains/onboarding.domain';
import { UserImportHttpService } from '@modules/user/services/user.import.http.service';
import type { UserExportRequestDto } from '@modules/user/dtos/request/user.export.request.dto';
import type { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
} from '@modules/user/interfaces/user.interface';

describe('UserImportHttpService', () => {
    const userImportDomain: MockProxy<UserImportDomain> =
        mock<UserImportDomain>();
    const onboardingDomain: MockProxy<OnboardingDomain> =
        mock<OnboardingDomain>();
    const fileService: MockProxy<FileService> = mock<FileService>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const userOnboardingUtil: MockProxy<UserOnboardingUtil> =
        mock<UserOnboardingUtil>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let service: UserImportHttpService;

    const baseUser: IUser = {
        id: 'user-fable',
        name: 'Fable Sterling',
        username: 'fable2sterling',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'fable@example.com',
        roleId: 'role-fable',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.admin,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-fable',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-fable',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserImportHttpService,
                { provide: UserImportDomain, useValue: userImportDomain },
                { provide: OnboardingDomain, useValue: onboardingDomain },
                { provide: FileService, useValue: fileService },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: UserOnboardingUtil, useValue: userOnboardingUtil },
                { provide: NotificationUtil, useValue: notificationUtil },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        service = module.get(UserImportHttpService);
    });

    describe('importByAdmin', () => {
        const password: IAuthPassword = {
            passwordHash: 'hashed',
            passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
            passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
            passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
        };
        const input: IUserCreateWithWorkspaceInput = {
            userId: 'user-fable',
            email: 'fable@example.com',
            name: 'Fable Sterling',
            username: 'fable2sterling',
            countryId: 'country-fable',
            roleId: 'role-fable',
            signUpFrom: EnumUserSignUpFrom.admin,
            signUpWith: EnumUserSignUpWith.credential,
            isVerified: true,
            acceptedTermPolicyTypes: [],
            password,
            passwordHistoryType: EnumPasswordHistoryType.admin,
            verification: null,
            workspaceContext: {
                type: EnumUserSignUpWorkspaceContextType.personal,
                workspaceId: 'workspace-fable',
                slugCandidates: ['w-fable'],
                name: "fable2sterling's Workspace",
            },
            createdBy: 'admin-fable',
        };
        const stageInput = {
            action: EnumActivityLogAction.adminUserImport,
            metadata: { userCount: 1 },
        };
        const activityLog: IActivityLogStaged = {
            action: EnumActivityLogAction.adminUserImport,
            metadata: { userCount: 1 },
            userId: null,
            createdBy: null,
            workspaceId: null,
        };
        const recipient: INotificationRecipient = {
            ...TestRecipient,
            userId: 'user-fable',
        };

        beforeEach(() => {
            onboardingDomain.importByAdmin.mockResolvedValue({
                inputs: [input],
                users: [baseUser],
                passwordHasheds: [password],
                passwordStrings: ['random-password'],
            });
            userOnboardingUtil.buildActivityStages.mockReturnValue([
                stageInput,
            ]);
            activityLogDomain.prepare.mockReturnValue(activityLog);
            notificationUtil.mapRecipient.mockReturnValue(recipient);
            helperDateService.formatToIso
                .mockReturnValueOnce('2026-01-01T00:00:00.000Z')
                .mockReturnValueOnce('2026-06-01T00:00:00.000Z');
        });

        it('delegates the rows to OnboardingDomain, stages the rows, enqueues the bulk welcome, and returns an empty envelope', async () => {
            const rows: UserImportRequestDto[] = [
                {
                    email: 'fable@example.com' as Lowercase<string>,
                    name: 'Fable Sterling',
                    username: 'fable2sterling',
                },
            ];

            const result = await service.importByAdmin(rows, 'admin-fable');

            expect(result).toEqual({});
            expect(onboardingDomain.importByAdmin).toHaveBeenCalledWith(
                [
                    {
                        email: rows[0]!.email,
                        name: rows[0]!.name,
                        username: rows[0]!.username,
                    },
                ],
                'admin-fable'
            );
            expect(userOnboardingUtil.buildActivityStages).toHaveBeenCalledWith(
                EnumUserCreateMode.admin,
                [input],
                [baseUser],
                EnumActivityLogAction.adminUserImport
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith(stageInput);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                baseUser,
                EnumNotificationKind.welcomeByAdmin,
                [],
                []
            );
            expect(
                notificationQueue.sendWelcomeByAdminBulk
            ).toHaveBeenCalledWith(
                [
                    {
                        recipient,
                        data: {
                            password: 'random-password',
                            passwordCreatedAt: '2026-01-01T00:00:00.000Z',
                            passwordExpiredAt: '2026-06-01T00:00:00.000Z',
                        },
                    },
                ],
                'admin-fable'
            );
        });

        it('stages nothing and enqueues nothing when onboarding throws', async () => {
            const failure = new Error('import failed');
            onboardingDomain.importByAdmin.mockRejectedValue(failure);

            await expect(service.importByAdmin([], 'admin-fable')).rejects.toBe(
                failure
            );
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendWelcomeByAdminBulk
            ).not.toHaveBeenCalled();
        });

        it('passes a null name to the domain when a row omits it', async () => {
            const rows: UserImportRequestDto[] = [
                {
                    email: 'fable@example.com' as Lowercase<string>,
                    username: 'fable2sterling',
                },
            ];

            await service.importByAdmin(rows, 'admin-fable');

            expect(onboardingDomain.importByAdmin).toHaveBeenCalledWith(
                [
                    {
                        email: rows[0]!.email,
                        name: null,
                        username: rows[0]!.username,
                    },
                ],
                'admin-fable'
            );
        });
    });

    describe('exportByAdmin', () => {
        const query: UserExportRequestDto = {};

        it('merges every filter into the pagination store and writes a csv', async () => {
            paginationQueryUtil.inEnum.mockReturnValue({
                where: { status: { in: [EnumUserStatus.active] } },
                storeFilter: { status: [EnumUserStatus.active] },
            });
            paginationQueryUtil.equalString
                .mockReturnValueOnce({
                    where: { roleId: { equals: 'role-fable' } },
                    storeFilter: { roleId: 'role-fable' },
                })
                .mockReturnValueOnce({
                    where: { countryId: { equals: 'country-fable' } },
                    storeFilter: { countryId: 'country-fable' },
                });
            const user = {
                ...baseUser,
                photo: {
                    bucket: 'bucket',
                    key: 'photo.png',
                    cdnUrl: null,
                    completedUrl: 'https://cdn.example.com/photo.png',
                    mime: 'image/png',
                    extension: 'png',
                    access: 'public',
                },
            };
            userImportDomain.exportByAdmin.mockResolvedValue([user]);
            fileService.writeCsv.mockReturnValue('csv-content');

            const result = await service.exportByAdmin(query);

            expect(result).toEqual({
                data: 'csv-content',
                extension: EnumFileExtensionDocument.csv,
            });
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                expect.objectContaining({
                    filters: expect.objectContaining({
                        status: [EnumUserStatus.active],
                        roleId: 'role-fable',
                        countryId: 'country-fable',
                    }),
                })
            );
            expect(userImportDomain.exportByAdmin).toHaveBeenCalledWith(
                { status: { in: [EnumUserStatus.active] } },
                { roleId: { equals: 'role-fable' } },
                { countryId: { equals: 'country-fable' } }
            );
            expect(fileService.writeCsv).toHaveBeenCalledWith([
                expect.objectContaining({
                    id: user.id,
                    photo: 'https://cdn.example.com/photo.png',
                    role: user.role.name,
                }),
            ]);
        });

        it('defaults the status filter and a missing photo when no filter or photo applies', async () => {
            paginationQueryUtil.inEnum.mockReturnValue(null);
            paginationQueryUtil.equalString.mockReturnValue(null);
            const user = { ...baseUser, photo: null };
            userImportDomain.exportByAdmin.mockResolvedValue([user]);
            fileService.writeCsv.mockReturnValue('csv-content');

            await service.exportByAdmin(query);

            expect(paginationQueryUtil.inEnum).toHaveBeenCalledWith(
                'status',
                query.status,
                UserDefaultStatus
            );
            expect(userImportDomain.exportByAdmin).toHaveBeenCalledWith(
                null,
                null,
                null
            );
            expect(fileService.writeCsv).toHaveBeenCalledWith([
                expect.objectContaining({ photo: null }),
            ]);
        });
    });
});
