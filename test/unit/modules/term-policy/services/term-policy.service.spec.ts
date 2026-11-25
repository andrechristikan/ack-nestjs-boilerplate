import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAwsS3Accessibility } from '@generated/prisma-client/client';
import type { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsS3NotConfiguredException } from '@common/aws/exceptions/aws.s3-not-configured.exception';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { AwsSesNotConfiguredException } from '@common/aws/exceptions/aws.ses-not-configured.exception';
import { AwsSesService } from '@common/aws/services/aws.ses.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { TermPolicyQueue } from '@modules/term-policy/queues/term-policy.queue';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumActivityLogAction,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { TermPolicyService } from '@modules/term-policy/services/term-policy.service';
import { TermPolicyContentEmptyException } from '@modules/term-policy/exceptions/term-policy.content-empty.exception';
import { TermPolicyContentInvalidException } from '@modules/term-policy/exceptions/term-policy.content-invalid.exception';
import { TermPolicyContentKeyInvalidException } from '@modules/term-policy/exceptions/term-policy.content-key-invalid.exception';
import { TermPolicyExistException } from '@modules/term-policy/exceptions/term-policy.exist.exception';
import { TermPolicyLanguageDuplicateException } from '@modules/term-policy/exceptions/term-policy.language-duplicate.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import {
    EnumTermPolicyProcess,
    EnumTermPolicyQueue,
} from '@modules/term-policy/enums/term-policy.enum';
import type {
    ITermPolicyContent,
    ITermPolicyContentUpload,
    ITermPolicyCreate,
    ITermPolicyDeleteContentEffect,
    ITermPolicyPublishEffect,
    ITermPolicyPublishPrepared,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyContentService } from '@modules/term-policy/services/term-policy.content.service';
import { TermPolicyContentTypeInvalidException } from '@modules/term-policy/exceptions/term-policy.content-type-invalid.exception';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import type { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('TermPolicyService', () => {
    const termPolicyRepository: MockProxy<TermPolicyRepository> =
        mock<TermPolicyRepository>();
    const awsS3Service: MockProxy<AwsS3Service> = mock<AwsS3Service>();
    const awsSesService: MockProxy<AwsSesService> = mock<AwsSesService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const termPolicyQueue: MockProxy<TermPolicyQueue> = mock<TermPolicyQueue>();
    const termPolicyContentService: MockProxy<TermPolicyContentService> =
        mock<TermPolicyContentService>();

    const timestamp = new Date('2026-01-01T00:00:00.000Z');
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
    const publishEffect: ITermPolicyPublishEffect = {
        queue: EnumTermPolicyQueue.termPolicy,
        name: EnumTermPolicyProcess.publish,
        data: {
            proceedBy: 'admin-1',
            data: {
                termPolicyId: 'term-policy-1',
                type: EnumTermPolicyType.privacy,
                version: 1,
                recipientCutoffAt: '2026-01-01T00:00:00.000Z',
                resendNonce: null,
            },
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: 'publish-term-policy-1',
    };
    const activityMetadata = {
        termPolicyId: 'term-policy-1',
        termPolicyType: EnumTermPolicyType.privacy,
        termPolicyVersion: 1,
        timestamp,
    };

    const contentEn: ITermPolicyContent = {
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

    const draftTermPolicy: TermPolicy = {
        id: 'term-policy-1',
        type: EnumTermPolicyType.privacy,
        contents: [contentEn],
        version: 1,
        status: EnumTermPolicyStatus.draft,
        publishedAt: null,
        createdAt: timestamp,
        createdBy: null,
        updatedAt: timestamp,
        updatedBy: null,
    };

    const publishedTermPolicy: TermPolicy = {
        ...draftTermPolicy,
        status: EnumTermPolicyStatus.published,
        publishedAt: timestamp,
    };

    const emptyDraftTermPolicy: TermPolicy = {
        ...draftTermPolicy,
        contents: [],
    };

    const invalidContentTermPolicy: TermPolicy = {
        ...draftTermPolicy,
        contents: [{ ...contentEn, language: 'xx' }],
    };

    const publicEnKey: ITermPolicyContentUpload = {
        language: EnumMessageLanguage.en,
        size: 1024,
        key: 'public/term-policies/privacy/1/en.hbs',
    };

    const publicEnItem: IAwsS3 = {
        ...contentEn,
        key: publicEnKey.key,
        access: EnumAwsS3Accessibility.public,
    };

    let service: TermPolicyService;

    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(timestamp);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        awsS3Service.isInitialized.mockReturnValue(true);
        activityLogQueue.recordEffect.mockReturnValue(entryEffect);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyService,
                {
                    provide: TermPolicyContentService,
                    useValue: termPolicyContentService,
                },
                {
                    provide: TermPolicyRepository,
                    useValue: termPolicyRepository,
                },
                { provide: AwsS3Service, useValue: awsS3Service },
                { provide: AwsSesService, useValue: awsSesService },
                TermPolicyUtil,
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: TermPolicyQueue, useValue: termPolicyQueue },
                ...TestUnitKitProviders,
                {
                    provide: ConfigService,
                    useValue: buildConfigService({
                        ...TestUnitKitConfigValues,
                        'termPolicy.uploadContentPathPattern':
                            'term-policies/{type}/{version}',
                        'termPolicy.contentPublicPathPattern':
                            'public/term-policies/{type}/{version}',
                        'termPolicy.content.maxSizeInBytes': 4096,
                        'termPolicy.contentKeyRandomLength': 20,
                    }),
                },
            ],
        }).compile();

        service = module.get(TermPolicyService);
    });

    describe('assertEmailDeliverable', () => {
        it('throws AwsSesNotConfiguredException when SES is not initialized', () => {
            awsSesService.isInitialized.mockReturnValue(false);

            expect(() => service.assertEmailDeliverable()).toThrow(
                AwsSesNotConfiguredException
            );
        });

        it('returns when SES is initialized', () => {
            awsSesService.isInitialized.mockReturnValue(true);

            expect(() => service.assertEmailDeliverable()).not.toThrow();
        });
    });

    describe('getListByAdmin', () => {
        it('delegates to the repository with pagination, type, and status filters', async () => {
            const params = { skip: 0, limit: 20, orderBy: [] };
            const page = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [] as TermPolicy[],
            };
            termPolicyRepository.find.mockResolvedValue(page);

            const result = await service.getListByAdmin(
                params,
                { type: { in: ['privacy'] } },
                { status: { in: ['draft'] } }
            );

            expect(result).toBe(page);
            expect(termPolicyRepository.find).toHaveBeenCalledWith(
                params,
                { type: { in: ['privacy'] } },
                { status: { in: ['draft'] } }
            );
        });

        it('passes null filters when none is given', async () => {
            const pagination: IPaginationQueryOffsetParams = {
                skip: 0,
                limit: 20,
                orderBy: [],
            };
            const page: IResponsePaginationReturn<TermPolicy> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            termPolicyRepository.find.mockResolvedValue(page);

            const result = await service.getListByAdmin(pagination);

            expect(result).toBe(page);
            expect(termPolicyRepository.find).toHaveBeenCalledWith(
                pagination,
                null,
                null
            );
        });
    });

    describe('getListPublished', () => {
        it('delegates to the repository with pagination and type filter', async () => {
            const params = {
                limit: 20,
                orderBy: [],
                fingerprint: 'aaaaaaaaaaaaaaaa',
            };
            const page = {
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [] as TermPolicy[],
            };
            termPolicyRepository.findPublished.mockResolvedValue(page);

            const result = await service.getListPublished(params, {
                type: { in: ['privacy'] },
            });

            expect(result).toBe(page);
            expect(termPolicyRepository.findPublished).toHaveBeenCalledWith(
                params,
                { type: { in: ['privacy'] } }
            );
        });

        it('passes a null type filter when none is given', async () => {
            const pagination: IPaginationQueryCursorParams = {
                fingerprint: 'aaaaaaaaaaaaaaaa',
                limit: 20,
                orderBy: [],
            };
            const page: IResponsePaginationReturn<TermPolicy> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            termPolicyRepository.findPublished.mockResolvedValue(page);

            const result = await service.getListPublished(pagination);

            expect(result).toBe(page);
            expect(termPolicyRepository.findPublished).toHaveBeenCalledWith(
                pagination,
                null
            );
        });
    });

    describe('prepareCreateByAdmin', () => {
        const create: ITermPolicyCreate = {
            type: EnumTermPolicyType.privacy,
            version: 1,
            contents: [
                {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'term-policies/privacy/1/en.hbs',
                },
            ],
        };

        beforeEach(() => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
        });

        it('throws TermPolicyExistException when the version and type already exist', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(true);

            await expect(
                service.prepareCreateByAdmin({ ...create, contents: [] })
            ).rejects.toMatchObject({
                constructor: TermPolicyExistException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.exist,
            });
        });

        it('throws TermPolicyLanguageDuplicateException when languages repeat', async () => {
            await expect(
                service.prepareCreateByAdmin({
                    ...create,
                    contents: [
                        ...create.contents,
                        {
                            language: EnumMessageLanguage.en,
                            size: 1024,
                            key: 'b.hbs',
                        },
                    ],
                })
            ).rejects.toMatchObject({
                constructor: TermPolicyLanguageDuplicateException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.languageDuplicate,
            });
        });

        it('throws TermPolicyContentKeyInvalidException when a content key is outside the policy path', async () => {
            const promise = service.prepareCreateByAdmin({
                ...create,
                contents: [
                    {
                        language: EnumMessageLanguage.en,
                        size: 1024,
                        key: 'other/path/en.hbs',
                    },
                ],
            });

            await expect(promise).rejects.toMatchObject({
                constructor: TermPolicyContentKeyInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentKeyInvalid,
            });
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
        });

        it('throws TermPolicyContentSizeExceededException when a content size exceeds the configured max', async () => {
            const promise = service.prepareCreateByAdmin({
                ...create,
                contents: [
                    {
                        language: EnumMessageLanguage.en,
                        size: 999999,
                        key: 'term-policies/privacy/1/b.hbs',
                    },
                ],
            });

            await expect(promise).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentSizeExceeded,
            });
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
        });

        it('throws AwsS3NotConfiguredException when S3 is not initialized', async () => {
            awsS3Service.isInitialized.mockReturnValue(false);

            await expect(
                service.prepareCreateByAdmin(create)
            ).rejects.toMatchObject({
                constructor: AwsS3NotConfiguredException,
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
            });
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
        });

        it('throws the content text exception when a content is not a text template', async () => {
            termPolicyContentService.assertContentText.mockRejectedValueOnce(
                new TermPolicyContentTypeInvalidException()
            );

            await expect(
                service.prepareCreateByAdmin(create)
            ).rejects.toMatchObject({
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentTypeInvalid,
            });
            expect(
                termPolicyContentService.assertContentText
            ).toHaveBeenCalledExactlyOnceWith('term-policies/privacy/1/en.hbs');
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
        });

        it('returns the contents presigned as private', async () => {
            const mapped: IAwsS3 = { ...contentEn };
            awsS3Service.mapPresign.mockReturnValue(mapped);

            const result = await service.prepareCreateByAdmin(create);

            expect(result).toEqual({
                contents: [{ language: EnumMessageLanguage.en, ...mapped }],
            });
            expect(awsS3Service.mapPresign).toHaveBeenCalledWith(
                { key: 'term-policies/privacy/1/en.hbs', size: 1024 },
                { access: EnumAwsS3Accessibility.private }
            );
        });
    });

    describe('createByAdminInTx', () => {
        const create: ITermPolicyCreate = {
            type: EnumTermPolicyType.privacy,
            version: 1,
            contents: [
                {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'term-policies/privacy/1/en.hbs',
                },
            ],
        };
        const contents: ITermPolicyContent[] = [contentEn];

        it('creates the term policy with the given id and presigned contents on the tx', async () => {
            termPolicyRepository.createInTx.mockResolvedValue(draftTermPolicy);

            const result = await service.createByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                create,
                contents
            );

            expect(result).toBe(draftTermPolicy);
            expect(termPolicyRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'term-policy-1',
                EnumTermPolicyType.privacy,
                1,
                contents
            );
        });

        it('adds the create entry from the id, type, and version on the same tx after the write', async () => {
            termPolicyRepository.createInTx.mockResolvedValue(draftTermPolicy);

            await service.createByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                create,
                contents
            );

            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminTermPolicyCreated,
                    metadata: activityMetadata,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(outboxService.addInTx).toHaveBeenCalledAfter(
                termPolicyRepository.createInTx
            );
        });

        it('adds no row when the insert rejects', async () => {
            const failure = new Error('insert failed');
            termPolicyRepository.createInTx.mockRejectedValue(failure);

            await expect(
                service.createByAdminInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    create,
                    contents
                )
            ).rejects.toBe(failure);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });

    describe('deleteContentKeys', () => {
        it('deletes the private content keys', async () => {
            await service.deleteContentKeys([
                'term-policies/privacy/1/en-a.hbs',
            ]);

            expect(awsS3Service.deleteItems).toHaveBeenCalledWith(
                ['term-policies/privacy/1/en-a.hbs'],
                { access: EnumAwsS3Accessibility.private }
            );
        });

        it('rethrows the S3 failure', async () => {
            const failure = new Error('s3 down');
            awsS3Service.deleteItems.mockRejectedValue(failure);

            const rejection = service.deleteContentKeys([
                'term-policies/privacy/1/en-a.hbs',
            ]);

            await expect(rejection).rejects.toBe(failure);
        });
    });

    describe('deleteByAdminInTx', () => {
        const deleteContentEffect: ITermPolicyDeleteContentEffect = {
            queue: EnumTermPolicyQueue.termPolicy,
            name: EnumTermPolicyProcess.deleteContent,
            data: { keys: [contentEn.key] },
            priority: EnumQueuePriority.low,
            idempotencyKey: null,
        };

        it('deletes the draft, adds the content delete row on the tx, and returns the deleted row', async () => {
            termPolicyQueue.deleteContentEffect.mockReturnValue(
                deleteContentEffect
            );
            termPolicyRepository.deleteDraftInTx.mockResolvedValue(
                draftTermPolicy
            );

            const result = await service.deleteByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                draftTermPolicy
            );

            expect(result).toBe(draftTermPolicy);
            expect(termPolicyRepository.deleteDraftInTx).toHaveBeenCalledWith(
                tx,
                'term-policy-1'
            );
            expect(termPolicyQueue.deleteContentEffect).toHaveBeenCalledWith([
                contentEn.key,
            ]);
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                deleteContentEffect,
                entryEffect,
            ]);
            expect(outboxService.addManyInTx).toHaveBeenCalledAfter(
                termPolicyRepository.deleteDraftInTx
            );
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('adds no content delete effect when the deleted row holds no content', async () => {
            termPolicyRepository.deleteDraftInTx.mockResolvedValue(
                emptyDraftTermPolicy
            );

            await service.deleteByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                draftTermPolicy
            );

            expect(termPolicyQueue.deleteContentEffect).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                entryEffect,
            ]);
        });

        it('builds the content keys and the delete entry from the deleted row, not the row read before the transaction', async () => {
            termPolicyQueue.deleteContentEffect.mockReturnValue(
                deleteContentEffect
            );
            termPolicyRepository.deleteDraftInTx.mockResolvedValue({
                ...draftTermPolicy,
                version: 2,
            });

            await service.deleteByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                emptyDraftTermPolicy
            );

            expect(termPolicyQueue.deleteContentEffect).toHaveBeenCalledWith([
                contentEn.key,
            ]);
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminTermPolicyDeleted,
                    metadata: { ...activityMetadata, termPolicyVersion: 2 },
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(
                tx,
                expect.arrayContaining([entryEffect])
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledAfter(
                termPolicyRepository.deleteDraftInTx
            );
        });

        it('passes the exception the guarded delete rejects with and adds no row', async () => {
            const failure = new TermPolicyStatusInvalidException();
            termPolicyRepository.deleteDraftInTx.mockRejectedValue(failure);

            await expect(
                service.deleteByAdminInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    draftTermPolicy
                )
            ).rejects.toBe(failure);
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });

    describe('preparePublishByAdmin', () => {
        beforeEach(() => {
            termPolicyContentService.getDraftById.mockResolvedValue(
                draftTermPolicy
            );
            termPolicyRepository.existsNewerPublished.mockResolvedValue(false);
            awsS3Service.mapPresign.mockReturnValue(publicEnItem);
        });

        it('throws TermPolicyNotFoundException when the term policy does not exist', async () => {
            const failure = new TermPolicyNotFoundException();
            termPolicyContentService.getDraftById.mockRejectedValue(failure);

            await expect(
                service.preparePublishByAdmin('term-policy-1')
            ).rejects.toBe(failure);
            expect(awsS3Service.copyItems).not.toHaveBeenCalled();
        });

        it('throws TermPolicyContentInvalidException when the stored contents are invalid', async () => {
            termPolicyContentService.getDraftById.mockResolvedValue(
                invalidContentTermPolicy
            );

            await expect(
                service.preparePublishByAdmin('term-policy-1')
            ).rejects.toMatchObject({
                constructor: TermPolicyContentInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentInvalid,
            });
            expect(awsS3Service.copyItems).not.toHaveBeenCalled();
        });

        it('throws TermPolicyContentEmptyException when there is no content', async () => {
            termPolicyContentService.getDraftById.mockResolvedValue(
                emptyDraftTermPolicy
            );

            await expect(
                service.preparePublishByAdmin('term-policy-1')
            ).rejects.toMatchObject({
                constructor: TermPolicyContentEmptyException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentEmpty,
            });
            expect(awsS3Service.copyItems).not.toHaveBeenCalled();
        });

        it('throws AwsS3NotConfiguredException when S3 is not initialized', async () => {
            awsS3Service.isInitialized.mockReturnValue(false);

            await expect(
                service.preparePublishByAdmin('term-policy-1')
            ).rejects.toMatchObject({
                constructor: AwsS3NotConfiguredException,
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.s3NotConfigured,
            });
            expect(awsS3Service.copyItems).not.toHaveBeenCalled();
        });

        it('throws TermPolicyStatusInvalidException when a newer version of the type is already published', async () => {
            termPolicyRepository.existsNewerPublished.mockResolvedValue(true);

            await expect(
                service.preparePublishByAdmin('term-policy-1')
            ).rejects.toMatchObject({
                constructor: TermPolicyStatusInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
            });
            expect(
                termPolicyRepository.existsNewerPublished
            ).toHaveBeenCalledWith(EnumTermPolicyType.privacy, 1);
            expect(awsS3Service.copyItems).not.toHaveBeenCalled();
        });

        it('copies the draft contents to the public destination after every check and returns the draft with the public contents', async () => {
            const result = await service.preparePublishByAdmin('term-policy-1');

            expect(result).toEqual({
                termPolicy: draftTermPolicy,
                publicContents: [
                    { ...publicEnItem, language: contentEn.language },
                ],
            });
            expect(awsS3Service.mapPresign).toHaveBeenCalledWith(
                { key: publicEnKey.key, size: 1024 },
                { access: EnumAwsS3Accessibility.public }
            );
            expect(awsS3Service.copyItems).toHaveBeenCalledWith(
                [contentEn],
                'public/term-policies/privacy/1',
                { access: EnumAwsS3Accessibility.public }
            );
            expect(awsS3Service.copyItems).toHaveBeenCalledAfter(
                termPolicyRepository.existsNewerPublished
            );
        });

        it('rejects with the copy failure', async () => {
            const copyError = new Error('copy failed');
            awsS3Service.copyItems.mockRejectedValue(copyError);

            await expect(
                service.preparePublishByAdmin('term-policy-1')
            ).rejects.toBe(copyError);
        });
    });

    describe('publishByAdminInTx', () => {
        const prepared: ITermPolicyPublishPrepared = {
            termPolicy: draftTermPolicy,
            publicContents: [{ ...publicEnItem, language: contentEn.language }],
        };

        beforeEach(() => {
            termPolicyRepository.publishInTx.mockResolvedValue(
                publishedTermPolicy
            );
            termPolicyRepository.archivePublishedByTypeInTx.mockResolvedValue(
                1
            );
            termPolicyQueue.publishEffect.mockReturnValue(publishEffect);
        });

        it('publishes the public contents with the drawn publishedAt, archives the earlier versions from the returned row, and returns the row', async () => {
            const result = await service.publishByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                prepared
            );

            expect(result).toBe(publishedTermPolicy);
            expect(termPolicyRepository.publishInTx).toHaveBeenCalledWith(
                tx,
                'term-policy-1',
                prepared.publicContents,
                timestamp
            );
            expect(
                termPolicyRepository.archivePublishedByTypeInTx
            ).toHaveBeenCalledWith(tx, EnumTermPolicyType.privacy, 1);
            expect(
                termPolicyRepository.archivePublishedByTypeInTx
            ).toHaveBeenCalledAfter(termPolicyRepository.publishInTx);
        });

        it('archives only the versions below the one the returned row carries', async () => {
            termPolicyRepository.publishInTx.mockResolvedValue({
                ...publishedTermPolicy,
                version: 3,
            });

            await service.publishByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                prepared
            );

            expect(
                termPolicyRepository.archivePublishedByTypeInTx
            ).toHaveBeenCalledWith(tx, EnumTermPolicyType.privacy, 3);
        });

        it('builds the publish effect and the entry from the returned row and adds both on the same tx after the archive', async () => {
            await service.publishByAdminInTx(
                tx,
                requestContext,
                apiKeyContext,
                authContext,
                prepared
            );

            expect(termPolicyQueue.publishEffect).toHaveBeenCalledWith(
                {
                    termPolicyId: 'term-policy-1',
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                    recipientCutoffAt: '2026-01-01T00:00:00.000Z',
                    resendNonce: null,
                },
                'admin-1'
            );
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminTermPolicyPublished,
                    metadata: activityMetadata,
                }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                publishEffect,
                entryEffect,
            ]);
            expect(outboxService.addManyInTx).toHaveBeenCalledAfter(
                termPolicyRepository.archivePublishedByTypeInTx
            );
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('passes the exception the guarded publish rejects with and adds no row', async () => {
            const failure = new TermPolicyStatusInvalidException();
            termPolicyRepository.publishInTx.mockRejectedValue(failure);

            await expect(
                service.publishByAdminInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    prepared
                )
            ).rejects.toBe(failure);
            expect(
                termPolicyRepository.archivePublishedByTypeInTx
            ).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });
    });

    describe('getPublishedByAdmin', () => {
        it('throws TermPolicyNotFoundException when the term policy does not exist', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.getPublishedByAdmin('term-policy-1')
            ).rejects.toMatchObject({
                constructor: TermPolicyNotFoundException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.notFound,
            });
        });

        it('throws TermPolicyStatusInvalidException for a draft', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);

            await expect(
                service.getPublishedByAdmin('term-policy-1')
            ).rejects.toMatchObject({
                constructor: TermPolicyStatusInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
            });
        });

        it('returns the published term policy', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                publishedTermPolicy
            );

            const result = await service.getPublishedByAdmin('term-policy-1');

            expect(result).toBe(publishedTermPolicy);
        });
    });

    describe('validateUniqueLanguages', () => {
        it('returns true when every language is unique', () => {
            const contents: TermPolicyContentRequestDto[] = [
                {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'term-policies/privacy/v1/en.hbs',
                },
            ];
            expect(service['validateUniqueLanguages'](contents)).toBe(true);
        });

        it('returns false when a language repeats', () => {
            const contents: TermPolicyContentRequestDto[] = [
                {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'term-policies/privacy/v1/en.hbs',
                },
                {
                    language: EnumMessageLanguage.en,
                    size: 2048,
                    key: 'term-policies/privacy/v1/en-2.hbs',
                },
            ];
            expect(service['validateUniqueLanguages'](contents)).toBe(false);
        });
    });

    describe('mapPublicContentKeys', () => {
        it('maps each content to its public key under the public path with no S3 call', () => {
            const result = service['mapPublicContentKeys'](
                {
                    id: 'term-policy-1',
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                },
                [contentEn]
            );

            expect(result).toEqual([publicEnKey]);
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
        });
    });
});
