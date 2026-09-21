import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import {
    EnumActivityLogAction,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { TermPolicyRequiredInvalidException } from '@modules/term-policy/exceptions/term-policy.required-invalid.exception';
import { TermPolicyAlreadyAcceptedException } from '@modules/term-policy/exceptions/term-policy.already-accepted.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { UserDomain } from '@modules/user/domains/user.domain';
import type { IUser } from '@modules/user/interfaces/user.interface';

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
    const now = new Date('2026-01-01T00:00:00.000Z');
    const user = mock<IUser>({
        id: 'user-id',
        termsOfServiceAccepted: true,
        privacyAccepted: true,
        cookiesAccepted: false,
    });
    const policy = {
        id: 'policy-id',
        type: EnumTermPolicyType.privacy,
        version: 1,
        status: EnumTermPolicyStatus.published,
        publishedAt: now,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        contents: [],
    };

    let service: TermPolicyAcceptanceDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        helperDateService.create.mockReturnValue(now);
        databaseService.withTransaction.mockImplementation(async callback =>
            callback({} as IDatabaseTransactionClient)
        );
        const moduleRef: TestingModule = await Test.createTestingModule({
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
        service = moduleRef.get(TermPolicyAcceptanceDomain);
    });

    it('throws when no authenticated user exists', async () => {
        await expect(
            service.validateTermPolicyGuard(null, [])
        ).rejects.toBeInstanceOf(AuthJwtAccessTokenInvalidException);
    });

    it('accepts users who accepted both default policies', async () => {
        await expect(
            service.validateTermPolicyGuard(
                mock<IUser>({
                    termsOfServiceAccepted: true,
                    privacyAccepted: true,
                    cookiesAccepted: false,
                }),
                []
            )
        ).resolves.toBeUndefined();
    });

    it('rejects users missing a required default policy', async () => {
        await expect(
            service.validateTermPolicyGuard(
                mock<IUser>({
                    termsOfServiceAccepted: true,
                    privacyAccepted: false,
                    cookiesAccepted: false,
                }),
                []
            )
        ).rejects.toBeInstanceOf(TermPolicyRequiredInvalidException);
    });

    it('checks only explicitly required policy types', async () => {
        await expect(
            service.validateTermPolicyGuard(
                mock<IUser>({
                    termsOfServiceAccepted: false,
                    privacyAccepted: false,
                    cookiesAccepted: true,
                }),
                [EnumTermPolicyType.cookies]
            )
        ).resolves.toBeUndefined();
    });

    it('delegates the accepted-policy list', async () => {
        const pagination = { cursor: null, perPage: 10 } as never;
        const result = { data: [], pagination: {} } as never;
        termPolicyRepository.findUserAccepted.mockResolvedValue(result);

        await expect(
            service.getListUserAccepted(user.id, pagination)
        ).resolves.toBe(result);
    });

    it('accepts every published requested type and skips missing types', async () => {
        const tx = {} as IDatabaseTransactionClient;
        termPolicyRepository.findPublishedByTypesInTx.mockResolvedValue([
            policy,
        ]);

        await service.acceptPublishedInTx(
            tx,
            user.id,
            [EnumTermPolicyType.privacy, EnumTermPolicyType.cookies],
            'creator-id'
        );

        expect(termPolicyRepository.acceptInTx).toHaveBeenCalledOnce();
        expect(termPolicyRepository.acceptInTx).toHaveBeenCalledWith(
            tx,
            user.id,
            policy.id,
            'creator-id',
            now
        );
    });

    it('rejects acceptance when no published policy exists', async () => {
        termPolicyRepository.findLatestPublishedByType.mockResolvedValue(null);

        await expect(
            service.userAccept(user, EnumTermPolicyType.privacy)
        ).rejects.toBeInstanceOf(TermPolicyNotFoundException);
    });

    it('rejects duplicate acceptance', async () => {
        termPolicyRepository.findLatestPublishedByType.mockResolvedValue(
            policy
        );
        termPolicyRepository.existsAcceptanceByPolicyAndUser.mockResolvedValue(
            true
        );

        await expect(
            service.userAccept(user, EnumTermPolicyType.privacy)
        ).rejects.toBeInstanceOf(TermPolicyAlreadyAcceptedException);
    });

    it('accepts a policy in a transaction and sends its notification', async () => {
        const event = mock<ReturnType<ActivityLogDomain['prepare']>>();
        termPolicyRepository.findLatestPublishedByType.mockResolvedValue(
            policy
        );
        termPolicyRepository.existsAcceptanceByPolicyAndUser.mockResolvedValue(
            false
        );
        activityLogDomain.prepare.mockReturnValue(event);

        await expect(
            service.userAccept(user, EnumTermPolicyType.privacy)
        ).resolves.toBeUndefined();

        expect(activityLogDomain.prepare).toHaveBeenCalledWith({
            action: EnumActivityLogAction.userAcceptTermPolicy,
        });
        expect(termPolicyRepository.acceptInTx).toHaveBeenCalledWith(
            expect.anything(),
            user.id,
            policy.id,
            user.id,
            now
        );
        expect(userDomain.acceptTermPolicyInTx).toHaveBeenCalledWith(
            expect.anything(),
            user.id,
            EnumTermPolicyType.privacy
        );
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([event]);
        expect(notificationQueue.sendUserAcceptTermPolicy).toHaveBeenCalledWith(
            user.id,
            {
                termPolicyId: policy.id,
                type: policy.type,
                version: policy.version,
            }
        );
    });

    it('preserves typed failures from the acceptance transaction', async () => {
        termPolicyRepository.findLatestPublishedByType.mockResolvedValue(
            policy
        );
        termPolicyRepository.existsAcceptanceByPolicyAndUser.mockResolvedValue(
            false
        );
        userDomain.acceptTermPolicyInTx.mockRejectedValue(
            new TermPolicyNotFoundException()
        );

        await expect(
            service.userAccept(user, EnumTermPolicyType.privacy)
        ).rejects.toBeInstanceOf(TermPolicyNotFoundException);
    });

    it('wraps unknown acceptance failures', async () => {
        termPolicyRepository.findLatestPublishedByType.mockResolvedValue(
            policy
        );
        termPolicyRepository.existsAcceptanceByPolicyAndUser.mockResolvedValue(
            false
        );
        userDomain.acceptTermPolicyInTx.mockRejectedValue(new Error('failure'));

        await expect(
            service.userAccept(user, EnumTermPolicyType.privacy)
        ).rejects.toBeInstanceOf(AppUnknownException);
    });
});
