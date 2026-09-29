import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumTermPolicyType,
    EnumTermPolicyStatus,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import { TermPolicyAlreadyAcceptedException } from '@modules/term-policy/exceptions/term-policy.already-accepted.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyRequiredInvalidException } from '@modules/term-policy/exceptions/term-policy.required-invalid.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import type { ITermPolicyUserAcceptance } from '@modules/term-policy/interfaces/term-policy.interface';
import { UserDomain } from '@modules/user/domains/user.domain';
import type { IUser } from '@modules/user/interfaces/user.interface';
import {
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';

describe('TermPolicyAcceptanceDomain', () => {
    const termPolicyRepository: MockProxy<TermPolicyRepository> =
        mock<TermPolicyRepository>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();

    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const tx = {} as IDatabaseTransactionClient;

    const buildUser = (termPolicy: Partial<IUser['termPolicy']>): IUser => ({
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
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: false,
            ...termPolicy,
        },
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
    });

    const termPolicy: TermPolicy = {
        id: 'term-policy-1',
        type: EnumTermPolicyType.privacy,
        contents: [],
        version: 1,
        status: EnumTermPolicyStatus.published,
        publishedAt: timestamp,
        createdAt: timestamp,
        createdBy: null,
        updatedAt: timestamp,
        updatedBy: null,
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
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: UserDomain, useValue: userDomain },
            ],
        }).compile();

        domain = module.get(TermPolicyAcceptanceDomain);
    });

    describe('validateTermPolicyGuard', () => {
        it('throws AuthJwtAccessTokenInvalidException when no user is present', async () => {
            const promise = domain.validateTermPolicyGuard(null, []);

            await expect(promise).rejects.toBeInstanceOf(
                AuthJwtAccessTokenInvalidException
            );
            await expect(promise).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.jwtAccessTokenInvalid
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'auth.error.accessTokenUnauthorized',
            });
        });

        it('defaults to terms-of-service and privacy when no required types are given', async () => {
            const user = buildUser({
                termsOfService: true,
                privacy: false,
            });

            const promise = domain.validateTermPolicyGuard(user, []);

            await expect(promise).rejects.toBeInstanceOf(
                TermPolicyRequiredInvalidException
            );
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

        it('throws TermPolicyRequiredInvalidException when a named required type is not accepted', async () => {
            const user = buildUser({ marketing: false });

            const promise = domain.validateTermPolicyGuard(user, [
                EnumTermPolicyType.marketing,
            ]);

            await expect(promise).rejects.toBeInstanceOf(
                TermPolicyRequiredInvalidException
            );
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

        it('resolves when every required type is accepted', async () => {
            const user = buildUser({ cookies: true });

            await expect(
                domain.validateTermPolicyGuard(user, [
                    EnumTermPolicyType.cookies,
                ])
            ).resolves.toBeUndefined();
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
        it('accepts every published type found and skips a type with no published policy', async () => {
            termPolicyRepository.findPublishedByTypesInTx.mockResolvedValue([
                termPolicy,
            ]);

            await domain.acceptPublishedInTx(
                tx,
                'user-1',
                [EnumTermPolicyType.privacy, EnumTermPolicyType.marketing],
                'user-1'
            );

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
        const user = buildUser({});

        it('throws TermPolicyNotFoundException when no published policy of the type exists', async () => {
            termPolicyRepository.findLatestPublishedByType.mockResolvedValue(
                null
            );

            const promise = domain.userAccept(user, EnumTermPolicyType.privacy);

            await expect(promise).rejects.toBeInstanceOf(
                TermPolicyNotFoundException
            );
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
        });

        it('throws TermPolicyAlreadyAcceptedException when the user already accepted the policy', async () => {
            termPolicyRepository.findLatestPublishedByType.mockResolvedValue(
                termPolicy
            );
            termPolicyRepository.existsAcceptanceByPolicyAndUser.mockResolvedValue(
                true
            );

            const promise = domain.userAccept(user, EnumTermPolicyType.privacy);

            await expect(promise).rejects.toBeInstanceOf(
                TermPolicyAlreadyAcceptedException
            );
            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.alreadyAccepted,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.alreadyAccepted
                    ],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'termPolicy.error.alreadyAccepted',
            });
        });

        it('accepts the policy, stages the activity log, and queues the notification', async () => {
            termPolicyRepository.findLatestPublishedByType.mockResolvedValue(
                termPolicy
            );
            termPolicyRepository.existsAcceptanceByPolicyAndUser.mockResolvedValue(
                false
            );
            const preparedEvent: IActivityLogStagedEvent = {
                action: EnumActivityLogAction.userAcceptTermPolicy,
                metadata: {},
                onError: false,
            };
            activityLogDomain.prepare.mockReturnValue(preparedEvent);
            databaseService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );

            await domain.userAccept(user, EnumTermPolicyType.privacy);

            expect(termPolicyRepository.acceptInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                'term-policy-1',
                'user-1',
                timestamp
            );
            expect(userDomain.acceptTermPolicyInTx).toHaveBeenCalledWith(
                tx,
                'user-1',
                EnumTermPolicyType.privacy
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedEvent,
            ]);
            expect(
                notificationQueue.sendUserAcceptTermPolicy
            ).toHaveBeenCalledWith('user-1', {
                termPolicyId: 'term-policy-1',
                type: EnumTermPolicyType.privacy,
                version: 1,
            });
        });

        it('rethrows an AppBaseException raised during acceptance', async () => {
            termPolicyRepository.findLatestPublishedByType.mockResolvedValue(
                termPolicy
            );
            termPolicyRepository.existsAcceptanceByPolicyAndUser.mockResolvedValue(
                false
            );
            const error = new TermPolicyAlreadyAcceptedException();
            databaseService.withTransaction.mockRejectedValue(error);

            const promise = domain.userAccept(user, EnumTermPolicyType.privacy);

            await expect(promise).rejects.toBe(error);
            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.alreadyAccepted,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.alreadyAccepted
                    ],
                httpStatus: HttpStatus.CONFLICT,
                messagePath: 'termPolicy.error.alreadyAccepted',
            });
        });

        it('wraps a non-AppBaseException failure in AppUnknownException', async () => {
            termPolicyRepository.findLatestPublishedByType.mockResolvedValue(
                termPolicy
            );
            termPolicyRepository.existsAcceptanceByPolicyAndUser.mockResolvedValue(
                false
            );
            const rawError = new Error('write failed');
            databaseService.withTransaction.mockRejectedValue(rawError);

            const promise = domain.userAccept(user, EnumTermPolicyType.privacy);

            await expect(promise).rejects.toBeInstanceOf(AppUnknownException);
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
