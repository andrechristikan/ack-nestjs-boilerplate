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
import type { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyContentSizeExceededException } from '@modules/term-policy/exceptions/term-policy.content-size-exceeded.exception';
import { TermPolicyContentTypeInvalidException } from '@modules/term-policy/exceptions/term-policy.content-type-invalid.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import type {
    ITermPolicyContent,
    ITermPolicyContentCheck,
    ITermPolicyContentUploadPrepared,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { TermPolicyAddContentByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.add-content-by-admin.use-case';
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

describe('TermPolicyAddContentByAdminUseCase', () => {
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
    const body: TermPolicyContentRequestDto = {
        language: EnumMessageLanguage.en,
        key: 'term-policies/privacy/1/en.hbs',
    };
    const accepted: ITermPolicyContentCheck = {
        isSizeAllowed: true,
        isContentValid: true,
        content,
    };
    const prepared: ITermPolicyContentUploadPrepared<null> = {
        termPolicy,
        contents: [],
        existingContent: null,
        checks: [accepted],
    };

    let useCase: TermPolicyAddContentByAdminUseCase;

    beforeEach(async () => {
        termPolicyContentService.prepareAddContentByAdmin.mockResolvedValue(
            prepared
        );
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyAddContentByAdminUseCase,
                {
                    provide: TermPolicyContentService,
                    useValue: termPolicyContentService,
                },
                { provide: DatabaseService, useValue: databaseService },
                TermPolicyUtil,
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'termPolicy.uploadContentPathPattern':
                            'term-policies/{type}/v{version}',
                        'termPolicy.contentPublicPathPattern':
                            'public/term-policies/{type}/v{version}',
                        'termPolicy.content.maxSizeInBytes': 4096,
                        'termPolicy.contentKeyRandomLength': 20,
                    }),
                },
            ],
        }).compile();

        useCase = module.get(TermPolicyAddContentByAdminUseCase);
    });

    describe('execute', () => {
        it('throws the exception of prepareAddContentByAdmin and opens no transaction', async () => {
            const failure = new TermPolicyNotFoundException();
            termPolicyContentService.prepareAddContentByAdmin.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    body
                )
            ).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('opens one transaction holding deleteRejectedContentInTx then rejects with TermPolicyContentSizeExceededException for an oversize object, and the write is not called', async () => {
            const oversize: ITermPolicyContentCheck = {
                ...accepted,
                isSizeAllowed: false,
            };
            termPolicyContentService.prepareAddContentByAdmin.mockResolvedValue(
                { ...prepared, checks: [oversize] }
            );
            termPolicyContentService.assertContentSizeAllowed.mockImplementation(
                () => {
                    throw new TermPolicyContentSizeExceededException();
                }
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    body
                )
            ).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentSizeExceeded,
            });

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                termPolicyContentService.deleteRejectedContentInTx
            ).toHaveBeenCalledWith(tx, [oversize]);
            expect(
                termPolicyContentService.deleteRejectedContentInTx
            ).toHaveBeenCalledBefore(
                termPolicyContentService.assertContentSizeAllowed
            );
            expect(
                termPolicyContentService.addContentByAdminInTx
            ).not.toHaveBeenCalled();
        });

        it('opens one transaction holding deleteRejectedContentInTx then rejects with TermPolicyContentTypeInvalidException for refused content, and the write is not called', async () => {
            const refused: ITermPolicyContentCheck = {
                ...accepted,
                isContentValid: false,
            };
            termPolicyContentService.prepareAddContentByAdmin.mockResolvedValue(
                { ...prepared, checks: [refused] }
            );
            termPolicyContentService.assertContentTypeValid.mockImplementation(
                () => {
                    throw new TermPolicyContentTypeInvalidException();
                }
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    body
                )
            ).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentTypeInvalid,
            });

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                termPolicyContentService.deleteRejectedContentInTx
            ).toHaveBeenCalledWith(tx, [refused]);
            expect(
                termPolicyContentService.addContentByAdminInTx
            ).not.toHaveBeenCalled();
        });

        it('adds no delete row when no object is rejected', async () => {
            termPolicyContentService.addContentByAdminInTx.mockResolvedValue();

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                body
            );

            expect(
                termPolicyContentService.deleteRejectedContentInTx
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('prepares the change, writes it on the transaction, and returns an empty envelope', async () => {
            termPolicyContentService.addContentByAdminInTx.mockResolvedValue();

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                body
            );

            expect(result).toEqual({});
            expect(
                termPolicyContentService.prepareAddContentByAdmin
            ).toHaveBeenCalledWith('term-policy-1', body);
            expect(
                termPolicyContentService.addContentByAdminInTx
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
            termPolicyContentService.addContentByAdminInTx.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    body
                )
            ).rejects.toBe(failure);
        });

        it('passes any other rejection through untouched', async () => {
            const cause = new Error('boom');
            termPolicyContentService.addContentByAdminInTx.mockRejectedValue(
                cause
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    body
                )
            ).rejects.toBe(cause);
        });
    });
});
