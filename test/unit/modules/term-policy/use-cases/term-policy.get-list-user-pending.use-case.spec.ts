import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { TermPolicyGetListUserPendingUseCase } from '@modules/term-policy/use-cases/term-policy.get-list-user-pending.use-case';
import type { ITermPolicyRef } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyDefaultRequiredTypes } from '@modules/term-policy/constants/term-policy.constant';

describe('TermPolicyGetListUserPendingUseCase', () => {
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceService> =
        mock<TermPolicyAcceptanceService>();

    let useCase: TermPolicyGetListUserPendingUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyGetListUserPendingUseCase,
                {
                    provide: TermPolicyAcceptanceService,
                    useValue: termPolicyAcceptanceService,
                },
            ],
        }).compile();

        useCase = module.get(TermPolicyGetListUserPendingUseCase);
    });

    describe('execute', () => {
        it('passes the default required types and wraps the refs', async () => {
            const termPolicies: ITermPolicyRef[] = [
                {
                    id: 'term-policy-1',
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                },
            ];
            termPolicyAcceptanceService.getPendingForUser.mockResolvedValue(
                termPolicies
            );

            const result = await useCase.execute('user-1');

            expect(result).toEqual({ data: { termPolicies } });
            expect(
                termPolicyAcceptanceService.getPendingForUser
            ).toHaveBeenCalledWith('user-1', TermPolicyDefaultRequiredTypes);
        });
    });
});
