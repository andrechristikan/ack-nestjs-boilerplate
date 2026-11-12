import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    buildRequestContextUser,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyDeleteByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.delete-by-admin.use-case';

describe('TermPolicyDeleteByAdminUseCase', () => {
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
    const context = buildRequestContextUser(
        buildUser('admin-1', 'actor@example.com')
    );

    let useCase: TermPolicyDeleteByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyDeleteByAdminUseCase,
                { provide: TermPolicyService, useValue: termPolicyService },
            ],
        }).compile();

        useCase = module.get(TermPolicyDeleteByAdminUseCase);
    });

    describe('execute', () => {
        it('deletes the term policy passing the request context and returns it', async () => {
            termPolicyService.deleteByAdmin.mockResolvedValue(termPolicy);

            const result = await useCase.execute(context, 'term-policy-1');

            expect(result).toEqual({ data: termPolicy });
            expect(termPolicyService.deleteByAdmin).toHaveBeenCalledWith(
                context.snapshot,
                'term-policy-1'
            );
        });

        it('rethrows the domain exception', async () => {
            const error = new Error('not a draft');
            termPolicyService.deleteByAdmin.mockRejectedValue(error);

            await expect(
                useCase.execute(context, 'term-policy-1')
            ).rejects.toBe(error);
        });
    });
});
