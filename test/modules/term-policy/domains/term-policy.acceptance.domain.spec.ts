import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { EnumTermPolicyType } from '@generated/prisma-client';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { TermPolicyRequiredInvalidException } from '@modules/term-policy/exceptions/term-policy.required-invalid.exception';
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

    let service: TermPolicyAcceptanceDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
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
});
