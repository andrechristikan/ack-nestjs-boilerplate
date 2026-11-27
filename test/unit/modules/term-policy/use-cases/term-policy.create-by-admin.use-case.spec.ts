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
import { DatabaseUtil } from '@common/database/utils/database.util';
import { EnumAwsS3Accessibility } from '@generated/prisma-client/client';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { TermPolicyContentKeyInvalidException } from '@modules/term-policy/exceptions/term-policy.content-key-invalid.exception';
import { TermPolicyContentSizeExceededException } from '@modules/term-policy/exceptions/term-policy.content-size-exceeded.exception';
import { TermPolicyContentTypeInvalidException } from '@modules/term-policy/exceptions/term-policy.content-type-invalid.exception';
import { TermPolicyExistException } from '@modules/term-policy/exceptions/term-policy.exist.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import type {
    ITermPolicyContent,
    ITermPolicyContentCheck,
    ITermPolicyCreatePrepared,
} from '@modules/term-policy/interfaces/term-policy.interface';
import type { TermPolicyCreateRequestDto } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { TermPolicyCreateByAdminUseCase } from '@modules/term-policy/use-cases/term-policy.create-by-admin.use-case';
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

describe('TermPolicyCreateByAdminUseCase', () => {
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
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext('admin-1');
    const body: TermPolicyCreateRequestDto = {
        type: EnumTermPolicyType.privacy,
        version: 1,
        contents: [
            {
                language: EnumMessageLanguage.en,
                key: 'term-policies/privacy/v1/en.hbs',
            },
        ],
    };
    const content: ITermPolicyContent = {
        language: EnumMessageLanguage.en,
        bucket: 'sample-bucket',
        key: 'term-policies/privacy/v1/en.hbs',
        cdnUrl: null,
        completedUrl: 'https://cdn.example.com/en.hbs',
        mime: 'text/plain',
        extension: 'hbs',
        access: EnumAwsS3Accessibility.private,
        size: 1024,
    };
    const accepted: ITermPolicyContentCheck = {
        isSizeAllowed: true,
        isContentValid: true,
        content,
    };
    const checks: ITermPolicyContentCheck[] = [accepted];
    const prepared: ITermPolicyCreatePrepared = {
        checks,
        readFailure: null,
    };

    let useCase: TermPolicyCreateByAdminUseCase;

    beforeEach(async () => {
        termPolicyService.prepareCreateByAdmin.mockResolvedValue(prepared);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyCreateByAdminUseCase,
                { provide: TermPolicyService, useValue: termPolicyService },
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

        useCase = module.get(TermPolicyCreateByAdminUseCase);
        vi.spyOn(module.get(DatabaseUtil), 'createId').mockReturnValue(
            'term-policy-1'
        );
    });

    describe('execute', () => {
        it('throws the exception of prepareCreateByAdmin and opens no transaction', async () => {
            const failure = new TermPolicyNotFoundException();
            termPolicyService.prepareCreateByAdmin.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
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
            termPolicyService.prepareCreateByAdmin.mockResolvedValue({
                checks: [accepted, oversize],
                readFailure: null,
            });
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
                    body
                )
            ).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentSizeExceeded,
            });

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                termPolicyContentService.deleteRejectedContentInTx
            ).toHaveBeenCalledWith(tx, [accepted, oversize]);
            expect(
                termPolicyContentService.deleteRejectedContentInTx
            ).toHaveBeenCalledBefore(
                termPolicyContentService.assertContentSizeAllowed
            );
            expect(termPolicyService.createByAdminInTx).not.toHaveBeenCalled();
        });

        it('opens one transaction holding deleteRejectedContentInTx then rejects with TermPolicyContentTypeInvalidException for refused content, and the write is not called', async () => {
            const refused: ITermPolicyContentCheck = {
                ...accepted,
                isContentValid: false,
            };
            termPolicyService.prepareCreateByAdmin.mockResolvedValue({
                checks: [accepted, refused],
                readFailure: null,
            });
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
                    body
                )
            ).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentTypeInvalid,
            });

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                termPolicyContentService.deleteRejectedContentInTx
            ).toHaveBeenCalledWith(tx, [accepted, refused]);
            expect(termPolicyService.createByAdminInTx).not.toHaveBeenCalled();
        });

        it('opens one transaction holding deleteRejectedContentInTx for the refused object of the settled checks, then rejects with the read failure and runs no size or content assert', async () => {
            const refused: ITermPolicyContentCheck = {
                ...accepted,
                isContentValid: false,
            };
            const failure = new TermPolicyContentKeyInvalidException();
            termPolicyService.prepareCreateByAdmin.mockResolvedValue({
                checks: [refused],
                readFailure: failure,
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    body
                )
            ).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentKeyInvalid,
            });

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                termPolicyContentService.deleteRejectedContentInTx
            ).toHaveBeenCalledWith(tx, [refused]);
            expect(
                termPolicyContentService.assertContentSizeAllowed
            ).not.toHaveBeenCalled();
            expect(
                termPolicyContentService.assertContentTypeValid
            ).not.toHaveBeenCalled();
            expect(termPolicyService.createByAdminInTx).not.toHaveBeenCalled();
        });

        it('rejects with the read failure and opens no transaction when no object is refused', async () => {
            const failure = new TermPolicyContentKeyInvalidException();
            termPolicyService.prepareCreateByAdmin.mockResolvedValue({
                checks: [accepted],
                readFailure: failure,
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    body
                )
            ).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentKeyInvalid,
            });

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('adds no delete row when no object is rejected', async () => {
            termPolicyService.createByAdminInTx.mockResolvedValue(termPolicy);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                body
            );

            expect(
                termPolicyContentService.deleteRejectedContentInTx
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('draws the id, prepares the contents, creates on the transaction, and returns the row', async () => {
            termPolicyService.createByAdminInTx.mockResolvedValue(termPolicy);

            const result = await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                body
            );

            expect(result).toEqual({ data: termPolicy });
            expect(termPolicyService.prepareCreateByAdmin).toHaveBeenCalledWith(
                body
            );
            expect(termPolicyService.createByAdminInTx).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                body,
                [content]
            );
        });

        it('passes a rejected exception of the write through untouched', async () => {
            const failure = new TermPolicyExistException();
            termPolicyService.createByAdminInTx.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    body
                )
            ).rejects.toBe(failure);
        });

        it('passes any other rejection through untouched', async () => {
            const cause = new Error('boom');
            termPolicyService.createByAdminInTx.mockRejectedValue(cause);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    body
                )
            ).rejects.toBe(cause);
        });
    });
});
