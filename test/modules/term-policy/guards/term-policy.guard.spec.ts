import { createMock } from '@golevelup/ts-vitest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { RequestStoreService } from '@common/request/services/request.store.service';
import { TermPolicyRequiredGuardMetaKey } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyGuard } from '@modules/term-policy/guards/term-policy.guard';
import type { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';

describe('TermPolicyGuard', () => {
    const reflector = createMock<Reflector>();
    const termPolicyAcceptanceService =
        createMock<TermPolicyAcceptanceDomain>();
    const requestStoreService = createMock<RequestStoreService>();
    let guard: TermPolicyGuard;

    const user = { id: 'user-id' };

    const createContext = () => createMock<ExecutionContext>();

    beforeEach(() => {
        reflector.get.mockReset();
        termPolicyAcceptanceService.validateTermPolicyGuard.mockReset();
        termPolicyAcceptanceService.validateTermPolicyGuard.mockResolvedValue(
            undefined
        );
        requestStoreService.get.mockReset();
        requestStoreService.get.mockReturnValue(user);

        guard = new TermPolicyGuard(
            reflector,
            termPolicyAcceptanceService,
            requestStoreService
        );
    });

    it('reads the required policies metadata and the stored user, then delegates to the service', async () => {
        reflector.get.mockReturnValue(['termsOfService']);
        const context = createContext();

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(reflector.get).toHaveBeenCalledWith(
            TermPolicyRequiredGuardMetaKey,
            context.getHandler()
        );
        expect(
            termPolicyAcceptanceService.validateTermPolicyGuard
        ).toHaveBeenCalledWith(user, ['termsOfService']);
    });

    it('propagates a rejection from the service without storing a fallback result', async () => {
        reflector.get.mockReturnValue([]);
        termPolicyAcceptanceService.validateTermPolicyGuard.mockRejectedValueOnce(
            new Error('not accepted')
        );
        const context = createContext();

        await expect(guard.canActivate(context)).rejects.toThrow(
            'not accepted'
        );
    });
});
