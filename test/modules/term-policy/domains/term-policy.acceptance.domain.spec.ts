import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    const termPolicyRepository = createMock<TermPolicyRepository>();
    const notificationQueue = createMock<NotificationQueue>();
    const activityLogDomain = createMock<ActivityLogDomain>();
    const databaseService = createMock<DatabaseService>();
    const helperDateService = createMock<HelperDateService>();
    const userDomain = createMock<UserDomain>();

    let service: TermPolicyAcceptanceDomain;

    beforeEach(() => {
        vi.resetAllMocks();
        service = new TermPolicyAcceptanceDomain(
            termPolicyRepository,
            notificationQueue,
            activityLogDomain,
            databaseService,
            helperDateService,
            userDomain
        );
    });

    it('throws when no authenticated user exists', async () => {
        await expect(
            service.validateTermPolicyGuard(null, [])
        ).rejects.toBeInstanceOf(AuthJwtAccessTokenInvalidException);
    });

    it('accepts users who accepted both default policies', async () => {
        await expect(
            service.validateTermPolicyGuard(
                createMock<IUser>({
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
                createMock<IUser>({
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
                createMock<IUser>({
                    termsOfServiceAccepted: false,
                    privacyAccepted: false,
                    cookiesAccepted: true,
                }),
                [EnumTermPolicyType.cookies]
            )
        ).resolves.toBeUndefined();
    });
});
