import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { EnumAwsS3Accessibility } from '@generated/prisma-client/client';
import { AwsS3NotConfiguredException } from '@common/aws/exceptions/aws.s3-not-configured.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import type {
    IAwsS3,
    IAwsS3Presign,
} from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { FileSniffSizeInBytes } from '@common/file/constants/file.constant';
import { FileService } from '@common/file/services/file.service';
import { NoSuchKey } from '@aws-sdk/client-s3';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumTermPolicyProcess,
    EnumTermPolicyQueue,
} from '@modules/term-policy/enums/term-policy.enum';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumFileExtensionTemplate } from '@common/file/enums/file.enum';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumActivityLogAction,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { TermPolicyContentExistException } from '@modules/term-policy/exceptions/term-policy.content-exist.exception';
import { TermPolicyContentKeyInvalidException } from '@modules/term-policy/exceptions/term-policy.content-key-invalid.exception';
import { TermPolicyContentInvalidException } from '@modules/term-policy/exceptions/term-policy.content-invalid.exception';
import { TermPolicyContentTypeInvalidException } from '@modules/term-policy/exceptions/term-policy.content-type-invalid.exception';
import { TermPolicyContentSizeExceededException } from '@modules/term-policy/exceptions/term-policy.content-size-exceeded.exception';
import { TermPolicyContentNotFoundException } from '@modules/term-policy/exceptions/term-policy.content-not-found.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import type { ITermPolicyContent } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('TermPolicyContentService', () => {
    const termPolicyRepository: MockProxy<TermPolicyRepository> =
        mock<TermPolicyRepository>();
    const awsS3Service: MockProxy<AwsS3Service> = mock<AwsS3Service>();
    const termPolicyUtil: MockProxy<TermPolicyUtil> = mock<TermPolicyUtil>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const fileService: MockProxy<FileService> = mock<FileService>();
    const head = Buffer.from('{{title}}');
    const tx = {} as IDatabaseTransactionClient;
    const requestContext: IRequestContext = {
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
        language: 'en',
    };
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthJwtAccessContext('admin-1');
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const activityMetadata = { termPolicyId: 'term-policy-1' };

    const timestamp = new Date('2026-01-01T00:00:00.000Z');

    const existingContent: ITermPolicyContent = {
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

    const draftTermPolicy: TermPolicy = {
        id: 'term-policy-1',
        type: EnumTermPolicyType.privacy,
        contents: [existingContent] as unknown as TermPolicy['contents'],
        version: 1,
        status: EnumTermPolicyStatus.draft,
        publishedAt: null,
        createdAt: timestamp,
        createdBy: null,
        updatedAt: timestamp,
        updatedBy: null,
    };

    const editedDraftTermPolicy: TermPolicy = {
        ...draftTermPolicy,
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    };

    const publishedTermPolicy: TermPolicy = {
        ...draftTermPolicy,
        status: EnumTermPolicyStatus.published,
        publishedAt: timestamp,
    };

    const contentMaxSizeInBytes = 4096;

    let service: TermPolicyContentService;

    beforeEach(async () => {
        vi.resetAllMocks();

        awsS3Service.isInitialized.mockReturnValue(true);
        awsS3Service.getItemBytes.mockResolvedValue(head);
        fileService.isContentOfExtension.mockResolvedValue(true);
        termPolicyUtil.toContents.mockReturnValue([existingContent]);
        termPolicyUtil.isContentKeyInPath.mockReturnValue(true);
        helperDateService.create.mockReturnValue(timestamp);
        termPolicyUtil.mapActivityLogMetadata.mockReturnValue(activityMetadata);
        activityLogService.recordEffect.mockReturnValue(entryEffect);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        termPolicyUtil.isContentSizeAllowed.mockImplementation(
            size => size <= contentMaxSizeInBytes
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyContentService,
                {
                    provide: TermPolicyRepository,
                    useValue: termPolicyRepository,
                },
                { provide: AwsS3Service, useValue: awsS3Service },
                { provide: TermPolicyUtil, useValue: termPolicyUtil },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: FileService, useValue: fileService },
            ],
        }).compile();

        service = module.get(TermPolicyContentService);
    });

    describe('assertContentText', () => {
        it('throws TermPolicyContentTypeInvalidException when the head is not a text template', async () => {
            fileService.isContentOfExtension.mockResolvedValue(false);

            const promise = service.assertContentText(existingContent.key);

            await expect(promise).rejects.toMatchObject({
                constructor: TermPolicyContentTypeInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentTypeInvalid,
                statusCodeKey: 'contentTypeInvalid',
                httpStatus: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                messagePath: 'termPolicy.error.contentTypeInvalid',
            });
            expect(awsS3Service.getItemBytes).toHaveBeenCalledWith(
                existingContent.key,
                FileSniffSizeInBytes,
                { access: EnumAwsS3Accessibility.private }
            );
            expect(fileService.isContentOfExtension).toHaveBeenCalledWith(
                head,
                EnumFileExtensionTemplate.hbs
            );
        });

        it('throws AwsS3NotConfiguredException when S3 answers null', async () => {
            awsS3Service.getItemBytes.mockResolvedValue(null);

            await expect(
                service.assertContentText(existingContent.key)
            ).rejects.toBeInstanceOf(AwsS3NotConfiguredException);
            expect(fileService.isContentOfExtension).not.toHaveBeenCalled();
        });

        it('throws TermPolicyContentKeyInvalidException when the object is missing', async () => {
            awsS3Service.getItemBytes.mockRejectedValue(
                new NoSuchKey({ message: 'missing', $metadata: {} })
            );

            await expect(
                service.assertContentText(existingContent.key)
            ).rejects.toBeInstanceOf(TermPolicyContentKeyInvalidException);
        });

        it('passes an AppBaseException through', async () => {
            const error = new AwsS3NotConfiguredException();
            awsS3Service.getItemBytes.mockRejectedValue(error);

            await expect(
                service.assertContentText(existingContent.key)
            ).rejects.toBe(error);
        });

        it('wraps any other error in AppUnknownException', async () => {
            awsS3Service.getItemBytes.mockRejectedValue(new Error('boom'));

            await expect(
                service.assertContentText(existingContent.key)
            ).rejects.toBeInstanceOf(AppUnknownException);
        });

        it('resolves when the head is a text template', async () => {
            await expect(
                service.assertContentText(existingContent.key)
            ).resolves.toBeUndefined();
        });
    });

    describe('generateContentPresignByAdmin', () => {
        it('throws TermPolicyContentSizeExceededException above the configured maximum', async () => {
            const promise = service.generateContentPresignByAdmin({
                language: EnumMessageLanguage.en,
                size: contentMaxSizeInBytes + 1,
                type: EnumTermPolicyType.privacy,
                version: 1,
            });

            await expect(promise).rejects.toBeInstanceOf(
                TermPolicyContentSizeExceededException
            );
            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentSizeExceeded,
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'termPolicy.error.contentSizeExceeded',
            });
            expect(awsS3Service.presignPutItem).not.toHaveBeenCalled();
        });

        it('presigns a size at the configured maximum', async () => {
            termPolicyRepository.findStatusByVersionAndType.mockResolvedValue(
                null
            );
            termPolicyUtil.getContentKey.mockReturnValue(
                'term-policies/privacy/1/en.hbs'
            );
            const presign: IAwsS3Presign = {
                key: 'term-policies/privacy/1/en.hbs',
                mime: 'text/plain',
                extension: 'hbs',
                presignUrl: 'https://s3.example.com/presign',
                expiredInSeconds: 900,
            };
            awsS3Service.presignPutItem.mockResolvedValue(presign);

            const result = await service.generateContentPresignByAdmin({
                language: EnumMessageLanguage.en,
                size: contentMaxSizeInBytes,
                type: EnumTermPolicyType.privacy,
                version: 1,
            });

            expect(result).toBe(presign);
        });

        it('throws TermPolicyStatusInvalidException when the version is already published', async () => {
            termPolicyRepository.findStatusByVersionAndType.mockResolvedValue(
                EnumTermPolicyStatus.published
            );

            const promise = service.generateContentPresignByAdmin({
                language: EnumMessageLanguage.en,
                size: 1024,
                type: EnumTermPolicyType.privacy,
                version: 1,
            });

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.statusInvalid
                    ],
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'termPolicy.error.statusInvalid',
            });
        });

        it('throws AwsS3NotConfiguredException when the put presign fails', async () => {
            termPolicyRepository.findStatusByVersionAndType.mockResolvedValue(
                EnumTermPolicyStatus.draft
            );
            termPolicyUtil.getContentKey.mockReturnValue(
                'term-policies/privacy/1/en.hbs'
            );
            awsS3Service.presignPutItem.mockResolvedValue(null);

            const promise = service.generateContentPresignByAdmin({
                language: EnumMessageLanguage.en,
                size: 1024,
                type: EnumTermPolicyType.privacy,
                version: 1,
            });

            await expect(promise).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
                statusCodeKey:
                    EnumAwsStatusCodeError[
                        EnumAwsStatusCodeError.s3NotConfigured
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'aws.error.s3NotConfigured',
            });
        });

        it('returns the presign for a new draft version', async () => {
            termPolicyRepository.findStatusByVersionAndType.mockResolvedValue(
                null
            );
            termPolicyUtil.getContentKey.mockReturnValue(
                'term-policies/privacy/1/en.hbs'
            );
            const presign: IAwsS3Presign = {
                key: 'term-policies/privacy/1/en.hbs',
                mime: 'text/plain',
                extension: 'hbs',
                presignUrl: 'https://s3.example.com/presign',
                expiredInSeconds: 900,
            };
            awsS3Service.presignPutItem.mockResolvedValue(presign);

            const result = await service.generateContentPresignByAdmin({
                language: EnumMessageLanguage.en,
                size: 1024,
                type: EnumTermPolicyType.privacy,
                version: 1,
            });

            expect(result).toBe(presign);
            expect(awsS3Service.presignPutItem).toHaveBeenCalledWith(
                { key: 'term-policies/privacy/1/en.hbs', size: 1024 },
                { forceUpdate: true, access: EnumAwsS3Accessibility.private }
            );
        });
    });

    describe('deleteContentEffect', () => {
        it('builds the low priority deleteContent effect carrying the keys', () => {
            const effect = service.deleteContentEffect(['a/en-x.hbs']);

            expect(effect).toEqual({
                queue: EnumTermPolicyQueue.termPolicy,
                name: EnumTermPolicyProcess.deleteContent,
                data: { keys: ['a/en-x.hbs'] },
                priority: EnumQueuePriority.low,
                idempotencyKey: null,
            });
        });
    });

    describe('updateContentByAdmin', () => {
        it('throws TermPolicyContentTypeInvalidException and writes nothing when the head is not a text template', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            fileService.isContentOfExtension.mockResolvedValue(false);

            const promise = service.updateContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'term-policies/privacy/v1/en.hbs',
                }
            );

            await expect(promise).rejects.toBeInstanceOf(
                TermPolicyContentTypeInvalidException
            );
            expect(awsS3Service.getItemBytes).toHaveBeenCalledWith(
                'term-policies/privacy/v1/en.hbs',
                FileSniffSizeInBytes,
                { access: EnumAwsS3Accessibility.private }
            );
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                termPolicyRepository.updateContentInTx
            ).not.toHaveBeenCalled();
        });

        it('throws TermPolicyContentSizeExceededException and writes nothing when size exceeds the configured max', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);

            const promise = service.updateContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: contentMaxSizeInBytes + 1,
                    key: 'term-policies/privacy/v1/fr.hbs',
                }
            );

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentSizeExceeded,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.contentSizeExceeded
                    ],
                messagePath: 'termPolicy.error.contentSizeExceeded',
                httpStatus: HttpStatus.BAD_REQUEST,
            });
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
            expect(
                termPolicyRepository.updateContentInTx
            ).not.toHaveBeenCalled();
        });

        it('throws TermPolicyNotFoundException when the term policy does not exist', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.updateContentByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    {
                        language: EnumMessageLanguage.en,
                        size: 1024,
                        key: 'term-policies/privacy/v1/en.hbs',
                    }
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyNotFoundException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.notFound,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.notFound
                    ],
                messagePath: 'termPolicy.error.notFound',
            });
        });

        it('throws TermPolicyContentInvalidException when the stored contents are invalid', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.toContents.mockReturnValue(
                new TermPolicyContentInvalidException()
            );

            await expect(
                service.updateContentByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    {
                        language: EnumMessageLanguage.en,
                        size: 1024,
                        key: 'term-policies/privacy/v1/en.hbs',
                    }
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyContentInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentInvalid,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.contentInvalid
                    ],
                messagePath: 'termPolicy.error.contentInvalid',
            });
        });

        it('throws TermPolicyStatusInvalidException when the term policy is published', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                publishedTermPolicy
            );

            await expect(
                service.updateContentByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    {
                        language: EnumMessageLanguage.en,
                        size: 1024,
                        key: 'term-policies/privacy/v1/en.hbs',
                    }
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyStatusInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.statusInvalid
                    ],
                messagePath: 'termPolicy.error.statusInvalid',
            });
        });

        it('throws TermPolicyContentNotFoundException and writes nothing when the language is absent', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.toContents.mockReturnValue([]);

            const promise = service.updateContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 2048,
                    key: 'term-policies/privacy/v1/en-2.hbs',
                }
            );

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',

                constructor: TermPolicyContentNotFoundException,
                statusCode: EnumTermPolicyStatusCodeError.contentNotFound,
            });
            expect(
                termPolicyRepository.updateContentInTx
            ).not.toHaveBeenCalled();
        });

        it('throws TermPolicyContentKeyInvalidException and writes nothing when the key is outside the policy path', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.isContentKeyInPath.mockReturnValue(false);

            const promise = service.updateContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 2048,
                    key: 'other/path/en.hbs',
                }
            );

            await expect(promise).rejects.toMatchObject({
                constructor: TermPolicyContentKeyInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentKeyInvalid,
                httpStatus: HttpStatus.BAD_REQUEST,
                messagePath: 'termPolicy.error.contentKeyInvalid',
            });
            expect(termPolicyUtil.isContentKeyInPath).toHaveBeenCalledWith(
                draftTermPolicy.type,
                draftTermPolicy.version,
                'other/path/en.hbs'
            );
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
            expect(
                termPolicyRepository.updateContentInTx
            ).not.toHaveBeenCalled();
        });

        it('throws AwsS3NotConfiguredException when S3 is not initialized', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            awsS3Service.isInitialized.mockReturnValue(false);

            const promise = service.updateContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 2048,
                    key: 'term-policies/privacy/v1/en-2.hbs',
                }
            );

            await expect(promise).rejects.toMatchObject({
                constructor: AwsS3NotConfiguredException,
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
                statusCodeKey:
                    EnumAwsStatusCodeError[
                        EnumAwsStatusCodeError.s3NotConfigured
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'aws.error.s3NotConfigured',
            });
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
            expect(
                termPolicyRepository.updateContentInTx
            ).not.toHaveBeenCalled();
        });

        it('adds a delete effect with the replaced key on the write tx', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            awsS3Service.mapPresign.mockReturnValue({ ...existingContent });
            termPolicyRepository.updateContentInTx.mockResolvedValue(true);

            await service.updateContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 2048,
                    key: 'term-policies/privacy/v1/en-2.hbs',
                }
            );

            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                service.deleteContentEffect([existingContent.key])
            );
            expect(outboxService.addInTx).toHaveBeenCalledAfter(
                termPolicyRepository.updateContentInTx
            );
        });

        it('adds no delete effect when the update sends the same key', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            awsS3Service.mapPresign.mockReturnValue({ ...existingContent });
            termPolicyRepository.updateContentInTx.mockResolvedValue(true);

            await service.updateContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 2048,
                    key: existingContent.key,
                }
            );

            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
        });

        it('adds the update-content entry from the draft on the same tx after the write', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            awsS3Service.mapPresign.mockReturnValue({ ...existingContent });
            termPolicyRepository.updateContentInTx.mockResolvedValue(true);

            await service.updateContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 2048,
                    key: 'term-policies/privacy/v1/en-2.hbs',
                }
            );

            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(termPolicyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                draftTermPolicy,
                timestamp
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminTermPolicyUpdateContent,
                    metadata: activityMetadata,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
        });

        it('throws TermPolicyStatusInvalidException on a write conflict of the guarded write', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            awsS3Service.mapPresign.mockReturnValue({ ...existingContent });
            const conflict = new Error('write conflict');
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.updateContentByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    {
                        language: EnumMessageLanguage.en,
                        size: 2048,
                        key: 'term-policies/privacy/v1/en-2.hbs',
                    }
                )
            ).rejects.toBeInstanceOf(TermPolicyStatusInvalidException);
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('adds no update-content entry when the guarded write matches no draft', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            awsS3Service.mapPresign.mockReturnValue({ ...existingContent });
            termPolicyRepository.updateContentInTx.mockResolvedValue(false);

            await expect(
                service.updateContentByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    {
                        language: EnumMessageLanguage.en,
                        size: 2048,
                        key: 'term-policies/privacy/v1/en-2.hbs',
                    }
                )
            ).rejects.toBeInstanceOf(TermPolicyStatusInvalidException);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('updates the content and returns the draft term policy', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            const mapped: IAwsS3 = { ...existingContent };
            awsS3Service.mapPresign.mockReturnValue(mapped);
            termPolicyRepository.updateContentInTx.mockResolvedValue(true);

            const result = await service.updateContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 2048,
                    key: 'term-policies/privacy/v1/en-2.hbs',
                }
            );

            expect(awsS3Service.mapPresign).toHaveBeenCalledWith(
                {
                    key: 'term-policies/privacy/v1/en-2.hbs',
                    size: 2048,
                },
                { access: EnumAwsS3Accessibility.private }
            );
            expect(termPolicyRepository.updateContentInTx).toHaveBeenCalledWith(
                tx,
                'term-policy-1',
                [existingContent],
                { language: EnumMessageLanguage.en, ...mapped },
                draftTermPolicy.updatedAt
            );
            expect(result).toBe(draftTermPolicy);
        });

        it('passes the updatedAt of the draft it read to the guarded write', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                editedDraftTermPolicy
            );
            const mapped: IAwsS3 = { ...existingContent };
            awsS3Service.mapPresign.mockReturnValue(mapped);
            termPolicyRepository.updateContentInTx.mockResolvedValue(true);

            await service.updateContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 2048,
                    key: 'term-policies/privacy/v1/en-2.hbs',
                }
            );

            expect(termPolicyRepository.updateContentInTx).toHaveBeenCalledWith(
                tx,
                'term-policy-1',
                [existingContent],
                { language: EnumMessageLanguage.en, ...mapped },
                editedDraftTermPolicy.updatedAt
            );
        });

        it('throws TermPolicyStatusInvalidException when the guarded write misses', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            awsS3Service.mapPresign.mockReturnValue({ ...existingContent });
            termPolicyRepository.updateContentInTx.mockResolvedValue(false);

            const promise = service.updateContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 2048,
                    key: 'term-policies/privacy/v1/en-2.hbs',
                }
            );

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',

                constructor: TermPolicyStatusInvalidException,
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
            });
        });

        it('wraps a non-AppBaseException failure in AppUnknownException', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            awsS3Service.mapPresign.mockReturnValue({
                ...existingContent,
            });
            const rawError = new Error('write failed');
            termPolicyRepository.updateContentInTx.mockRejectedValue(rawError);

            const promise = service.updateContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 2048,
                    key: 'term-policies/privacy/v1/en-2.hbs',
                }
            );

            await expect(promise).rejects.toMatchObject({
                constructor: AppUnknownException,
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError,
            });
        });

        it('rethrows an AppBaseException raised while updating', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            const error = new TermPolicyContentExistException();
            awsS3Service.mapPresign.mockImplementation(() => {
                throw error;
            });

            const promise = service.updateContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 2048,
                    key: 'term-policies/privacy/v1/en-2.hbs',
                }
            );

            await expect(promise).rejects.toBe(error);
            await expect(promise).rejects.toMatchObject({
                constructor: TermPolicyContentExistException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentExist,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.contentExist
                    ],
                messagePath: 'termPolicy.error.contentExist',
            });
        });
    });

    describe('addContentByAdmin', () => {
        it('throws TermPolicyContentTypeInvalidException and writes nothing when the head is not a text template', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.toContents.mockReturnValue([]);
            fileService.isContentOfExtension.mockResolvedValue(false);

            const promise = service.addContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'term-policies/privacy/v1/en.hbs',
                }
            );

            await expect(promise).rejects.toBeInstanceOf(
                TermPolicyContentTypeInvalidException
            );
            expect(awsS3Service.getItemBytes).toHaveBeenCalledWith(
                'term-policies/privacy/v1/en.hbs',
                FileSniffSizeInBytes,
                { access: EnumAwsS3Accessibility.private }
            );
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(termPolicyRepository.addContentInTx).not.toHaveBeenCalled();
        });

        it('throws TermPolicyContentKeyInvalidException and writes nothing when the key is outside the policy path', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.isContentKeyInPath.mockReturnValue(false);

            const promise = service.addContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'other/path/en.hbs',
                }
            );

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',

                constructor: TermPolicyContentKeyInvalidException,
                statusCode: EnumTermPolicyStatusCodeError.contentKeyInvalid,
            });
            expect(termPolicyRepository.addContentInTx).not.toHaveBeenCalled();
        });

        it('throws TermPolicyContentSizeExceededException and writes nothing when size exceeds the configured max', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);

            const promise = service.addContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: contentMaxSizeInBytes + 1,
                    key: 'term-policies/privacy/v1/fr.hbs',
                }
            );

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentSizeExceeded,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.contentSizeExceeded
                    ],
                messagePath: 'termPolicy.error.contentSizeExceeded',
                httpStatus: HttpStatus.BAD_REQUEST,
            });
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
            expect(termPolicyRepository.addContentInTx).not.toHaveBeenCalled();
        });

        it('throws TermPolicyNotFoundException when the term policy does not exist', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.addContentByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    {
                        language: EnumMessageLanguage.en,
                        size: 1024,
                        key: 'term-policies/privacy/v1/fr.hbs',
                    }
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyNotFoundException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.notFound,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.notFound
                    ],
                messagePath: 'termPolicy.error.notFound',
            });
        });

        it('throws TermPolicyContentInvalidException when the stored contents are invalid', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.toContents.mockReturnValue(
                new TermPolicyContentInvalidException()
            );

            await expect(
                service.addContentByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    {
                        language: EnumMessageLanguage.en,
                        size: 1024,
                        key: 'term-policies/privacy/v1/fr.hbs',
                    }
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyContentInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentInvalid,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.contentInvalid
                    ],
                messagePath: 'termPolicy.error.contentInvalid',
            });
        });

        it('throws TermPolicyContentExistException when the language is already present', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);

            const promise = service.addContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'term-policies/privacy/v1/en.hbs',
                }
            );

            await expect(promise).rejects.toMatchObject({
                constructor: TermPolicyContentExistException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentExist,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.contentExist
                    ],
                messagePath: 'termPolicy.error.contentExist',
            });
        });

        it('throws AwsS3NotConfiguredException when S3 is not initialized', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.toContents.mockReturnValue([]);
            awsS3Service.isInitialized.mockReturnValue(false);

            const promise = service.addContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 2048,
                    key: 'term-policies/privacy/v1/en-2.hbs',
                }
            );

            await expect(promise).rejects.toMatchObject({
                constructor: AwsS3NotConfiguredException,
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
                statusCodeKey:
                    EnumAwsStatusCodeError[
                        EnumAwsStatusCodeError.s3NotConfigured
                    ],
                httpStatus: HttpStatus.NOT_FOUND,
                messagePath: 'aws.error.s3NotConfigured',
            });
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
            expect(termPolicyRepository.addContentInTx).not.toHaveBeenCalled();
        });

        it('adds the add-content entry from the draft on the same tx after the write', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.toContents.mockReturnValue([]);
            awsS3Service.mapPresign.mockReturnValue({ ...existingContent });
            termPolicyRepository.addContentInTx.mockResolvedValue(true);

            await service.addContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'term-policies/privacy/v1/fr.hbs',
                }
            );

            expect(termPolicyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                draftTermPolicy,
                timestamp
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminTermPolicyAddContent,
                    metadata: activityMetadata,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
        });

        it('throws TermPolicyStatusInvalidException on a write conflict of the guarded write', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.toContents.mockReturnValue([]);
            awsS3Service.mapPresign.mockReturnValue({ ...existingContent });
            outboxService.withTransaction.mockRejectedValue(
                new Error('write conflict')
            );
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.addContentByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    {
                        language: EnumMessageLanguage.en,
                        size: 1024,
                        key: 'term-policies/privacy/v1/fr.hbs',
                    }
                )
            ).rejects.toBeInstanceOf(TermPolicyStatusInvalidException);
        });

        it('adds no add-content entry when the guarded write matches no draft', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.toContents.mockReturnValue([]);
            awsS3Service.mapPresign.mockReturnValue({ ...existingContent });
            termPolicyRepository.addContentInTx.mockResolvedValue(false);

            await expect(
                service.addContentByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    {
                        language: EnumMessageLanguage.en,
                        size: 1024,
                        key: 'term-policies/privacy/v1/fr.hbs',
                    }
                )
            ).rejects.toBeInstanceOf(TermPolicyStatusInvalidException);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('adds the content and returns the draft term policy', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.toContents.mockReturnValue([]);
            const mapped: IAwsS3 = {
                ...existingContent,
                key: 'term-policies/privacy/v1/fr.hbs',
            };
            awsS3Service.mapPresign.mockReturnValue(mapped);
            termPolicyRepository.addContentInTx.mockResolvedValue(true);

            const result = await service.addContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'term-policies/privacy/v1/fr.hbs',
                }
            );

            expect(termPolicyRepository.addContentInTx).toHaveBeenCalledWith(
                tx,
                'term-policy-1',
                { language: EnumMessageLanguage.en, ...mapped }
            );
            expect(result).toBe(draftTermPolicy);
        });

        it('throws TermPolicyStatusInvalidException when the guarded write matches no draft', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.toContents.mockReturnValue([]);
            awsS3Service.mapPresign.mockReturnValue({ ...existingContent });
            termPolicyRepository.addContentInTx.mockResolvedValue(false);

            const promise = service.addContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'term-policies/privacy/v1/fr.hbs',
                }
            );

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',

                constructor: TermPolicyStatusInvalidException,
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
            });
        });

        it('wraps a non-AppBaseException failure in AppUnknownException', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.toContents.mockReturnValue([]);
            awsS3Service.mapPresign.mockReturnValue({ ...existingContent });
            const rawError = new Error('write failed');
            termPolicyRepository.addContentInTx.mockRejectedValue(rawError);

            await expect(
                service.addContentByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    {
                        language: EnumMessageLanguage.en,
                        size: 1024,
                        key: 'term-policies/privacy/v1/fr.hbs',
                    }
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError,
            });
        });

        it('rethrows an AppBaseException raised while adding', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.toContents.mockReturnValue([]);
            const error = new TermPolicyContentExistException();
            awsS3Service.mapPresign.mockImplementation(() => {
                throw error;
            });

            const promise = service.addContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'term-policies/privacy/v1/fr.hbs',
                }
            );

            await expect(promise).rejects.toBe(error);
            await expect(promise).rejects.toMatchObject({
                constructor: TermPolicyContentExistException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentExist,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.contentExist
                    ],
                messagePath: 'termPolicy.error.contentExist',
            });
        });
    });

    describe('removeContentByAdmin', () => {
        it('throws TermPolicyNotFoundException when the term policy does not exist', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.removeContentByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    EnumMessageLanguage.en
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyNotFoundException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.notFound,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.notFound
                    ],
                messagePath: 'termPolicy.error.notFound',
            });
        });

        it('throws TermPolicyContentInvalidException when the stored contents are invalid', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.toContents.mockReturnValue(
                new TermPolicyContentInvalidException()
            );

            await expect(
                service.removeContentByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    EnumMessageLanguage.en
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyContentInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentInvalid,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.contentInvalid
                    ],
                messagePath: 'termPolicy.error.contentInvalid',
            });
        });

        it('throws TermPolicyContentNotFoundException when the language is absent', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.toContents.mockReturnValue([]);

            await expect(
                service.removeContentByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    EnumMessageLanguage.en
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyContentNotFoundException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentNotFound,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.contentNotFound
                    ],
                messagePath: 'termPolicy.error.contentNotFound',
            });
        });

        it('adds a delete effect with the removed key on the write tx', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyRepository.removeContentInTx.mockResolvedValue(true);

            await service.removeContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                EnumMessageLanguage.en
            );

            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                service.deleteContentEffect([existingContent.key])
            );
            expect(outboxService.addInTx).toHaveBeenCalledAfter(
                termPolicyRepository.removeContentInTx
            );
        });

        it('adds the remove-content entry from the draft on the same tx after the write', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyRepository.removeContentInTx.mockResolvedValue(true);

            await service.removeContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                EnumMessageLanguage.en
            );

            expect(termPolicyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                draftTermPolicy,
                timestamp
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminTermPolicyRemoveContent,
                    metadata: activityMetadata,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
        });

        it('throws TermPolicyStatusInvalidException on a write conflict of the guarded write', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            outboxService.withTransaction.mockRejectedValue(
                new Error('write conflict')
            );
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.removeContentByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    EnumMessageLanguage.en
                )
            ).rejects.toBeInstanceOf(TermPolicyStatusInvalidException);
        });

        it('adds no remove-content entry when the guarded write matches no draft', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyRepository.removeContentInTx.mockResolvedValue(false);

            await expect(
                service.removeContentByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    EnumMessageLanguage.en
                )
            ).rejects.toBeInstanceOf(TermPolicyStatusInvalidException);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('removes the content and returns the draft term policy', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyRepository.removeContentInTx.mockResolvedValue(true);

            const result = await service.removeContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                EnumMessageLanguage.en
            );

            expect(termPolicyRepository.removeContentInTx).toHaveBeenCalledWith(
                tx,
                'term-policy-1',
                [existingContent],
                EnumMessageLanguage.en,
                draftTermPolicy.updatedAt
            );
            expect(result).toBe(draftTermPolicy);
        });

        it('passes the updatedAt of the draft it read to the guarded write', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                editedDraftTermPolicy
            );
            termPolicyRepository.removeContentInTx.mockResolvedValue(true);

            await service.removeContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                EnumMessageLanguage.en
            );

            expect(termPolicyRepository.removeContentInTx).toHaveBeenCalledWith(
                tx,
                'term-policy-1',
                [existingContent],
                EnumMessageLanguage.en,
                editedDraftTermPolicy.updatedAt
            );
        });

        it('throws TermPolicyStatusInvalidException when the guarded write misses', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyRepository.removeContentInTx.mockResolvedValue(false);

            const promise = service.removeContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                EnumMessageLanguage.en
            );

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',

                constructor: TermPolicyStatusInvalidException,
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
            });
        });

        it('rethrows an AppBaseException raised while removing', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            const error = new TermPolicyContentNotFoundException();
            termPolicyRepository.removeContentInTx.mockRejectedValue(error);

            const promise = service.removeContentByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                EnumMessageLanguage.en
            );

            await expect(promise).rejects.toBe(error);
            await expect(promise).rejects.toMatchObject({
                constructor: TermPolicyContentNotFoundException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentNotFound,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.contentNotFound
                    ],
                messagePath: 'termPolicy.error.contentNotFound',
            });
        });

        it('wraps a non-AppBaseException failure in AppUnknownException', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            const rawError = new Error('write failed');
            termPolicyRepository.removeContentInTx.mockRejectedValue(rawError);

            await expect(
                service.removeContentByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    EnumMessageLanguage.en
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError,
            });
        });
    });

    describe('getContentByAdmin', () => {
        it('throws TermPolicyNotFoundException when the term policy does not exist', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.getContentByAdmin(
                    'term-policy-1',
                    EnumMessageLanguage.en
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyNotFoundException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.notFound,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.notFound
                    ],
                messagePath: 'termPolicy.error.notFound',
            });
        });

        it('throws TermPolicyContentInvalidException when the stored contents are invalid', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.toContents.mockReturnValue(
                new TermPolicyContentInvalidException()
            );

            await expect(
                service.getContentByAdmin(
                    'term-policy-1',
                    EnumMessageLanguage.en
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyContentInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentInvalid,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.contentInvalid
                    ],
                messagePath: 'termPolicy.error.contentInvalid',
            });
        });

        it('throws TermPolicyContentNotFoundException when the language is absent', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.toContents.mockReturnValue([]);

            await expect(
                service.getContentByAdmin(
                    'term-policy-1',
                    EnumMessageLanguage.en
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyContentNotFoundException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentNotFound,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.contentNotFound
                    ],
                messagePath: 'termPolicy.error.contentNotFound',
            });
        });

        it('throws AwsS3NotConfiguredException when the get presign fails', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            awsS3Service.presignGetItem.mockResolvedValue(null);

            await expect(
                service.getContentByAdmin(
                    'term-policy-1',
                    EnumMessageLanguage.en
                )
            ).rejects.toMatchObject({
                constructor: AwsS3NotConfiguredException,
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
                statusCodeKey:
                    EnumAwsStatusCodeError[
                        EnumAwsStatusCodeError.s3NotConfigured
                    ],
                messagePath: 'aws.error.s3NotConfigured',
            });
        });

        it('returns the presign for the existing content', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            const presign: IAwsS3Presign = {
                key: existingContent.key,
                mime: existingContent.mime,
                extension: existingContent.extension,
                presignUrl: 'https://s3.example.com/get-presign',
                expiredInSeconds: 900,
            };
            awsS3Service.presignGetItem.mockResolvedValue(presign);

            const result = await service.getContentByAdmin(
                'term-policy-1',
                EnumMessageLanguage.en
            );

            expect(result).toBe(presign);
            expect(awsS3Service.presignGetItem).toHaveBeenCalledWith(
                existingContent.key,
                { access: existingContent.access }
            );
        });
    });

    describe('findOneDraftById', () => {
        it('returns the term policy when it exists and is a draft', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);

            const result = await service['findOneDraftById']('term-policy-1');

            expect(result).toBe(draftTermPolicy);
            expect(termPolicyRepository.findOneById).toHaveBeenCalledWith(
                'term-policy-1'
            );
        });

        it('throws TermPolicyNotFoundException when the term policy does not exist', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(null);

            await expect(
                service['findOneDraftById']('term-policy-1')
            ).rejects.toMatchObject({
                constructor: TermPolicyNotFoundException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.notFound,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.notFound
                    ],
                messagePath: 'termPolicy.error.notFound',
            });
        });

        it('throws TermPolicyStatusInvalidException when the term policy is published', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                publishedTermPolicy
            );

            await expect(
                service['findOneDraftById']('term-policy-1')
            ).rejects.toMatchObject({
                constructor: TermPolicyStatusInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.statusInvalid
                    ],
                messagePath: 'termPolicy.error.statusInvalid',
            });
        });
    });

    describe('getContentByLanguage', () => {
        it('returns the content matching the language', () => {
            expect(
                service['getContentByLanguage'](
                    [existingContent],
                    EnumMessageLanguage.en
                )
            ).toBe(existingContent);
        });

        it('returns null when no content matches the language', () => {
            expect(
                service['getContentByLanguage']([], EnumMessageLanguage.en)
            ).toBeNull();
        });
    });
});
