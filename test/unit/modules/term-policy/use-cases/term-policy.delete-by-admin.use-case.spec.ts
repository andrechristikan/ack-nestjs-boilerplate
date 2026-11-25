import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyDeleteByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.delete-by-admin.use-case';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('TermPolicyDeleteByAdminUseCase', () => {
    const termPolicyService: MockProxy<TermPolicyService> =
        mock<TermPolicyService>();
    const termPolicyContentService: MockProxy<TermPolicyContentService> =
        mock<TermPolicyContentService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const tx: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

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
    const deleted: TermPolicy = { ...termPolicy, updatedAt: new Date(0) };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext('admin-1');

    let useCase: TermPolicyDeleteByAdminUseCase;

    beforeEach(async () => {
        termPolicyContentService.getDraftById.mockResolvedValue(termPolicy);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyDeleteByAdminUseCase,
                { provide: TermPolicyService, useValue: termPolicyService },
                {
                    provide: TermPolicyContentService,
                    useValue: termPolicyContentService,
                },
                { provide: DatabaseService, useValue: databaseService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(TestUnitKitConfigValues),
                },
            ],
        }).compile();

        useCase = module.get(TermPolicyDeleteByAdminUseCase);
    });

    describe('execute', () => {
        it('throws the exception of getDraftById and opens no transaction', async () => {
            const failure = new TermPolicyNotFoundException();
            termPolicyContentService.getDraftById.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
                )
            ).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('reads the draft, deletes it on the transaction, and returns it', async () => {
            termPolicyService.deleteByAdminInTx.mockResolvedValue(deleted);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1'
            );

            expect(result).toEqual({ data: deleted });
            expect(termPolicyContentService.getDraftById).toHaveBeenCalledWith(
                'term-policy-1'
            );
            expect(termPolicyService.deleteByAdminInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                termPolicy
            );
        });

        it('passes a rejected exception of the write through untouched', async () => {
            const failure = new TermPolicyStatusInvalidException();
            termPolicyService.deleteByAdminInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
                )
            ).rejects.toBe(failure);
        });
    });
});
