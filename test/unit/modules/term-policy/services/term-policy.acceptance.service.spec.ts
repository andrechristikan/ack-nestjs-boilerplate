import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import {
    DatabaseUniqueConstraintCode,
    DatabaseWriteConflictCode,
} from '@common/database/constants/database.constant';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import {
    EnumActivityLogAction,
    EnumTermPolicyType,
    Prisma,
} from '@generated/prisma-client/client';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { TermPolicyAlreadyAcceptedException } from '@modules/term-policy/exceptions/term-policy.already-accepted.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import type {
    ITermPolicyRef,
    ITermPolicyRefAcceptance,
    ITermPolicyUserAcceptance,
} from '@modules/term-policy/interfaces/term-policy.interface';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('TermPolicyAcceptanceService', () => {
    const termPolicyRepository: MockProxy<TermPolicyRepository> =
        mock<TermPolicyRepository>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const requestContext: IRequestContext = {
        requestLog: {
            userAgent: {
                ua: null,
                browser: null,
                cpu: null,
                device: null,
                engine: null,
                os: null,
            },
            ipAddress: '127.0.0.1',
            geoLocation: null,
        },
        language: 'en',
    };
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext('user-1');
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: 'entry',
    };

    const notifyEffect: INotificationNotifyEffect = {
        queue: EnumNotificationQueue.notification,
        name: EnumNotificationProcess.notify,
        data: {
            kind: EnumNotificationKind.userAcceptTermPolicy,
            context: {
                userId: 'user-1',
                proceedBy: 'user-1',
                termPolicyId: 'term-policy-1',
                type: EnumTermPolicyType.privacy,
                version: 1,
                snapshot: null,
                verificationId: null,
            },
            recipient: null,
            notificationId: null,
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: 'notify',
    };

    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const tx = {} as IDatabaseTransactionClient;

    let service: TermPolicyAcceptanceService;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(timestamp);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyAcceptanceService,
                {
                    provide: TermPolicyRepository,
                    useValue: termPolicyRepository,
                },
                { provide: OutboxService, useValue: outboxService },
                { provide: NotificationQueue, useValue: notificationQueue },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
            ],
        }).compile();

        service = module.get(TermPolicyAcceptanceService);
    });

    describe('getPendingForUser', () => {
        const privacyV2: ITermPolicyRefAcceptance = {
            id: 'privacy-2',
            type: EnumTermPolicyType.privacy,
            version: 2,
            userAcceptances: [],
        };
        const termsV1: ITermPolicyRefAcceptance = {
            id: 'terms-1',
            type: EnumTermPolicyType.termsOfService,
            version: 1,
            userAcceptances: [{ id: 'acceptance-1' }],
        };

        it('returns only the refs with no acceptance, without the acceptances key, after one repository call with the default types', async () => {
            termPolicyRepository.findLatestPublishedWithAcceptanceByUser.mockResolvedValue(
                [termsV1, privacyV2]
            );

            const result = await service.getPendingForUser('u1', []);

            expect(
                termPolicyRepository.findLatestPublishedWithAcceptanceByUser
            ).toHaveBeenCalledTimes(1);
            expect(
                termPolicyRepository.findLatestPublishedWithAcceptanceByUser
            ).toHaveBeenCalledWith(
                [EnumTermPolicyType.termsOfService, EnumTermPolicyType.privacy],
                'u1'
            );
            expect(result).toEqual([
                {
                    id: 'privacy-2',
                    type: EnumTermPolicyType.privacy,
                    version: 2,
                },
            ]);
            expect(result[0]).not.toHaveProperty('userAcceptances');
        });

        it('passes the required types through when given', async () => {
            termPolicyRepository.findLatestPublishedWithAcceptanceByUser.mockResolvedValue(
                []
            );

            await service.getPendingForUser('u1', [
                EnumTermPolicyType.marketing,
            ]);

            expect(
                termPolicyRepository.findLatestPublishedWithAcceptanceByUser
            ).toHaveBeenCalledWith([EnumTermPolicyType.marketing], 'u1');
        });

        it('returns an empty list when the repository returns none', async () => {
            termPolicyRepository.findLatestPublishedWithAcceptanceByUser.mockResolvedValue(
                []
            );

            await expect(service.getPendingForUser('u1', [])).resolves.toEqual(
                []
            );
        });

        it('returns every ref when none has an acceptance', async () => {
            termPolicyRepository.findLatestPublishedWithAcceptanceByUser.mockResolvedValue(
                [{ ...termsV1, userAcceptances: [] }, privacyV2]
            );

            const result = await service.getPendingForUser('u1', []);

            expect(result).toEqual([
                {
                    id: 'terms-1',
                    type: EnumTermPolicyType.termsOfService,
                    version: 1,
                },
                {
                    id: 'privacy-2',
                    type: EnumTermPolicyType.privacy,
                    version: 2,
                },
            ]);
        });
    });

    describe('validateTermPolicyGuard', () => {
        it('resolves when nothing is pending', async () => {
            termPolicyRepository.findLatestPublishedWithAcceptanceByUser.mockResolvedValue(
                [
                    {
                        id: 'privacy-2',
                        type: EnumTermPolicyType.privacy,
                        version: 2,
                        userAcceptances: [{ id: 'acceptance-1' }],
                    },
                ]
            );

            await expect(
                service.validateTermPolicyGuard('user-1', [])
            ).resolves.toBeUndefined();
        });

        it('throws TermPolicyRequiredInvalidException when a ref is pending', async () => {
            termPolicyRepository.findLatestPublishedWithAcceptanceByUser.mockResolvedValue(
                [
                    {
                        id: 'privacy-2',
                        type: EnumTermPolicyType.privacy,
                        version: 2,
                        userAcceptances: [],
                    },
                ]
            );

            const promise = service.validateTermPolicyGuard('user-1', [
                EnumTermPolicyType.privacy,
            ]);

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.requiredInvalid,
            });
        });
    });

    describe('assertRequiredPublishedInTx', () => {
        it('returns the latest published policy of every required type', async () => {
            const refs: ITermPolicyRef[] = [
                {
                    id: 'terms-1',
                    type: EnumTermPolicyType.termsOfService,
                    version: 1,
                },
                {
                    id: 'privacy-1',
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                },
            ];
            termPolicyRepository.findLatestPublishedByTypesInTx.mockResolvedValue(
                refs
            );

            const result = await service.assertRequiredPublishedInTx(tx, [
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);

            expect(result).toBe(refs);
            expect(
                termPolicyRepository.findLatestPublishedByTypesInTx
            ).toHaveBeenCalledWith(tx, [
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);
        });

        it('throws TermPolicyRequiredNotPublishedException when privacy has no published row', async () => {
            termPolicyRepository.findLatestPublishedByTypesInTx.mockResolvedValue(
                [
                    {
                        id: 'terms-1',
                        type: EnumTermPolicyType.termsOfService,
                        version: 1,
                    },
                ]
            );

            const promise = service.assertRequiredPublishedInTx(tx, [
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.requiredNotPublished,
            });
        });
    });

    describe('getListUserAccepted', () => {
        it('delegates to the repository with the user id and pagination params', async () => {
            const params = {
                limit: 20,
                orderBy: [],
                fingerprint: 'aaaaaaaaaaaaaaaa',
            };
            const page = {
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [] as ITermPolicyUserAcceptance[],
            };
            termPolicyRepository.findUserAccepted.mockResolvedValue(page);

            const result = await service.getListUserAccepted('user-1', params);

            expect(result).toBe(page);
            expect(termPolicyRepository.findUserAccepted).toHaveBeenCalledWith(
                'user-1',
                params
            );
        });
    });

    describe('acceptPublishedManyInTx', () => {
        const privacyRef: ITermPolicyRef = {
            id: 'term-policy-privacy',
            type: EnumTermPolicyType.privacy,
            version: 2,
        };
        const marketingRef: ITermPolicyRef = {
            id: 'term-policy-marketing',
            type: EnumTermPolicyType.marketing,
            version: 1,
        };

        it('writes the acceptance rows of every entry in one repository statement', async () => {
            termPolicyRepository.findLatestPublishedByTypesInTx.mockResolvedValue(
                [privacyRef, marketingRef]
            );

            await service.acceptPublishedManyInTx(tx, [
                {
                    userId: 'user-one',
                    types: [
                        EnumTermPolicyType.privacy,
                        EnumTermPolicyType.marketing,
                    ],
                    createdBy: 'user-one',
                },
                {
                    userId: 'user-two',
                    types: [EnumTermPolicyType.privacy],
                    createdBy: 'admin-id',
                },
            ]);

            expect(
                termPolicyRepository.findLatestPublishedByTypesInTx
            ).toHaveBeenCalledTimes(1);
            expect(
                termPolicyRepository.findLatestPublishedByTypesInTx
            ).toHaveBeenCalledWith(tx, [
                EnumTermPolicyType.privacy,
                EnumTermPolicyType.marketing,
            ]);
            expect(termPolicyRepository.acceptManyInTx).toHaveBeenCalledTimes(
                1
            );
            expect(termPolicyRepository.acceptManyInTx).toHaveBeenCalledWith(
                tx,
                [
                    {
                        userId: 'user-one',
                        termPolicyId: 'term-policy-privacy',
                        createdBy: 'user-one',
                        acceptedAt: timestamp,
                    },
                    {
                        userId: 'user-one',
                        termPolicyId: 'term-policy-marketing',
                        createdBy: 'user-one',
                        acceptedAt: timestamp,
                    },
                    {
                        userId: 'user-two',
                        termPolicyId: 'term-policy-privacy',
                        createdBy: 'admin-id',
                        acceptedAt: timestamp,
                    },
                ]
            );
        });

        it('skips a type with no published policy', async () => {
            termPolicyRepository.findLatestPublishedByTypesInTx.mockResolvedValue(
                [privacyRef]
            );

            await service.acceptPublishedManyInTx(tx, [
                {
                    userId: 'user-one',
                    types: [
                        EnumTermPolicyType.privacy,
                        EnumTermPolicyType.marketing,
                    ],
                    createdBy: 'user-one',
                },
            ]);

            expect(termPolicyRepository.acceptManyInTx).toHaveBeenCalledWith(
                tx,
                [
                    {
                        userId: 'user-one',
                        termPolicyId: 'term-policy-privacy',
                        createdBy: 'user-one',
                        acceptedAt: timestamp,
                    },
                ]
            );
        });

        it('issues no statement for an empty list', async () => {
            await service.acceptPublishedManyInTx(tx, []);

            expect(
                termPolicyRepository.findLatestPublishedByTypesInTx
            ).not.toHaveBeenCalled();
            expect(termPolicyRepository.acceptManyInTx).not.toHaveBeenCalled();
        });
    });

    describe('userAccept', () => {
        const latest: ITermPolicyRef = {
            id: 'term-policy-1',
            type: EnumTermPolicyType.privacy,
            version: 1,
        };

        it('throws TermPolicyNotFoundException when the transaction finds no published policy of the type', async () => {
            termPolicyRepository.findLatestPublishedByTypesInTx.mockResolvedValue(
                []
            );
            outboxService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );

            const promise = service.userAccept(
                requestContext,
                apiKeyContext,
                authContext,
                EnumTermPolicyType.privacy
            );

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.notFound,
            });
            expect(termPolicyRepository.acceptInTx).not.toHaveBeenCalled();
        });

        it('throws TermPolicyAlreadyAcceptedException when the acceptance insert collides on the unique index', async () => {
            const collision = new Prisma.PrismaClientKnownRequestError(
                'unique',
                {
                    code: DatabaseUniqueConstraintCode,
                    clientVersion: 'test',
                    meta: { target: ['termPolicyId'] },
                }
            );
            outboxService.withTransaction.mockRejectedValue(collision);

            const promise = service.userAccept(
                requestContext,
                apiKeyContext,
                authContext,
                EnumTermPolicyType.privacy
            );

            await expect(promise).rejects.toMatchObject({
                constructor: TermPolicyAlreadyAcceptedException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.alreadyAccepted,
            });
        });

        it('throws TermPolicyAlreadyAcceptedException when the transaction hits a write conflict', async () => {
            const conflict = new Prisma.PrismaClientKnownRequestError(
                'conflict',
                { code: DatabaseWriteConflictCode, clientVersion: 'test' }
            );
            outboxService.withTransaction.mockRejectedValue(conflict);

            const promise = service.userAccept(
                requestContext,
                apiKeyContext,
                authContext,
                EnumTermPolicyType.privacy
            );

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',

                constructor: TermPolicyAlreadyAcceptedException,
                statusCode: EnumTermPolicyStatusCodeError.alreadyAccepted,
            });
        });

        it('accepts the latest published policy re-read inside the transaction and adds the notification row on the same tx', async () => {
            const effect: INotificationNotifyEffect = {
                ...notifyEffect,
                idempotencyKey: 'effect-key',
            };
            termPolicyRepository.findLatestPublishedByTypesInTx.mockResolvedValue(
                [latest]
            );
            notificationQueue.notify.mockReturnValue(effect);
            outboxService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );

            await service.userAccept(
                requestContext,
                apiKeyContext,
                authContext,
                EnumTermPolicyType.privacy
            );

            expect(
                termPolicyRepository.findLatestPublishedByTypesInTx
            ).toHaveBeenCalledWith(tx, [EnumTermPolicyType.privacy]);
            expect(termPolicyRepository.acceptInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'term-policy-1',
                'user-1',
                timestamp
            );
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.userAcceptTermPolicy,
                {
                    userId: 'user-1',
                    proceedBy: 'user-1',
                    termPolicyId: 'term-policy-1',
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, effect);
            expect(outboxService.addInTx).toHaveBeenCalledAfter(
                termPolicyRepository.acceptInTx
            );
        });

        it('adds the userAcceptTermPolicy entry from the passed context on the same tx', async () => {
            termPolicyRepository.findLatestPublishedByTypesInTx.mockResolvedValue(
                [latest]
            );
            notificationQueue.notify.mockReturnValue(notifyEffect);
            activityLogQueue.recordEffect.mockReturnValue(entryEffect);
            outboxService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );

            await service.userAccept(
                requestContext,
                apiKeyContext,
                authContext,
                EnumTermPolicyType.privacy
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                { action: EnumActivityLogAction.userAcceptTermPolicy }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
        });

        it('wraps a non-AppBaseException failure in AppUnknownException', async () => {
            const rawError = new Error('write failed');
            outboxService.withTransaction.mockRejectedValue(rawError);

            const promise = service.userAccept(
                requestContext,
                apiKeyContext,
                authContext,
                EnumTermPolicyType.privacy
            );

            await expect(promise).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError,
            });
        });
    });
});
