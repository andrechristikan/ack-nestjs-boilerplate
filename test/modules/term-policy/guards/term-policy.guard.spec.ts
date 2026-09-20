import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { TermPolicyRequiredGuardMetaKey } from '@modules/term-policy/constants/term-policy.constant';
import { TermPolicyGuard } from '@modules/term-policy/guards/term-policy.guard';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('TermPolicyGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceDomain> =
        mock<TermPolicyAcceptanceDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    let guard: TermPolicyGuard;

    const user = { id: 'user-id' };

    const createContext = (): MockProxy<ExecutionContext> =>
        mock<ExecutionContext>();

    beforeEach(async () => {
        vi.resetAllMocks();
        termPolicyAcceptanceService.validateTermPolicyGuard.mockResolvedValue(
            undefined
        );
        requestStoreService.get.mockReturnValue(user);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyGuard,
                { provide: Reflector, useValue: reflector },
                {
                    provide: TermPolicyAcceptanceDomain,
                    useValue: termPolicyAcceptanceService,
                },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        guard = moduleRef.get(TermPolicyGuard);
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
