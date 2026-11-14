import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    buildUser,
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyPublishByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.publish-by-admin.use-case';

describe('TermPolicyPublishByAdminUseCase', () => {
    const termPolicyService: MockProxy<TermPolicyService> =
        mock<TermPolicyService>();
    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const termPolicy: TermPolicy = {
        id: 'term-policy-1',
        type: EnumTermPolicyType.privacy,
        contents: [],
        version: 1,
        status: EnumTermPolicyStatus.draft,
        publishedAt: null,
        createdAt: timestamp,
        createdBy: null,
        updatedAt: timestamp,
        updatedBy: null,
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const userContext = buildUserContext(
        buildUser('admin-1', 'actor@example.com')
    );
    const authContext = buildAuthJwtAccessContext(userContext.user.id);

    let useCase: TermPolicyPublishByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyPublishByAdminUseCase,
                { provide: TermPolicyService, useValue: termPolicyService },
            ],
        }).compile();

        useCase = module.get(TermPolicyPublishByAdminUseCase);
    });

    describe('execute', () => {
        it('publishes the term policy as the admin passing the request context and returns an empty envelope', async () => {
            termPolicyService.publishByAdmin.mockResolvedValue(termPolicy);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1'
            );

            expect(result).toEqual({});
            expect(termPolicyService.publishByAdmin).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1'
            );
        });

        it('rethrows the domain exception', async () => {
            const error = new Error('status invalid');
            termPolicyService.publishByAdmin.mockRejectedValue(error);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
                )
            ).rejects.toBe(error);
        });
    });
});
