import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import type { TermPolicyRemoveContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.remove-content.request.dto';
import { TermPolicyRemoveContentByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.remove-content-by-admin.use-case';

describe('TermPolicyRemoveContentByAdminUseCase', () => {
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
    const context: IRequestContext = {
        actorUserId: 'admin-1',
        workspaceId: null,
        requestLog: {
            userAgent: {
                ua: null,
                browser: null,
                cpu: null,
                device: null,
                engine: null,
                os: null,
            },
            ipAddress: '127.0.0.1',
            geoLocation: null,
        },
    };
    const body: TermPolicyRemoveContentRequestDto = {
        language: EnumMessageLanguage.en,
    };

    let useCase: TermPolicyRemoveContentByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyRemoveContentByAdminUseCase,
                {
                    provide: TermPolicyContentService,
                    useValue: termPolicyContentService,
                },
            ],
        }).compile();

        useCase = module.get(TermPolicyRemoveContentByAdminUseCase);
    });

    describe('execute', () => {
        it('passes the request context to the content service and returns an empty envelope', async () => {
            termPolicyContentService.removeContentByAdmin.mockResolvedValue(
                termPolicy
            );

            const result = await useCase.execute(
                'term-policy-1',
                body,
                context
            );

            expect(result).toEqual({});
            expect(
                termPolicyContentService.removeContentByAdmin
            ).toHaveBeenCalledWith(
                'term-policy-1',
                EnumMessageLanguage.en,
                context
            );
        });

        it('rethrows the domain exception', async () => {
            const error = new Error('status invalid');
            termPolicyContentService.removeContentByAdmin.mockRejectedValue(
                error
            );

            await expect(
                useCase.execute('term-policy-1', body, context)
            ).rejects.toBe(error);
        });
    });
});
