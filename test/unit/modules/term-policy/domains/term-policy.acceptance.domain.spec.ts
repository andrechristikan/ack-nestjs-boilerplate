import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationRecipientDomain } from '@modules/notification/domains/notification.recipient.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import { Prisma } from '@generated/prisma-client/client';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import { TermPolicyAlreadyAcceptedException } from '@modules/term-policy/exceptions/term-policy.already-accepted.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import type {
    ITermPolicyRef,
    ITermPolicyUserAcceptance,
} from '@modules/term-policy/interfaces/term-policy.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';
import {
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';

describe('TermPolicyAcceptanceDomain', () => {
    const termPolicyRepository: MockProxy<TermPolicyRepository> =
        mock<TermPolicyRepository>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const notificationRecipientDomain: MockProxy<NotificationRecipientDomain> =
        mock<NotificationRecipientDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const tx = {} as IDatabaseTransactionClient;

    const baseUser: IUser = {
        id: 'user-1',
        name: 'Andre Christi',
        username: 'johnSmith123',
        isVerified: true,
        verifiedAt: timestamp,
        email: 'andre@example.com',
        roleId: 'role-1',
        password: 'hashed-password',
        passwordExpired: null,
        passwordCreated: timestamp,
        passwordAttempt: 0,
        signUpAt: timestamp,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-1',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: timestamp,
        createdBy: null,
        updatedAt: timestamp,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-1',
            name: 'User',
            description: null,
            type: EnumRoleType.user,
            createdAt: timestamp,
            createdBy: null,
            updatedAt: timestamp,
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };

    let domain: TermPolicyAcceptanceDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(timestamp);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyAcceptanceDomain,
                {
                    provide: TermPolicyRepository,
                    useValue: termPolicyRepository,
                },
                { provide: NotificationQueue, useValue: notificationQueue },
                {
                    provide: NotificationRecipientDomain,
                    useValue: notificationRecipientDomain,
                },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();

        domain = module.get(TermPolicyAcceptanceDomain);
    });

    describe('getPendingForUser', () => {
        const privacyV2: ITermPolicyRef = {
            id: 'privacy-2',
            type: EnumTermPolicyType.privacy,
            version: 2,
        };
        const termsV1: ITermPolicyRef = {
            id: 'terms-1',
            type: EnumTermPolicyType.termsOfService,
            version: 1,
        };

        it('defaults to terms-of-service and privacy when no required types are given', async () => {
            termPolicyRepository.findLatestPublishedByTypes.mockResolvedValue(
                []
            );

            await domain.getPendingForUser('user-1', []);

            expect(
                termPolicyRepository.findLatestPublishedByTypes
            ).toHaveBeenCalledWith([
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);
        });

        it('returns an empty list and reads no acceptance when no required type is published', async () => {
            termPolicyRepository.findLatestPublishedByTypes.mockResolvedValue(
                []
            );

            const result = await domain.getPendingForUser('user-1', [
                EnumTermPolicyType.marketing,
            ]);

            expect(result).toEqual([]);
            expect(
                termPolicyRepository.findAcceptedTermPolicyIdsByUser
            ).not.toHaveBeenCalled();
        });

        it('returns the latest published policy the user accepted only at an earlier version', async () => {
            termPolicyRepository.findLatestPublishedByTypes.mockResolvedValue([
                termsV1,
                privacyV2,
            ]);
            termPolicyRepository.findAcceptedTermPolicyIdsByUser.mockResolvedValue(
                ['terms-1', 'privacy-1']
            );

            const result = await domain.getPendingForUser('user-1', []);

            expect(
                termPolicyRepository.findAcceptedTermPolicyIdsByUser
            ).toHaveBeenCalledWith('user-1', ['terms-1', 'privacy-2']);
            expect(result).toEqual([privacyV2]);
        });

        it('returns an empty list when the user accepted every latest published policy', async () => {
            termPolicyRepository.findLatestPublishedByTypes.mockResolvedValue([
                termsV1,
                privacyV2,
            ]);
            termPolicyRepository.findAcceptedTermPolicyIdsByUser.mockResolvedValue(
                ['terms-1', 'privacy-2']
            );

            const result = await domain.getPendingForUser('user-1', []);

            expect(result).toEqual([]);
        });
    });

    describe('validateTermPolicyGuard', () => {
        it('resolves when nothing is pending', async () => {
            termPolicyRepository.findLatestPublishedByTypes.mockResolvedValue(
                []
            );

            await expect(
                domain.validateTermPolicyGuard('user-1', [])
            ).resolves.toBeUndefined();
        });

        it('throws TermPolicyRequiredInvalidException when the user accepted only version 1 and version 2 is published', async () => {
            termPolicyRepository.findLatestPublishedByTypes.mockResolvedValue([
                {
                    id: 'privacy-2',
                    type: EnumTermPolicyType.privacy,
                    version: 2,
                },
            ]);
            termPolicyRepository.findAcceptedTermPolicyIdsByUser.mockResolvedValue(
                []
            );

            const promise = domain.validateTermPolicyGuard('user-1', [
                EnumTermPolicyType.privacy,
            ]);

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.requiredInvalid,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.requiredInvalid
                    ],
                httpStatus: HttpStatus.FORBIDDEN,
                messagePath: 'termPolicy.error.requiredInvalid',
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

            const result = await domain.assertRequiredPublishedInTx(tx, [
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

            const promise = domain.assertRequiredPublishedInTx(tx, [
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.requiredNotPublished,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.requiredNotPublished
                    ],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'termPolicy.error.requiredNotPublished',
            });
        });
    });

    describe('getListUserAccepted', () => {
        it('delegates to the repository with the user id and pagination params', async () => {
            const params = { limit: 20, orderBy: [] };
            const page = {
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [] as ITermPolicyUserAcceptance[],
            };
            termPolicyRepository.findUserAccepted.mockResolvedValue(page);

            const result = await domain.getListUserAccepted('user-1', params);

            expect(result).toBe(page);
            expect(termPolicyRepository.findUserAccepted).toHaveBeenCalledWith(
                'user-1',
                params
            );
        });
    });

    describe('acceptPublishedInTx', () => {
        it('writes one acceptance row per latest published type and skips a type with no published policy', async () => {
            termPolicyRepository.findLatestPublishedByTypesInTx.mockResolvedValue(
                [
                    {
                        id: 'term-policy-1',
                        type: EnumTermPolicyType.privacy,
                        version: 2,
                    },
                ]
            );

            await domain.acceptPublishedInTx(
                tx,
                'user-1',
                [EnumTermPolicyType.privacy, EnumTermPolicyType.marketing],
                'user-1'
            );

            expect(
                termPolicyRepository.findLatestPublishedByTypesInTx
            ).toHaveBeenCalledWith(tx, [
                EnumTermPolicyType.privacy,
                EnumTermPolicyType.marketing,
            ]);
            expect(termPolicyRepository.acceptInTx).toHaveBeenCalledTimes(1);
            expect(termPolicyRepository.acceptInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'term-policy-1',
                'user-1',
                timestamp
            );
        });
    });

    describe('userAccept', () => {
        const recipient: INotificationRecipient = {
            ...TestRecipient,
            userId: 'user-1',
        };
        const latest: ITermPolicyRef = {
            id: 'term-policy-1',
            type: EnumTermPolicyType.privacy,
            version: 1,
        };

        const user: IUser = baseUser;

        it('throws TermPolicyNotFoundException when the transaction finds no published policy of the type', async () => {
            termPolicyRepository.findLatestPublishedByTypesInTx.mockResolvedValue(
                []
            );
            notificationRecipientDomain.getRecipient.mockResolvedValue(
                recipient
            );
            databaseService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );

            const promise = domain.userAccept(user, EnumTermPolicyType.privacy);

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.notFound,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.notFound
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'termPolicy.error.notFound',
            });
            expect(termPolicyRepository.acceptInTx).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendUserAcceptTermPolicy
            ).not.toHaveBeenCalled();
        });

        it('throws TermPolicyAlreadyAcceptedException when the acceptance insert collides on the unique index', async () => {
            notificationRecipientDomain.getRecipient.mockResolvedValue(
                recipient
            );
            const collision = new Prisma.PrismaClientKnownRequestError(
                'unique',
                { code: 'P2002', clientVersion: 'test' }
            );
            databaseService.withTransaction.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            const promise = domain.userAccept(user, EnumTermPolicyType.privacy);

            await expect(promise).rejects.toMatchObject({
                constructor: TermPolicyAlreadyAcceptedException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.alreadyAccepted,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.alreadyAccepted
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'termPolicy.error.alreadyAccepted',
            });
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'termPolicyId'
            );
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendUserAcceptTermPolicy
            ).not.toHaveBeenCalled();
        });

        it('throws TermPolicyAlreadyAcceptedException when the transaction hits a write conflict', async () => {
            notificationRecipientDomain.getRecipient.mockResolvedValue(
                recipient
            );
            const conflict = new Error('write conflict');
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            const promise = domain.userAccept(user, EnumTermPolicyType.privacy);

            await expect(promise).rejects.toMatchObject({
                constructor: TermPolicyAlreadyAcceptedException,
                statusCode: EnumTermPolicyStatusCodeError.alreadyAccepted,
                httpStatus: HttpStatus.BAD_REQUEST,
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('commits nothing and stages nothing when the recipient read rejects', async () => {
            databaseService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );
            const error = new Error('recipient-unavailable');
            notificationRecipientDomain.getRecipient.mockRejectedValueOnce(
                error
            );

            const promise = domain.userAccept(user, EnumTermPolicyType.privacy);

            await expect(promise).rejects.toMatchObject({ rawError: error });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(termPolicyRepository.acceptInTx).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendUserAcceptTermPolicy
            ).not.toHaveBeenCalled();
        });

        it('accepts the latest published policy re-read inside the transaction, stages the activity log, and queues the notification', async () => {
            termPolicyRepository.findLatestPublishedByTypesInTx.mockResolvedValue(
                [latest]
            );
            const preparedActivityLog: IActivityLogStaged = {
                action: EnumActivityLogAction.userAcceptTermPolicy,
                metadata: {},
                userId: null,
                createdBy: null,
                workspaceId: null,
            };
            activityLogDomain.prepare.mockReturnValue(preparedActivityLog);
            databaseService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );
            notificationRecipientDomain.getRecipient.mockResolvedValue(
                recipient
            );

            await domain.userAccept(user, EnumTermPolicyType.privacy);

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
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedActivityLog,
            ]);
            expect(
                notificationRecipientDomain.getRecipient
            ).toHaveBeenCalledWith(
                user,
                EnumNotificationKind.userAcceptTermPolicy
            );
            expect(
                notificationQueue.sendUserAcceptTermPolicy
            ).toHaveBeenCalledWith(recipient, {
                termPolicyId: 'term-policy-1',
                type: EnumTermPolicyType.privacy,
                version: 1,
            });
        });

        it('wraps a non-AppBaseException failure in AppUnknownException', async () => {
            notificationRecipientDomain.getRecipient.mockResolvedValue(
                recipient
            );
            const rawError = new Error('write failed');
            databaseService.withTransaction.mockRejectedValue(rawError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            databaseUtil.toException.mockReturnValue(null);

            const promise = domain.userAccept(user, EnumTermPolicyType.privacy);

            await expect(promise).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'http.serverError.internalServerError',
                rawError,
            });
        });
    });
});
