import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumActivityLogAction,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    Prisma,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import {
    TermPolicyDefaultAvailableOrderBy,
    TermPolicyDefaultStatus,
    TermPolicyDefaultType,
} from '@modules/term-policy/constants/term-policy.list.constant';
import { TermPolicyDomain } from '@modules/term-policy/domains/term-policy.domain';
import { TermPolicyHttpService } from '@modules/term-policy/services/term-policy.http.service';
import type { TermPolicyAdminListRequestDto } from '@modules/term-policy/dtos/request/term-policy.admin-list.request.dto';
import type { TermPolicyPublicListRequestDto } from '@modules/term-policy/dtos/request/term-policy.public-list.request.dto';
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';

describe('TermPolicyHttpService', () => {
    const termPolicyDomain: MockProxy<TermPolicyDomain> =
        mock<TermPolicyDomain>();
    const paginationQueryUtil: MockProxy<PaginationQueryUtil> =
        mock<PaginationQueryUtil>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const termPolicyUtil: MockProxy<TermPolicyUtil> = mock<TermPolicyUtil>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const offsetPage = {
        type: EnumPaginationType.offset as const,
        count: 1,
        perPage: 20,
        page: 1,
        totalPage: 1,
        hasNext: false,
        hasPrevious: false,
        data: [] as TermPolicy[],
    };
    const cursorPage = {
        type: EnumPaginationType.cursor as const,
        perPage: 20,
        hasNext: false,
        data: [] as TermPolicy[],
    };
    const offsetParams = { skip: 0, limit: 20, orderBy: [] };
    const cursorParams = { limit: 20, orderBy: [] };
    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const termPolicy: TermPolicy = {
        id: 'term-policy-1',
        type: EnumTermPolicyType.privacy,
        contents: [],
        version: 1,
        status: EnumTermPolicyStatus.draft,
        publishedAt: null,
        createdAt: timestamp,
        createdBy: null,
        updatedAt: timestamp,
        updatedBy: null,
    };

    const publishedAt = new Date('2026-01-02T00:00:00.000Z');
    const updatedAt = new Date('2026-01-03T00:00:00.000Z');
    const publishedTermPolicy: TermPolicy = {
        ...termPolicy,
        status: EnumTermPolicyStatus.published,
        publishedAt,
        updatedAt,
    };
    const metadata = {
        termPolicyId: 'term-policy-1',
        termPolicyType: EnumTermPolicyType.privacy,
        termPolicyVersion: 1,
        timestamp,
    };
    const preparedActivityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.adminTermPolicyCreate,
        metadata,
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

    let service: TermPolicyHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(timestamp);
        helperDateService.formatToIso.mockImplementation((date: Date) =>
            date.toISOString()
        );
        databaseUtil.createId.mockReturnValue('term-policy-1');
        termPolicyUtil.mapActivityLogMetadata.mockReturnValue(metadata);
        activityLogDomain.prepare.mockReturnValue(preparedActivityLog);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyHttpService,
                { provide: TermPolicyDomain, useValue: termPolicyDomain },
                {
                    provide: PaginationQueryUtil,
                    useValue: paginationQueryUtil,
                },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
                { provide: TermPolicyUtil, useValue: termPolicyUtil },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        service = module.get(TermPolicyHttpService);
    });

    describe('getListByAdmin', () => {
        const query: TermPolicyAdminListRequestDto = { page: 1, perPage: 20 };

        it('merges type and status filters into the pagination store and returns the domain page', async () => {
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: { filters: { existing: true } },
            });
            paginationQueryUtil.inEnum
                .mockReturnValueOnce({
                    where: { type: { in: TermPolicyDefaultType } },
                    storeFilter: { type: 'privacy' },
                })
                .mockReturnValueOnce({
                    where: { status: { in: TermPolicyDefaultStatus } },
                    storeFilter: { status: 'draft' },
                });
            termPolicyDomain.getListByAdmin.mockResolvedValue(offsetPage);

            const result = await service.getListByAdmin(query);

            expect(result).toEqual(offsetPage);
            expect(paginationQueryUtil.offset).toHaveBeenCalledWith(query, {
                availableOrderBy: TermPolicyDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.inEnum).toHaveBeenNthCalledWith(
                1,
                Prisma.TermPolicyScalarFieldEnum.type,
                query.type,
                TermPolicyDefaultType
            );
            expect(paginationQueryUtil.inEnum).toHaveBeenNthCalledWith(
                2,
                Prisma.TermPolicyScalarFieldEnum.status,
                query.status,
                TermPolicyDefaultStatus
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                {
                    filters: {
                        existing: true,
                        type: 'privacy',
                        status: 'draft',
                    },
                }
            );
            expect(termPolicyDomain.getListByAdmin).toHaveBeenCalledWith(
                offsetParams,
                { type: { in: TermPolicyDefaultType } },
                { status: { in: TermPolicyDefaultStatus } }
            );
        });

        it('merges no extra filter when type and status resolve to undefined', async () => {
            paginationQueryUtil.offset.mockReturnValue({
                params: offsetParams,
                storePatch: {},
            });
            paginationQueryUtil.inEnum.mockReturnValue(null);
            termPolicyDomain.getListByAdmin.mockResolvedValue(offsetPage);

            await service.getListByAdmin(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(termPolicyDomain.getListByAdmin).toHaveBeenCalledWith(
                offsetParams,
                undefined,
                undefined
            );
        });
    });

    describe('getListPublished', () => {
        const query: TermPolicyPublicListRequestDto = { perPage: 20 };

        it('merges the type filter into the pagination store and returns the domain page', async () => {
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: { filters: { existing: true } },
            });
            paginationQueryUtil.inEnum.mockReturnValue({
                where: { type: { in: TermPolicyDefaultType } },
                storeFilter: { type: 'privacy' },
            });
            termPolicyDomain.getListPublished.mockResolvedValue(cursorPage);

            const result = await service.getListPublished(query);

            expect(result).toEqual(cursorPage);
            expect(paginationQueryUtil.cursor).toHaveBeenCalledWith(query, {
                availableOrderBy: TermPolicyDefaultAvailableOrderBy,
            });
            expect(paginationQueryUtil.inEnum).toHaveBeenCalledWith(
                Prisma.TermPolicyScalarFieldEnum.type,
                query.type,
                TermPolicyDefaultType
            );
            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: { existing: true, type: 'privacy' } }
            );
            expect(termPolicyDomain.getListPublished).toHaveBeenCalledWith(
                cursorParams,
                { type: { in: TermPolicyDefaultType } }
            );
        });

        it('merges no extra filter when type resolves to undefined', async () => {
            paginationQueryUtil.cursor.mockReturnValue({
                params: cursorParams,
                storePatch: {},
            });
            paginationQueryUtil.inEnum.mockReturnValue(null);
            termPolicyDomain.getListPublished.mockResolvedValue(cursorPage);

            await service.getListPublished(query);

            expect(requestStoreService.merge).toHaveBeenCalledWith(
                PaginationStoreKey,
                { filters: {} }
            );
            expect(termPolicyDomain.getListPublished).toHaveBeenCalledWith(
                cursorParams,
                undefined
            );
        });
    });

    describe('createByAdmin', () => {
        it('prepares the create activity log before the write and stages it after', async () => {
            const calls: string[] = [];
            const body: TermPolicyCreateRequestDto = {
                type: TermPolicyDefaultType[0]!,
                version: 1,
                contents: [],
            };
            activityLogDomain.prepare.mockImplementation(() => {
                calls.push('prepare');

                return preparedActivityLog;
            });
            termPolicyDomain.createByAdmin.mockImplementation(async () => {
                calls.push('create');

                return termPolicy;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });

            const result = await service.createByAdmin(body);

            expect(result).toEqual({ data: termPolicy });
            expect(calls).toEqual(['prepare', 'create', 'stage']);
            expect(termPolicyDomain.createByAdmin).toHaveBeenCalledWith(
                'term-policy-1',
                body
            );
            expect(termPolicyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                { id: 'term-policy-1', type: body.type, version: 1 },
                timestamp
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminTermPolicyCreate,
                metadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedActivityLog,
            ]);
        });

        it('stages nothing when the domain rejects', async () => {
            const error = new Error('create failed');
            termPolicyDomain.createByAdmin.mockRejectedValue(error);

            const promise = service.createByAdmin({
                type: TermPolicyDefaultType[0]!,
                version: 1,
                contents: [],
            });

            await expect(promise).rejects.toBe(error);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('deleteByAdmin', () => {
        it('wraps the deleted term policy and stages the delete activity log', async () => {
            termPolicyDomain.deleteByAdmin.mockResolvedValue(termPolicy);

            const result = await service.deleteByAdmin('term-policy-1');

            expect(result).toEqual({ data: termPolicy });
            expect(termPolicyDomain.deleteByAdmin).toHaveBeenCalledWith(
                'term-policy-1'
            );
            expect(termPolicyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                termPolicy,
                timestamp
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminTermPolicyDelete,
                metadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedActivityLog,
            ]);
        });

        it('stages nothing when the domain rejects', async () => {
            const error = new TermPolicyNotFoundException();
            termPolicyDomain.deleteByAdmin.mockRejectedValue(error);

            await expect(service.deleteByAdmin('term-policy-1')).rejects.toBe(
                error
            );
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('publishByAdmin', () => {
        it('stages the publish activity log from the published row, then enqueues the notification', async () => {
            const calls: string[] = [];
            termPolicyDomain.publishByAdmin.mockResolvedValue(
                publishedTermPolicy
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });
            notificationQueue.sendPublishTermPolicy.mockImplementation(
                async () => {
                    calls.push('enqueue');
                }
            );

            const result = await service.publishByAdmin(
                'term-policy-1',
                'user-1'
            );

            expect(result).toEqual({});
            expect(calls).toEqual(['stage', 'enqueue']);
            expect(termPolicyDomain.publishByAdmin).toHaveBeenCalledWith(
                'term-policy-1'
            );
            expect(termPolicyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                publishedTermPolicy,
                updatedAt
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminTermPolicyPublish,
                metadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedActivityLog,
            ]);
            expect(
                notificationQueue.sendPublishTermPolicy
            ).toHaveBeenCalledWith(
                {
                    termPolicyId: 'term-policy-1',
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                    recipientCutoffAt: publishedAt.toISOString(),
                    resendNonce: null,
                },
                'user-1'
            );
        });

        it('stages and enqueues nothing when the domain rejects', async () => {
            const error = new TermPolicyNotFoundException();
            termPolicyDomain.publishByAdmin.mockRejectedValue(error);

            await expect(
                service.publishByAdmin('term-policy-1', 'user-1')
            ).rejects.toBe(error);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendPublishTermPolicy
            ).not.toHaveBeenCalled();
        });
    });

    describe('resendEmailByAdmin', () => {
        it('enqueues the resend for a published policy, then stages the activity log once', async () => {
            const calls: string[] = [];
            termPolicyDomain.getPublishedByAdmin.mockResolvedValue(
                publishedTermPolicy
            );
            notificationQueue.sendResendPublishTermPolicy.mockImplementation(
                async () => {
                    calls.push('enqueue');
                }
            );
            activityLogDomain.stagePrepared.mockImplementation(() => {
                calls.push('stage');
            });

            const result = await service.resendEmailByAdmin(
                'term-policy-1',
                'user-1'
            );

            expect(result).toEqual({});
            expect(calls).toEqual(['enqueue', 'stage']);
            expect(
                notificationQueue.sendResendPublishTermPolicy
            ).toHaveBeenCalledWith(
                {
                    termPolicyId: 'term-policy-1',
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                    recipientCutoffAt: publishedAt.toISOString(),
                },
                'user-1'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminTermPolicyResendEmail,
                metadata,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledTimes(1);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedActivityLog,
            ]);
        });

        it('lets an enqueue failure propagate unchanged and stages nothing', async () => {
            termPolicyDomain.getPublishedByAdmin.mockResolvedValue(
                publishedTermPolicy
            );
            const cause = new Error('redis down');
            notificationQueue.sendResendPublishTermPolicy.mockRejectedValue(
                cause
            );

            await expect(
                service.resendEmailByAdmin('term-policy-1', 'user-1')
            ).rejects.toBe(cause);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException raised by the enqueue unchanged without staging', async () => {
            termPolicyDomain.getPublishedByAdmin.mockResolvedValue(
                publishedTermPolicy
            );
            const error = new TermPolicyNotFoundException();
            notificationQueue.sendResendPublishTermPolicy.mockRejectedValue(
                error
            );

            await expect(
                service.resendEmailByAdmin('term-policy-1', 'user-1')
            ).rejects.toBe(error);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('enqueues nothing when the term policy is not published', async () => {
            const error = new TermPolicyNotFoundException();
            termPolicyDomain.getPublishedByAdmin.mockRejectedValue(error);

            await expect(
                service.resendEmailByAdmin('term-policy-1', 'user-1')
            ).rejects.toBe(error);
            expect(
                notificationQueue.sendResendPublishTermPolicy
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });
});
