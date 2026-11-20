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
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import type { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import { TermPolicyAddContentByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.add-content-by-admin.use-case';

describe('TermPolicyAddContentByAdminUseCase', () => {
    const termPolicyContentService: MockProxy<TermPolicyContentService> =
        mock<TermPolicyContentService>();
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
    const body: TermPolicyContentRequestDto = {
        language: EnumMessageLanguage.en,
        size: 1024,
        key: 'term-policies/privacy/1/en.hbs',
    };

    let useCase: TermPolicyAddContentByAdminUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyAddContentByAdminUseCase,
                {
                    provide: TermPolicyContentService,
                    useValue: termPolicyContentService,
                },
            ],
        }).compile();

        useCase = module.get(TermPolicyAddContentByAdminUseCase);
    });

    describe('execute', () => {
        it('passes the request context to the content service and returns an empty envelope', async () => {
            termPolicyContentService.addContentByAdmin.mockResolvedValue(
                termPolicy
            );

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                body
            );

            expect(result).toEqual({});
            expect(
                termPolicyContentService.addContentByAdmin
            ).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                body
            );
        });

        it('rethrows the domain exception', async () => {
            const error = new Error('status invalid');
            termPolicyContentService.addContentByAdmin.mockRejectedValue(error);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    body
                )
            ).rejects.toBe(error);
        });
    });
});
