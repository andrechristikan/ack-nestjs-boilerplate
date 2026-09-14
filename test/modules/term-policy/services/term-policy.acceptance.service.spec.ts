import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumTermPolicyType } from '@generated/prisma-client';
import { AuthJwtAccessTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-access-token-invalid.exception';
import { TermPolicyRequiredInvalidException } from '@modules/term-policy/exceptions/term-policy.required-invalid.exception';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RequestStoreService } from '@common/request/services/request.store.service';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('TermPolicyAcceptanceService', () => {
    const termPolicyRepository = createMock<TermPolicyRepository>();
    const notificationQueue = createMock<NotificationQueue>();
    const requestStoreService = createMock<RequestStoreService>();

    let service: TermPolicyAcceptanceService;

    beforeEach(() => {
        vi.resetAllMocks();
        service = new TermPolicyAcceptanceService(
            termPolicyRepository,
            notificationQueue,
            requestStoreService
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
