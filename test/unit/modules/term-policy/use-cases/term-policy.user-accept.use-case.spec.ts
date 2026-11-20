import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { TermPolicyUserAcceptUseCase } from '@modules/term-policy/use-cases/term-policy.user-accept.use-case';
import type { IUser } from '@modules/user/interfaces/user.interface';

describe('TermPolicyUserAcceptUseCase', () => {
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceService> =
        mock<TermPolicyAcceptanceService>();

    const user: IUser = buildUser('user-1', 'andre@example.com');
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext(user.id);

    let useCase: TermPolicyUserAcceptUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyUserAcceptUseCase,
                {
                    provide: TermPolicyAcceptanceService,
                    useValue: termPolicyAcceptanceService,
                },
            ],
        }).compile();

        useCase = module.get(TermPolicyUserAcceptUseCase);
    });

    describe('execute', () => {
        it('accepts the type for the user passing the request context and returns an empty envelope', async () => {
            termPolicyAcceptanceService.userAccept.mockResolvedValue();

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                {
                    type: EnumTermPolicyType.privacy,
                }
            );

            expect(result).toEqual({});
            expect(termPolicyAcceptanceService.userAccept).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                EnumTermPolicyType.privacy
            );
        });

        it('rethrows the domain rejection', async () => {
            const error = new Error('already accepted');
            termPolicyAcceptanceService.userAccept.mockRejectedValue(error);

            await expect(
                useCase.execute(requestContext, apiKeyContext, authContext, {
                    type: EnumTermPolicyType.privacy,
                })
            ).rejects.toBe(error);
        });
    });
});
