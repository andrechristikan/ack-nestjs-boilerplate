import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
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
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumTermPolicyProcess,
    EnumTermPolicyQueue,
} from '@modules/term-policy/enums/term-policy.enum';
import { TermPolicyQueue } from '@modules/term-policy/queues/term-policy.queue';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import { DatabaseService } from '@common/database/services/database.service';
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
import { TermPolicyContentNotFoundException } from '@modules/term-policy/exceptions/term-policy.content-not-found.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import type {
    ITermPolicyContent,
    ITermPolicyContentPrepared,
    ITermPolicyContentUpload,
    ITermPolicyDeleteContentEffect,
} from '@modules/term-policy/interfaces/term-policy.interface';
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
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const termPolicyQueue: MockProxy<TermPolicyQueue> = mock<TermPolicyQueue>();
    const deleteEffect: ITermPolicyDeleteContentEffect = {
        queue: EnumTermPolicyQueue.termPolicy,
        name: EnumTermPolicyProcess.deleteContent,
        data: { keys: ['term-policies/privacy/v1/en-1.hbs'] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
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
    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const activityMetadata = {
        termPolicyId: 'term-policy-1',
        termPolicyType: EnumTermPolicyType.privacy,
        termPolicyVersion: 1,
        timestamp,
    };

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
        contents: [existingContent],
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

    const emptyDraftTermPolicy: TermPolicy = {
        ...draftTermPolicy,
        contents: [],
    };

    const invalidContentTermPolicy: TermPolicy = {
        ...draftTermPolicy,
        contents: [{ ...existingContent, language: 'xx' }],
    };

    const publishedTermPolicy: TermPolicy = {
        ...draftTermPolicy,
        status: EnumTermPolicyStatus.published,
        publishedAt: timestamp,
    };

    const contentMaxSizeInBytes = 4096;

    let service: TermPolicyContentService;
    let helperStringService: HelperStringService;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(timestamp);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        awsS3Service.isInitialized.mockReturnValue(true);
        awsS3Service.getItemBytes.mockResolvedValue(head);
        fileService.isContentOfExtension.mockResolvedValue(true);
        activityLogQueue.recordEffect.mockReturnValue(entryEffect);
        termPolicyQueue.deleteContentEffect.mockReturnValue(deleteEffect);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyContentService,
                {
                    provide: TermPolicyRepository,
                    useValue: termPolicyRepository,
                },
                { provide: AwsS3Service, useValue: awsS3Service },
                TermPolicyUtil,
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: TermPolicyQueue, useValue: termPolicyQueue },
                { provide: FileService, useValue: fileService },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'termPolicy.uploadContentPathPattern':
                            'term-policies/{type}/v{version}',
                        'termPolicy.contentPublicPathPattern':
                            'public/term-policies/{type}/v{version}',
                        'termPolicy.content.maxSizeInBytes':
                            contentMaxSizeInBytes,
                        'termPolicy.contentKeyRandomLength': 20,
                    }),
                },
            ],
        }).compile();

        service = module.get(TermPolicyContentService);
        helperStringService = module.get(HelperStringService);
    });

    describe('assertContentText', () => {
        it('throws TermPolicyContentTypeInvalidException when the head is not a text template', async () => {
            fileService.isContentOfExtension.mockResolvedValue(false);

            const promise = service.assertContentText(existingContent.key);

            await expect(promise).rejects.toMatchObject({
                constructor: TermPolicyContentTypeInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentTypeInvalid,
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
            ).rejects.toMatchObject({
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
            });
            expect(fileService.isContentOfExtension).not.toHaveBeenCalled();
        });

        it('throws TermPolicyContentKeyInvalidException when the object is missing', async () => {
            awsS3Service.getItemBytes.mockRejectedValue(
                new NoSuchKey({ message: 'missing', $metadata: {} })
            );

            await expect(
                service.assertContentText(existingContent.key)
            ).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentKeyInvalid,
            });
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
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
            });
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

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentSizeExceeded,
            });
            expect(awsS3Service.presignPutItem).not.toHaveBeenCalled();
        });

        it('presigns a size at the configured maximum', async () => {
            termPolicyRepository.findStatusByVersionAndType.mockResolvedValue(
                null
            );
            vi.spyOn(helperStringService, 'random').mockReturnValue('abc123');
            const presign: IAwsS3Presign = {
                key: 'term-policies/privacy/v1/en-abc123.hbs',
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
            });
        });

        it('throws AwsS3NotConfiguredException when the put presign fails', async () => {
            termPolicyRepository.findStatusByVersionAndType.mockResolvedValue(
                EnumTermPolicyStatus.draft
            );
            vi.spyOn(helperStringService, 'random').mockReturnValue('abc123');
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
            });
        });

        it('returns the presign for a new draft version', async () => {
            termPolicyRepository.findStatusByVersionAndType.mockResolvedValue(
                null
            );
            vi.spyOn(helperStringService, 'random').mockReturnValue('abc123');
            const presign: IAwsS3Presign = {
                key: 'term-policies/privacy/v1/en-abc123.hbs',
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
                { key: 'term-policies/privacy/v1/en-abc123.hbs', size: 1024 },
                { forceUpdate: true, access: EnumAwsS3Accessibility.private }
            );
        });
    });

    describe('prepareUpdateContentByAdmin', () => {
        const content: ITermPolicyContentUpload = {
            language: EnumMessageLanguage.en,
            size: 2048,
            key: 'term-policies/privacy/v1/en-2.hbs',
        };

        beforeEach(() => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
        });

        it('throws TermPolicyContentSizeExceededException when size exceeds the configured max', async () => {
            const promise = service.prepareUpdateContentByAdmin(
                'term-policy-1',
                { ...content, size: contentMaxSizeInBytes + 1 }
            );

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentSizeExceeded,
            });
            expect(termPolicyRepository.findOneById).not.toHaveBeenCalled();
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
        });

        it('throws TermPolicyNotFoundException when the term policy does not exist', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.prepareUpdateContentByAdmin('term-policy-1', content)
            ).rejects.toMatchObject({
                constructor: TermPolicyNotFoundException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.notFound,
            });
        });

        it('throws TermPolicyStatusInvalidException when the term policy is published', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                publishedTermPolicy
            );

            await expect(
                service.prepareUpdateContentByAdmin('term-policy-1', content)
            ).rejects.toMatchObject({
                constructor: TermPolicyStatusInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
            });
        });

        it('throws TermPolicyContentKeyInvalidException when the key is outside the policy path', async () => {
            await expect(
                service.prepareUpdateContentByAdmin('term-policy-1', {
                    ...content,
                    key: 'other/path/en.hbs',
                })
            ).rejects.toMatchObject({
                constructor: TermPolicyContentKeyInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentKeyInvalid,
            });
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
        });

        it('throws TermPolicyContentInvalidException when the stored contents are invalid', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                invalidContentTermPolicy
            );

            await expect(
                service.prepareUpdateContentByAdmin('term-policy-1', content)
            ).rejects.toMatchObject({
                constructor: TermPolicyContentInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentInvalid,
            });
        });

        it('throws TermPolicyContentNotFoundException when the language is absent', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                emptyDraftTermPolicy
            );

            await expect(
                service.prepareUpdateContentByAdmin('term-policy-1', content)
            ).rejects.toMatchObject({
                constructor: TermPolicyContentNotFoundException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentNotFound,
            });
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
        });

        it('throws AwsS3NotConfiguredException when S3 is not initialized', async () => {
            awsS3Service.isInitialized.mockReturnValue(false);

            await expect(
                service.prepareUpdateContentByAdmin('term-policy-1', content)
            ).rejects.toMatchObject({
                constructor: AwsS3NotConfiguredException,
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
            });
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
        });

        it('throws TermPolicyContentTypeInvalidException when the head is not a text template', async () => {
            fileService.isContentOfExtension.mockResolvedValue(false);

            await expect(
                service.prepareUpdateContentByAdmin('term-policy-1', content)
            ).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentTypeInvalid,
            });
            expect(awsS3Service.getItemBytes).toHaveBeenCalledWith(
                content.key,
                FileSniffSizeInBytes,
                { access: EnumAwsS3Accessibility.private }
            );
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
        });

        it('returns the draft, its contents, the existing content, and the presigned content', async () => {
            const mapped: IAwsS3 = { ...existingContent, key: content.key };
            awsS3Service.mapPresign.mockReturnValue(mapped);

            const result = await service.prepareUpdateContentByAdmin(
                'term-policy-1',
                content
            );

            expect(result).toEqual({
                termPolicy: draftTermPolicy,
                contents: [existingContent],
                existingContent,
                mappedContent: {
                    language: EnumMessageLanguage.en,
                    ...mapped,
                },
            });
            expect(awsS3Service.mapPresign).toHaveBeenCalledWith(
                { key: content.key, size: 2048 },
                { access: EnumAwsS3Accessibility.private }
            );
        });
    });

    describe('updateContentByAdminInTx', () => {
        const replacing: ITermPolicyContentPrepared<
            ITermPolicyContent,
            ITermPolicyContent
        > = {
            termPolicy: draftTermPolicy,
            contents: [existingContent],
            existingContent,
            mappedContent: {
                ...existingContent,
                key: 'term-policies/privacy/v1/en-2.hbs',
            },
        };

        beforeEach(() => {
            termPolicyRepository.updateContentInTx.mockResolvedValue(true);
        });

        it('passes the contents, the mapped content, and the updatedAt of the draft to the guarded write on the tx', async () => {
            await service.updateContentByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                replacing
            );

            expect(termPolicyRepository.updateContentInTx).toHaveBeenCalledWith(
                tx,
                'term-policy-1',
                [existingContent],
                replacing.mappedContent,
                draftTermPolicy.updatedAt
            );
        });

        it('adds a delete effect with the replaced key after the write', async () => {
            await service.updateContentByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                replacing
            );

            expect(termPolicyQueue.deleteContentEffect).toHaveBeenCalledWith([
                existingContent.key,
            ]);
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                deleteEffect,
                entryEffect,
            ]);
            expect(outboxService.addManyInTx).toHaveBeenCalledAfter(
                termPolicyRepository.updateContentInTx
            );
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('adds no delete effect when the update keeps the key', async () => {
            await service.updateContentByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                { ...replacing, mappedContent: existingContent }
            );

            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                entryEffect,
            ]);
        });

        it('adds the update-content entry from the draft on the same tx after the write', async () => {
            await service.updateContentByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                replacing
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminTermPolicyContentUpdated,
                    metadata: activityMetadata,
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(
                tx,
                expect.arrayContaining([entryEffect])
            );
        });

        it('throws TermPolicyStatusInvalidException and adds no row when the guarded write matches no draft', async () => {
            termPolicyRepository.updateContentInTx.mockResolvedValue(false);

            await expect(
                service.updateContentByAdminInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    replacing
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyStatusInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
            });
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });

    describe('prepareAddContentByAdmin', () => {
        const content: ITermPolicyContentUpload = {
            language: EnumMessageLanguage.en,
            size: 2048,
            key: 'term-policies/privacy/v1/en-2.hbs',
        };

        beforeEach(() => {
            termPolicyRepository.findOneById.mockResolvedValue(
                emptyDraftTermPolicy
            );
        });

        it('throws TermPolicyContentSizeExceededException when size exceeds the configured max', async () => {
            await expect(
                service.prepareAddContentByAdmin('term-policy-1', {
                    ...content,
                    size: contentMaxSizeInBytes + 1,
                })
            ).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentSizeExceeded,
            });
            expect(termPolicyRepository.findOneById).not.toHaveBeenCalled();
        });

        it('throws TermPolicyNotFoundException when the term policy does not exist', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.prepareAddContentByAdmin('term-policy-1', content)
            ).rejects.toMatchObject({
                constructor: TermPolicyNotFoundException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.notFound,
            });
        });

        it('throws TermPolicyContentKeyInvalidException when the key is outside the policy path', async () => {
            await expect(
                service.prepareAddContentByAdmin('term-policy-1', {
                    ...content,
                    key: 'other/path/en.hbs',
                })
            ).rejects.toMatchObject({
                constructor: TermPolicyContentKeyInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentKeyInvalid,
            });
        });

        it('throws TermPolicyContentInvalidException when the stored contents are invalid', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                invalidContentTermPolicy
            );

            await expect(
                service.prepareAddContentByAdmin('term-policy-1', content)
            ).rejects.toMatchObject({
                constructor: TermPolicyContentInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentInvalid,
            });
        });

        it('throws TermPolicyContentExistException when the language is already present', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);

            await expect(
                service.prepareAddContentByAdmin('term-policy-1', content)
            ).rejects.toMatchObject({
                constructor: TermPolicyContentExistException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentExist,
            });
        });

        it('throws AwsS3NotConfiguredException when S3 is not initialized', async () => {
            awsS3Service.isInitialized.mockReturnValue(false);

            await expect(
                service.prepareAddContentByAdmin('term-policy-1', content)
            ).rejects.toMatchObject({
                constructor: AwsS3NotConfiguredException,
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
            });
        });

        it('throws TermPolicyContentTypeInvalidException when the head is not a text template', async () => {
            fileService.isContentOfExtension.mockResolvedValue(false);

            await expect(
                service.prepareAddContentByAdmin('term-policy-1', content)
            ).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentTypeInvalid,
            });
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
        });

        it('returns the draft, its contents, a null existing content, and the presigned content', async () => {
            const mapped: IAwsS3 = { ...existingContent, key: content.key };
            awsS3Service.mapPresign.mockReturnValue(mapped);

            const result = await service.prepareAddContentByAdmin(
                'term-policy-1',
                content
            );

            expect(result).toEqual({
                termPolicy: emptyDraftTermPolicy,
                contents: [],
                existingContent: null,
                mappedContent: {
                    language: EnumMessageLanguage.en,
                    ...mapped,
                },
            });
            expect(awsS3Service.mapPresign).toHaveBeenCalledWith(
                { key: content.key, size: 2048 },
                { access: EnumAwsS3Accessibility.private }
            );
        });
    });

    describe('addContentByAdminInTx', () => {
        const adding: ITermPolicyContentPrepared<null, ITermPolicyContent> = {
            termPolicy: emptyDraftTermPolicy,
            contents: [],
            existingContent: null,
            mappedContent: {
                ...existingContent,
                key: 'term-policies/privacy/v1/en-2.hbs',
            },
        };

        beforeEach(() => {
            termPolicyRepository.addContentInTx.mockResolvedValue(true);
        });

        it('adds the mapped content to the draft on the tx', async () => {
            await service.addContentByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                adding
            );

            expect(termPolicyRepository.addContentInTx).toHaveBeenCalledWith(
                tx,
                'term-policy-1',
                adding.mappedContent
            );
        });

        it('adds the add-content entry from the draft on the same tx after the write', async () => {
            await service.addContentByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                adding
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminTermPolicyContentAdded,
                    metadata: activityMetadata,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(outboxService.addInTx).toHaveBeenCalledAfter(
                termPolicyRepository.addContentInTx
            );
        });

        it('throws TermPolicyStatusInvalidException and adds no row when the guarded write matches no draft', async () => {
            termPolicyRepository.addContentInTx.mockResolvedValue(false);

            await expect(
                service.addContentByAdminInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    adding
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyStatusInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('prepareRemoveContentByAdmin', () => {
        beforeEach(() => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
        });

        it('throws TermPolicyNotFoundException when the term policy does not exist', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.prepareRemoveContentByAdmin(
                    'term-policy-1',
                    EnumMessageLanguage.en
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyNotFoundException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.notFound,
            });
        });

        it('throws TermPolicyStatusInvalidException when the term policy is published', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                publishedTermPolicy
            );

            await expect(
                service.prepareRemoveContentByAdmin(
                    'term-policy-1',
                    EnumMessageLanguage.en
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyStatusInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
            });
        });

        it('throws TermPolicyContentInvalidException when the stored contents are invalid', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                invalidContentTermPolicy
            );

            await expect(
                service.prepareRemoveContentByAdmin(
                    'term-policy-1',
                    EnumMessageLanguage.en
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyContentInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentInvalid,
            });
        });

        it('throws TermPolicyContentNotFoundException when the language is absent', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                emptyDraftTermPolicy
            );

            await expect(
                service.prepareRemoveContentByAdmin(
                    'term-policy-1',
                    EnumMessageLanguage.en
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyContentNotFoundException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentNotFound,
            });
        });

        it('returns the draft, its contents, the existing content, and a null mapped content', async () => {
            const result = await service.prepareRemoveContentByAdmin(
                'term-policy-1',
                EnumMessageLanguage.en
            );

            expect(result).toEqual({
                termPolicy: draftTermPolicy,
                contents: [existingContent],
                existingContent,
                mappedContent: null,
            });
        });
    });

    describe('removeContentByAdminInTx', () => {
        const removing: ITermPolicyContentPrepared<ITermPolicyContent, null> = {
            termPolicy: editedDraftTermPolicy,
            contents: [existingContent],
            existingContent,
            mappedContent: null,
        };

        beforeEach(() => {
            termPolicyRepository.removeContentInTx.mockResolvedValue(true);
        });

        it('passes the contents, the language, and the updatedAt of the draft to the guarded write on the tx', async () => {
            await service.removeContentByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                removing
            );

            expect(termPolicyRepository.removeContentInTx).toHaveBeenCalledWith(
                tx,
                'term-policy-1',
                [existingContent],
                EnumMessageLanguage.en,
                editedDraftTermPolicy.updatedAt
            );
        });

        it('adds a delete effect with the removed key after the write', async () => {
            await service.removeContentByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                removing
            );

            expect(termPolicyQueue.deleteContentEffect).toHaveBeenCalledWith([
                existingContent.key,
            ]);
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                deleteEffect,
                entryEffect,
            ]);
            expect(outboxService.addManyInTx).toHaveBeenCalledAfter(
                termPolicyRepository.removeContentInTx
            );
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('adds the remove-content entry from the draft on the same tx after the write', async () => {
            await service.removeContentByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                removing
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminTermPolicyContentRemoved,
                    metadata: {
                        ...activityMetadata,
                        timestamp,
                    },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(
                tx,
                expect.arrayContaining([entryEffect])
            );
        });

        it('throws TermPolicyStatusInvalidException and adds no row when the guarded write matches no draft', async () => {
            termPolicyRepository.removeContentInTx.mockResolvedValue(false);

            await expect(
                service.removeContentByAdminInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    removing
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyStatusInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
            });
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
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
            });
        });

        it('throws TermPolicyContentInvalidException when the stored contents are invalid', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                invalidContentTermPolicy
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
            });
        });

        it('throws TermPolicyContentNotFoundException when the language is absent', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                emptyDraftTermPolicy
            );

            await expect(
                service.getContentByAdmin(
                    'term-policy-1',
                    EnumMessageLanguage.en
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyContentNotFoundException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentNotFound,
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

    describe('getDraftById', () => {
        it('returns the term policy when it exists and is a draft', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);

            const result = await service.getDraftById('term-policy-1');

            expect(result).toBe(draftTermPolicy);
            expect(termPolicyRepository.findOneById).toHaveBeenCalledWith(
                'term-policy-1'
            );
        });

        it('throws TermPolicyNotFoundException when the term policy does not exist', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.getDraftById('term-policy-1')
            ).rejects.toMatchObject({
                constructor: TermPolicyNotFoundException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.notFound,
            });
        });

        it('throws TermPolicyStatusInvalidException when the term policy is published', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                publishedTermPolicy
            );

            await expect(
                service.getDraftById('term-policy-1')
            ).rejects.toMatchObject({
                constructor: TermPolicyStatusInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
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
