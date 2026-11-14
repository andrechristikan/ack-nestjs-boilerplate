import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import type { IAwsS3 } from '@common/aws/interfaces/aws.interface';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsS3NotConfiguredException } from '@common/aws/exceptions/aws.s3-not-configured.exception';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import type {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import {
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumActivityLogAction,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    Prisma,
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
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type {
    ITermPolicyContent,
    ITermPolicyContentUpload,
} from '@modules/term-policy/interfaces/term-policy.interface';
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
    const termPolicyUtil: MockProxy<TermPolicyUtil> = mock<TermPolicyUtil>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();

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
    const entryEffect: IOutboxEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const activityMetadata = { termPolicyId: 'term-policy-1' };

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

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockReturnValue('{process}-{termPolicyId}');
        awsS3Service.isInitialized.mockReturnValue(true);
        termPolicyUtil.toContents.mockReturnValue([contentEn]);
        termPolicyUtil.isContentSizeAllowed.mockReturnValue(true);
        termPolicyUtil.isContentKeyInPath.mockReturnValue(true);
        messageService.setMessage.mockImplementation((path: string) => path);
        helperDateService.create.mockReturnValue(timestamp);
        termPolicyUtil.mapActivityLogMetadata.mockReturnValue(activityMetadata);
        activityLogService.recordEffect.mockReturnValue(entryEffect);
        outboxService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyService,
                {
                    provide: TermPolicyRepository,
                    useValue: termPolicyRepository,
                },
                { provide: AwsS3Service, useValue: awsS3Service },
                { provide: TermPolicyUtil, useValue: termPolicyUtil },
                { provide: MessageService, useValue: messageService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperArrayService, useValue: helperArrayService },
                { provide: OutboxService, useValue: outboxService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: NotificationService, useValue: notificationService },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ConfigService, useValue: configService },
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();

        service = module.get(TermPolicyService);
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
            const pagination: IPaginationQueryOffsetParams<Prisma.TermPolicyWhereInput> =
                { skip: 0, limit: 20, orderBy: [] };
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
            const pagination: IPaginationQueryCursorParams<Prisma.TermPolicyWhereInput> =
                {
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

    describe('createByAdmin', () => {
        it('throws TermPolicyExistException when the version and type already exist', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(true);

            await expect(
                service.createByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    {
                        type: EnumTermPolicyType.privacy,
                        version: 1,
                        contents: [],
                    }
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyExistException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.exist,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.exist
                    ],
                messagePath: 'termPolicy.error.exist',
            });
            expect(helperArrayService.unique).not.toHaveBeenCalled();
        });

        it('throws TermPolicyLanguageDuplicateException when languages repeat', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
            helperArrayService.unique.mockReturnValue([EnumMessageLanguage.en]);

            await expect(
                service.createByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    {
                        type: EnumTermPolicyType.privacy,
                        version: 1,
                        contents: [
                            {
                                language: EnumMessageLanguage.en,
                                size: 1024,
                                key: 'a.hbs',
                            },
                            {
                                language: EnumMessageLanguage.en,
                                size: 1024,
                                key: 'b.hbs',
                            },
                        ],
                    }
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyLanguageDuplicateException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.languageDuplicate,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.languageDuplicate
                    ],
                messagePath: 'termPolicy.error.contentsLanguageMustBeUnique',
            });
            expect(termPolicyRepository.createInTx).not.toHaveBeenCalled();
        });

        it('throws TermPolicyContentKeyInvalidException and writes nothing when a content key is outside the policy path', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
            helperArrayService.unique.mockImplementation(array => array);
            termPolicyUtil.isContentKeyInPath.mockReturnValueOnce(true);
            termPolicyUtil.isContentKeyInPath.mockReturnValueOnce(false);

            const promise = service.createByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                    contents: [
                        {
                            language: EnumMessageLanguage.en,
                            size: 1024,
                            key: 'term-policies/privacy/1/en.hbs',
                        },
                        {
                            language: EnumMessageLanguage.en,
                            size: 1024,
                            key: 'other/path/en.hbs',
                        },
                    ],
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
                EnumTermPolicyType.privacy,
                1,
                'other/path/en.hbs'
            );
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
            expect(termPolicyRepository.createInTx).not.toHaveBeenCalled();
        });

        it('throws TermPolicyContentSizeExceededException and writes nothing when a content size exceeds the configured max', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
            helperArrayService.unique.mockImplementation(array => array);
            termPolicyUtil.isContentSizeAllowed.mockReturnValueOnce(true);
            termPolicyUtil.isContentSizeAllowed.mockReturnValueOnce(false);

            const promise = service.createByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                    contents: [
                        {
                            language: EnumMessageLanguage.en,
                            size: 1024,
                            key: 'a.hbs',
                        },
                        {
                            language: EnumMessageLanguage.en,
                            size: 999999,
                            key: 'b.hbs',
                        },
                    ],
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
                httpStatus: 400,
            });
            expect(termPolicyUtil.isContentSizeAllowed).toHaveBeenCalledWith(
                999999
            );
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
            expect(termPolicyRepository.createInTx).not.toHaveBeenCalled();
        });

        it('throws AwsS3NotConfiguredException when S3 is not initialized', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
            helperArrayService.unique.mockImplementation(array => array);
            awsS3Service.isInitialized.mockReturnValue(false);

            const promise = service.createByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                    contents: [
                        {
                            language: EnumMessageLanguage.en,
                            size: 1024,
                            key: 'term-policies/privacy/1/en.hbs',
                        },
                    ],
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
                messagePath: 'aws.error.s3NotConfigured',
            });
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
            expect(termPolicyRepository.createInTx).not.toHaveBeenCalled();
        });

        it('creates the term policy with the given id and presigned contents', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
            helperArrayService.unique.mockImplementation(array => array);
            const mapped: IAwsS3 = { ...contentEn };
            awsS3Service.mapPresign.mockReturnValue(mapped);
            termPolicyRepository.createInTx.mockResolvedValue(draftTermPolicy);

            const result = await service.createByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                    contents: [
                        {
                            language: EnumMessageLanguage.en,
                            size: 1024,
                            key: 'term-policies/privacy/1/en.hbs',
                        },
                    ],
                }
            );

            expect(result).toBe(draftTermPolicy);
            expect(awsS3Service.mapPresign).toHaveBeenCalledWith(
                {
                    key: 'term-policies/privacy/1/en.hbs',
                    size: 1024,
                },
                { access: EnumAwsS3Accessibility.private }
            );
            expect(termPolicyRepository.createInTx).toHaveBeenCalledWith(
                tx,
                'term-policy-1',
                {
                    contents: [
                        {
                            language: EnumMessageLanguage.en,
                            size: 1024,
                            key: 'term-policies/privacy/1/en.hbs',
                        },
                    ],
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                },
                [{ language: EnumMessageLanguage.en, ...mapped }]
            );
        });

        it('adds the create entry from the id, type, and version on the same tx after the write', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
            helperArrayService.unique.mockImplementation(array => array);
            awsS3Service.mapPresign.mockReturnValue({ ...contentEn });
            termPolicyRepository.createInTx.mockResolvedValue(draftTermPolicy);

            await service.createByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                    contents: [
                        {
                            language: EnumMessageLanguage.en,
                            size: 1024,
                            key: 'term-policies/privacy/1/en.hbs',
                        },
                    ],
                }
            );

            expect(termPolicyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                {
                    id: 'term-policy-1',
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                },
                timestamp
            );
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                authContext,
                null,
                {
                    action: EnumActivityLogAction.adminTermPolicyCreate,
                    metadata: activityMetadata,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
            expect(outboxService.addInTx).toHaveBeenCalledAfter(
                termPolicyRepository.createInTx
            );
        });

        it('rethrows an AppBaseException raised while creating', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
            helperArrayService.unique.mockImplementation(array => array);
            const error = new TermPolicyExistException();
            awsS3Service.mapPresign.mockImplementation(() => {
                throw error;
            });

            const promise = service.createByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1',
                {
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                    contents: [
                        {
                            language: EnumMessageLanguage.en,
                            size: 1024,
                            key: 'a.hbs',
                        },
                    ],
                }
            );

            await expect(promise).rejects.toBe(error);
            await expect(promise).rejects.toMatchObject({
                constructor: TermPolicyExistException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.exist,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.exist
                    ],
                messagePath: 'termPolicy.error.exist',
            });
        });

        it('throws TermPolicyExistException on a version collision', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
            helperArrayService.unique.mockImplementation(array => array);
            awsS3Service.mapPresign.mockReturnValue({ ...contentEn });
            const collision = new Error('unique violation');
            termPolicyRepository.createInTx.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                service.createByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    {
                        type: EnumTermPolicyType.privacy,
                        version: 1,
                        contents: [
                            {
                                language: EnumMessageLanguage.en,
                                size: 1024,
                                key: 'a.hbs',
                            },
                        ],
                    }
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyExistException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.exist,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.exist
                    ],
                messagePath: 'termPolicy.error.exist',
            });
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'version'
            );
        });

        it('wraps a non-AppBaseException failure in AppUnknownException', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
            helperArrayService.unique.mockImplementation(array => array);
            awsS3Service.mapPresign.mockReturnValue({ ...contentEn });
            const cause = new Error('write failed');
            termPolicyRepository.createInTx.mockRejectedValue(cause);
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                service.createByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1',
                    {
                        type: EnumTermPolicyType.privacy,
                        version: 1,
                        contents: [
                            {
                                language: EnumMessageLanguage.en,
                                size: 1024,
                                key: 'a.hbs',
                            },
                        ],
                    }
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: cause,
            });
        });
    });

    describe('deleteContentDir', () => {
        it('deletes the private content directory', async () => {
            await service.deleteContentDir('term-policies/privacy/1');

            expect(awsS3Service.deleteDir).toHaveBeenCalledWith(
                'term-policies/privacy/1',
                { access: EnumAwsS3Accessibility.private }
            );
        });

        it('rethrows the S3 failure', async () => {
            const failure = new Error('s3 down');
            awsS3Service.deleteDir.mockRejectedValue(failure);

            const rejection = service.deleteContentDir(
                'term-policies/privacy/1'
            );

            await expect(rejection).rejects.toBe(failure);
        });
    });

    describe('deleteByAdmin', () => {
        const deleteContentEffect: IOutboxEffect = {
            queue: EnumTermPolicyQueue.termPolicy,
            name: EnumTermPolicyProcess.deleteContent,
            data: { path: 'term-policies/privacy/1' },
            priority: EnumQueuePriority.low,
            idempotencyKey: null,
        };

        it('deletes the draft and adds the content delete row on one outbox tx', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getPath.mockReturnValue('term-policies/privacy/1');
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
            termPolicyRepository.deleteDraftInTx.mockResolvedValue(true);

            const result = await service.deleteByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1'
            );

            expect(result).toBe(draftTermPolicy);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(termPolicyRepository.deleteDraftInTx).toHaveBeenCalledWith(
                tx,
                'term-policy-1'
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                deleteContentEffect
            );
            expect(outboxService.addInTx).toHaveBeenCalledAfter(
                termPolicyRepository.deleteDraftInTx
            );
        });

        it('adds the delete entry from the deleted term policy on the same tx after the delete', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getPath.mockReturnValue('term-policies/privacy/1');
            termPolicyRepository.deleteDraftInTx.mockResolvedValue(true);

            await service.deleteByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1'
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
                    action: EnumActivityLogAction.adminTermPolicyDelete,
                    metadata: activityMetadata,
                }
            );
            expect(outboxService.addInTx).toHaveBeenCalledWith(tx, entryEffect);
        });

        it('throws TermPolicyNotFoundException when the term policy does not exist', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.deleteByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
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

        it('throws TermPolicyStatusInvalidException when the term policy is not a draft', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                publishedTermPolicy
            );

            await expect(
                service.deleteByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
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

        it('throws TermPolicyStatusInvalidException and adds no row when the guarded delete removes no row', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getPath.mockReturnValue('term-policies/privacy/1');
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
            termPolicyRepository.deleteDraftInTx.mockResolvedValue(false);

            await expect(
                service.deleteByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
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
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('throws TermPolicyStatusInvalidException when the delete transaction hits a write conflict', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getPath.mockReturnValue('term-policies/privacy/1');
            const conflict = new Prisma.PrismaClientKnownRequestError(
                'write conflict',
                { code: 'P2034', clientVersion: 'test' }
            );
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.deleteByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
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
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('does not call S3 in the request', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getPath.mockReturnValue('term-policies/privacy/1');
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
            termPolicyRepository.deleteDraftInTx.mockResolvedValue(true);

            await service.deleteByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1'
            );

            expect(awsS3Service.deleteDir).not.toHaveBeenCalled();
        });

        it('adds no row when the guarded delete rejects', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getPath.mockReturnValue('term-policies/privacy/1');
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
            termPolicyRepository.deleteDraftInTx.mockRejectedValue(
                new Error('delete failed')
            );

            await expect(
                service.deleteByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
                )
            ).rejects.toBeInstanceOf(AppUnknownException);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException raised while deleting', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            const error = new TermPolicyNotFoundException();
            termPolicyUtil.getPath.mockImplementation(() => {
                throw error;
            });

            const promise = service.deleteByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1'
            );

            await expect(promise).rejects.toBe(error);
            await expect(promise).rejects.toMatchObject({
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

        it('wraps a mapped database error that is not a write conflict in AppUnknownException', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getPath.mockReturnValue('term-policies/privacy/1');
            const cause = new Prisma.PrismaClientKnownRequestError(
                'unavailable',
                { code: 'P2024', clientVersion: 'test' }
            );
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(
                new DatabaseUnavailableException()
            );

            await expect(
                service.deleteByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: cause,
            });
        });

        it('wraps a non-AppBaseException failure in AppUnknownException', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getPath.mockReturnValue('term-policies/privacy/1');
            const cause = new Error('delete failed');
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.deleteByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: cause,
            });
        });
    });

    describe('publishByAdmin', () => {
        it('throws TermPolicyNotFoundException when the term policy does not exist', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.publishByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
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

        describe('with a publishable draft', () => {
            beforeEach(() => {
                termPolicyRepository.findOneById.mockResolvedValue(
                    draftTermPolicy
                );
                termPolicyUtil.getContentPublicPath.mockReturnValue(
                    'public/term-policies/privacy/1'
                );
                awsS3Service.mapPresign.mockReturnValue(publicEnItem);
                outboxService.withTransaction.mockImplementation(
                    async fn => fn(tx) as never
                );
                termPolicyRepository.publishInTx.mockResolvedValue(true);
                termPolicyRepository.findOneByIdInTx.mockResolvedValue(
                    publishedTermPolicy
                );
                termPolicyRepository.archivePublishedByTypeInTx.mockResolvedValue(
                    1
                );
                termPolicyRepository.existsNewerPublishedInTx.mockResolvedValue(
                    false
                );
            });

            it('adds the publish entry from the published row on the same tx', async () => {
                await service.publishByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
                );

                expect(
                    termPolicyUtil.mapActivityLogMetadata
                ).toHaveBeenCalledWith(
                    publishedTermPolicy,
                    publishedTermPolicy.updatedAt
                );
                expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    null,
                    {
                        action: EnumActivityLogAction.adminTermPolicyPublish,
                        metadata: activityMetadata,
                    }
                );
                expect(outboxService.addInTx).toHaveBeenCalledWith(
                    tx,
                    entryEffect
                );
            });

            it('archives only the versions below the one it publishes', async () => {
                termPolicyRepository.findOneById.mockResolvedValue({
                    ...draftTermPolicy,
                    version: 3,
                });
                termPolicyRepository.findOneByIdInTx.mockResolvedValue({
                    ...publishedTermPolicy,
                    version: 3,
                });

                await service.publishByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
                );

                expect(
                    termPolicyRepository.archivePublishedByTypeInTx
                ).toHaveBeenCalledWith(tx, EnumTermPolicyType.privacy, 3);
                expect(
                    termPolicyRepository.existsNewerPublishedInTx
                ).toHaveBeenCalledWith(tx, EnumTermPolicyType.privacy, 3);
            });

            it('throws TermPolicyStatusInvalidException when a newer version of the type is already published', async () => {
                termPolicyRepository.existsNewerPublishedInTx.mockResolvedValue(
                    true
                );

                await expect(
                    service.publishByAdmin(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        'term-policy-1'
                    )
                ).rejects.toMatchObject({
                    constructor: TermPolicyStatusInvalidException,
                    module: 'termPolicy',
                    statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
                    messagePath: 'termPolicy.error.statusInvalid',
                });
            });

            it('throws TermPolicyStatusInvalidException for a published policy before any S3 or write', async () => {
                termPolicyRepository.findOneById.mockResolvedValue(
                    publishedTermPolicy
                );

                await expect(
                    service.publishByAdmin(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        'term-policy-1'
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
                expect(awsS3Service.copyItems).not.toHaveBeenCalled();
                expect(outboxService.withTransaction).not.toHaveBeenCalled();
            });

            it('throws TermPolicyStatusInvalidException for an archived policy before any S3 or write', async () => {
                termPolicyRepository.findOneById.mockResolvedValue({
                    ...publishedTermPolicy,
                    status: EnumTermPolicyStatus.archived,
                });

                await expect(
                    service.publishByAdmin(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        'term-policy-1'
                    )
                ).rejects.toMatchObject({
                    constructor: TermPolicyStatusInvalidException,
                    statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
                });
                expect(awsS3Service.copyItems).not.toHaveBeenCalled();
                expect(outboxService.withTransaction).not.toHaveBeenCalled();
            });

            it('throws TermPolicyStatusInvalidException when publishInTx loses the race', async () => {
                termPolicyRepository.publishInTx.mockResolvedValue(false);

                await expect(
                    service.publishByAdmin(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        'term-policy-1'
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
                expect(
                    termPolicyRepository.archivePublishedByTypeInTx
                ).not.toHaveBeenCalled();
            });

            it('wraps a failure after the archive in AppUnknownException', async () => {
                const cause = new Error('commit failed');
                outboxService.withTransaction.mockImplementation(async fn => {
                    await fn(tx);

                    throw cause;
                });

                await expect(
                    service.publishByAdmin(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        'term-policy-1'
                    )
                ).rejects.toMatchObject({
                    constructor: AppUnknownException,
                    module: 'app',
                    statusCode: EnumAppStatusCodeError.unknown,
                    statusCodeKey:
                        EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                    messagePath: 'http.serverError.internalServerError',
                    rawError: cause,
                });
                expect(
                    termPolicyRepository.archivePublishedByTypeInTx
                ).toHaveBeenCalled();
            });

            it('adds the content copy row and the publish row on one publish tx after the guards, and dispatches once', async () => {
                const copyContentEffect: IOutboxEffect = {
                    queue: EnumTermPolicyQueue.termPolicy,
                    name: EnumTermPolicyProcess.copyContent,
                    data: {
                        termPolicyId: 'term-policy-1',
                        contents: [contentEn],
                        destination: 'public/term-policies/privacy/1',
                    },
                    priority: EnumQueuePriority.high,
                    idempotencyKey: 'copyContent-term-policy-1',
                };
                const publishEffect: IOutboxEffect = {
                    queue: EnumNotificationQueue.notification,
                    name: EnumNotificationProcess.publishTermPolicy,
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
                    idempotencyKey: 'publishTermPolicy-term-policy-1',
                };
                helperStringService.fillPattern.mockReturnValue(
                    'copyContent-term-policy-1'
                );
                helperDateService.formatToIso.mockReturnValue(
                    '2026-01-01T00:00:00.000Z'
                );
                notificationService.publishTermPolicyEffect.mockReturnValue(
                    publishEffect
                );

                await service.publishByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
                );

                expect(configGet).toHaveBeenCalledWith(
                    'termPolicy.idempotencyKey.copyContentPattern'
                );
                expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                    '{process}-{termPolicyId}',
                    {
                        process: EnumTermPolicyProcess.copyContent,
                        termPolicyId: 'term-policy-1',
                    }
                );
                expect(helperDateService.formatToIso).toHaveBeenCalledWith(
                    timestamp
                );
                expect(
                    notificationService.publishTermPolicyEffect
                ).toHaveBeenCalledWith(
                    {
                        termPolicyId: 'term-policy-1',
                        type: EnumTermPolicyType.privacy,
                        version: 1,
                        recipientCutoffAt: '2026-01-01T00:00:00.000Z',
                        resendNonce: null,
                    },
                    'admin-1'
                );
                expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
                expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                    copyContentEffect,
                    publishEffect,
                ]);
                expect(outboxService.addManyInTx).toHaveBeenCalledAfter(
                    termPolicyRepository.existsNewerPublishedInTx
                );
            });

            it('adds no row when a newer version of the type is already published', async () => {
                termPolicyRepository.existsNewerPublishedInTx.mockResolvedValue(
                    true
                );

                await expect(
                    service.publishByAdmin(
                        requestContext,
                        apiKeyContext,
                        authContext,
                        'term-policy-1'
                    )
                ).rejects.toBeInstanceOf(TermPolicyStatusInvalidException);
                expect(outboxService.addManyInTx).not.toHaveBeenCalled();
            });

            it('publishes the public keys, archives the earlier published versions, and returns the row', async () => {
                const result = await service.publishByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
                );

                expect(result).toEqual(publishedTermPolicy);
                expect(
                    termPolicyUtil.getContentPublicPath
                ).toHaveBeenCalledWith(EnumTermPolicyType.privacy, 1);
                expect(awsS3Service.mapPresign).toHaveBeenCalledWith(
                    { key: publicEnKey.key, size: 1024 },
                    { access: EnumAwsS3Accessibility.public }
                );
                expect(termPolicyRepository.publishInTx).toHaveBeenCalledWith(
                    tx,
                    'term-policy-1',
                    [{ ...publicEnItem, language: contentEn.language }]
                );
                expect(
                    termPolicyRepository.findOneByIdInTx
                ).toHaveBeenCalledWith(tx, 'term-policy-1');
                expect(
                    termPolicyRepository.archivePublishedByTypeInTx
                ).toHaveBeenCalledWith(tx, EnumTermPolicyType.privacy, 1);
            });

            it('calls no S3 copy while publishing', async () => {
                await service.publishByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
                );

                expect(awsS3Service.copyItems).not.toHaveBeenCalled();
                expect(awsS3Service.copyItem).not.toHaveBeenCalled();
            });
        });

        it('throws TermPolicyContentInvalidException when the stored contents are invalid', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.toContents.mockReturnValue(
                new TermPolicyContentInvalidException()
            );

            await expect(
                service.publishByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
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

        it('throws TermPolicyContentEmptyException when there is no content', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                emptyDraftTermPolicy
            );
            termPolicyUtil.toContents.mockReturnValue([]);

            await expect(
                service.publishByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
                )
            ).rejects.toMatchObject({
                constructor: TermPolicyContentEmptyException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.contentEmpty,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.contentEmpty
                    ],
                messagePath: 'termPolicy.error.contentEmpty',
            });
        });

        it('throws AwsS3NotConfiguredException before publishing when S3 is not initialized', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            awsS3Service.isInitialized.mockReturnValue(false);

            await expect(
                service.publishByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
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
            expect(awsS3Service.copyItems).not.toHaveBeenCalled();
            expect(outboxService.withTransaction).not.toHaveBeenCalled();
            expect(
                termPolicyRepository.archivePublishedByTypeInTx
            ).not.toHaveBeenCalled();
        });

        it('throws TermPolicyStatusInvalidException when the transaction hits a write conflict', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getContentPublicPath.mockReturnValue(
                'public/term-policies/privacy/1'
            );
            awsS3Service.mapPresign.mockReturnValue(publicEnItem);
            const conflict = new Prisma.PrismaClientKnownRequestError(
                'write conflict',
                { code: 'P2034', clientVersion: 'test' }
            );
            outboxService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.publishByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
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
            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
        });

        it('wraps another database error in AppUnknownException when the transaction fails', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getContentPublicPath.mockReturnValue(
                'public/term-policies/privacy/1'
            );
            awsS3Service.mapPresign.mockReturnValue(publicEnItem);
            const cause = new Prisma.PrismaClientKnownRequestError('other', {
                code: 'P2002',
                clientVersion: 'test',
            });
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.publishByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: cause,
            });
        });

        it('wraps a mapped database error that is not a write conflict in AppUnknownException', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getContentPublicPath.mockReturnValue(
                'public/term-policies/privacy/1'
            );
            awsS3Service.mapPresign.mockReturnValue(publicEnItem);
            const cause = new Prisma.PrismaClientKnownRequestError(
                'unavailable',
                { code: 'P2024', clientVersion: 'test' }
            );
            outboxService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(
                new DatabaseUnavailableException()
            );

            await expect(
                service.publishByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: cause,
            });
            expect(databaseUtil.toException).toHaveBeenCalledWith(cause);
        });

        it('throws TermPolicyNotFoundException when the published row cannot be read back', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getContentPublicPath.mockReturnValue(
                'public/term-policies/privacy/1'
            );
            awsS3Service.mapPresign.mockReturnValue(publicEnItem);
            outboxService.withTransaction.mockImplementation(
                async fn => fn(tx) as never
            );
            termPolicyRepository.publishInTx.mockResolvedValue(true);
            termPolicyRepository.findOneByIdInTx.mockResolvedValue(null);

            await expect(
                service.publishByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
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
            expect(
                termPolicyRepository.archivePublishedByTypeInTx
            ).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException raised while publishing', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            const error = new TermPolicyNotFoundException();
            termPolicyUtil.getContentPublicPath.mockImplementation(() => {
                throw error;
            });

            const promise = service.publishByAdmin(
                requestContext,
                apiKeyContext,
                authContext,
                'term-policy-1'
            );

            await expect(promise).rejects.toBe(error);
            await expect(promise).rejects.toMatchObject({
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

        it('wraps a non-AppBaseException failure in AppUnknownException', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getContentPublicPath.mockReturnValue(
                'public/term-policies/privacy/1'
            );
            awsS3Service.mapPresign.mockReturnValue(publicEnItem);
            const cause = new Error('transaction failed');
            outboxService.withTransaction.mockRejectedValue(cause);

            await expect(
                service.publishByAdmin(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    'term-policy-1'
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: cause,
            });
        });
    });

    describe('copyContent', () => {
        it('copies every private content to the public destination', async () => {
            awsS3Service.copyItems.mockResolvedValue([publicEnItem]);

            await service.copyContent({
                termPolicyId: 'term-policy-1',
                contents: [contentEn],
                destination: 'public/term-policies/privacy/1',
            });

            expect(awsS3Service.copyItems).toHaveBeenCalledWith(
                [contentEn],
                'public/term-policies/privacy/1',
                { access: EnumAwsS3Accessibility.public }
            );
        });

        it('throws a fatal QueueException when a content copy failed', async () => {
            awsS3Service.copyItems.mockResolvedValue([]);

            await expect(
                service.copyContent({
                    termPolicyId: 'term-policy-1',
                    contents: [contentEn],
                    destination: 'public/term-policies/privacy/1',
                })
            ).rejects.toMatchObject({
                constructor: QueueException,
                message: 'termPolicy.queue.error.copyContent',
                isFatal: true,
            });
            expect(messageService.setMessage).toHaveBeenCalledWith(
                'termPolicy.queue.error.copyContent',
                { properties: { termPolicyId: 'term-policy-1' } }
            );
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
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.notFound
                    ],
                messagePath: 'termPolicy.error.notFound',
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
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.statusInvalid
                    ],
                messagePath: 'termPolicy.error.statusInvalid',
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
            helperArrayService.unique.mockReturnValue([EnumMessageLanguage.en]);

            expect(service['validateUniqueLanguages'](contents)).toBe(true);
            expect(helperArrayService.unique).toHaveBeenCalledWith([
                EnumMessageLanguage.en,
            ]);
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
            helperArrayService.unique.mockReturnValue([EnumMessageLanguage.en]);

            expect(service['validateUniqueLanguages'](contents)).toBe(false);
        });
    });

    describe('mapPublicContentKeys', () => {
        it('maps each content to its public key under the public path with no S3 call', () => {
            termPolicyUtil.getContentPublicPath.mockReturnValue(
                'public/term-policies/privacy/1'
            );

            const result = service['mapPublicContentKeys'](
                {
                    id: 'term-policy-1',
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                },
                [contentEn]
            );

            expect(result).toEqual([publicEnKey]);
            expect(termPolicyUtil.getContentPublicPath).toHaveBeenCalledWith(
                EnumTermPolicyType.privacy,
                1
            );
            expect(awsS3Service.mapPresign).not.toHaveBeenCalled();
        });
    });
});
