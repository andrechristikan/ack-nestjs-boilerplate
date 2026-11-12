import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyCreateByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.create-by-admin.use-case';
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';

describe('TermPolicyCreateByAdminUseCase', () => {
    const termPolicyService: MockProxy<TermPolicyService> =
        mock<TermPolicyService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
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
    const body: TermPolicyCreateRequestDto = {
        type: EnumTermPolicyType.privacy,
        version: 1,
        contents: [],
    };

    let useCase: TermPolicyCreateByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyCreateByAdminUseCase,
                { provide: TermPolicyService, useValue: termPolicyService },
                { provide: DatabaseUtil, useValue: databaseUtil },
            ],
        }).compile();

        useCase = module.get(TermPolicyCreateByAdminUseCase);
    });

    describe('execute', () => {
        it('draws the id and creates the term policy passing the request context', async () => {
            databaseUtil.createId.mockReturnValue('term-policy-1');
            termPolicyService.createByAdmin.mockResolvedValue(termPolicy);

            const result = await useCase.execute(body, context);

            expect(result).toEqual({ data: termPolicy });
            expect(termPolicyService.createByAdmin).toHaveBeenCalledWith(
                'term-policy-1',
                body,
                context
            );
        });

        it('rethrows the domain exception', async () => {
            const error = new Error('exists');
            databaseUtil.createId.mockReturnValue('term-policy-1');
            termPolicyService.createByAdmin.mockRejectedValue(error);

            await expect(useCase.execute(body, context)).rejects.toBe(error);
        });
    });
});
