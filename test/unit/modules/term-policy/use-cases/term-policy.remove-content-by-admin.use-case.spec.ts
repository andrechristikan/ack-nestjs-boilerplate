import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { EnumAwsS3Accessibility } from '@generated/prisma-client/client';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import type {
    ITermPolicyContent,
    ITermPolicyContentPrepared,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { TermPolicyRemoveContentByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.remove-content-by-admin.use-case';
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

describe('TermPolicyRemoveContentByAdminUseCase', () => {
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
    const content: ITermPolicyContent = {
        language: EnumMessageLanguage.en,
        bucket: 'sample-bucket',
        key: 'term-policies/privacy/1/en.hbs',
        cdnUrl: null,
        completedUrl: 'https://cdn.example.com/en.hbs',
        mime: 'text/plain',
        extension: 'hbs',
        access: EnumAwsS3Accessibility.private,
        size: 1024,
    };
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext('admin-1');
    const prepared: ITermPolicyContentPrepared<ITermPolicyContent, null> = {
        termPolicy,
        contents: [],
        existingContent: content,
        mappedContent: null,
    };

    let useCase: TermPolicyRemoveContentByAdminUseCase;

    beforeEach(async () => {
        termPolicyContentService.prepareRemoveContentByAdmin.mockResolvedValue(
            prepared
        );
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyRemoveContentByAdminUseCase,
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

        useCase = module.get(TermPolicyRemoveContentByAdminUseCase);
    });

    describe('execute', () => {
        it('throws the exception of prepareRemoveContentByAdmin and opens no transaction', async () => {
            const failure = new TermPolicyNotFoundException();
            termPolicyContentService.prepareRemoveContentByAdmin.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    EnumMessageLanguage.en
                )
            ).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('prepares the change, writes it on the transaction, and returns an empty envelope', async () => {
            termPolicyContentService.removeContentByAdminInTx.mockResolvedValue();

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                EnumMessageLanguage.en
            );

            expect(result).toEqual({});
            expect(
                termPolicyContentService.prepareRemoveContentByAdmin
            ).toHaveBeenCalledWith('term-policy-1', EnumMessageLanguage.en);
            expect(
                termPolicyContentService.removeContentByAdminInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                prepared
            );
        });

        it('passes a rejected exception of the write through untouched', async () => {
            const failure = new TermPolicyStatusInvalidException();
            termPolicyContentService.removeContentByAdminInTx.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    EnumMessageLanguage.en
                )
            ).rejects.toBe(failure);
        });

        it('passes any other rejection through untouched', async () => {
            const cause = new Error('boom');
            termPolicyContentService.removeContentByAdminInTx.mockRejectedValue(
                cause
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    EnumMessageLanguage.en
                )
            ).rejects.toBe(cause);
        });
    });
});
