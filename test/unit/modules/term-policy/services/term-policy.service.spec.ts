import { HttpStatus } from '@nestjs/common';
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
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUnavailableException } from '@common/database/exceptions/database.unavailable.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@queues/exceptions/queue.exception';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import { Prisma } from '@generated/prisma-client/client';
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
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type {
    ITermPolicyContent,
    ITermPolicyContentUpload,
} from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyQueue } from '@modules/term-policy/queues/term-policy.queue';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';

describe('TermPolicyService', () => {
    const termPolicyRepository: MockProxy<TermPolicyRepository> =
        mock<TermPolicyRepository>();
    const awsS3Service: MockProxy<AwsS3Service> = mock<AwsS3Service>();
    const termPolicyUtil: MockProxy<TermPolicyUtil> = mock<TermPolicyUtil>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const termPolicyQueue: MockProxy<TermPolicyQueue> = mock<TermPolicyQueue>();

    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const tx = {} as IDatabaseTransactionClient;

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

        awsS3Service.isInitialized.mockReturnValue(true);
        termPolicyQueue.deleteContent.mockResolvedValue();
        termPolicyUtil.toContents.mockReturnValue([contentEn]);
        termPolicyUtil.isContentSizeAllowed.mockReturnValue(true);
        termPolicyUtil.isContentKeyInPath.mockReturnValue(true);
        messageService.setMessage.mockImplementation((path: string) => path);

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
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: TermPolicyQueue, useValue: termPolicyQueue },
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
                service.createByAdmin('term-policy-1', {
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                    contents: [],
                })
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
            expect(
                termPolicyUtil.validateUniqueLanguages
            ).not.toHaveBeenCalled();
        });

        it('throws TermPolicyLanguageDuplicateException when languages repeat', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
            termPolicyUtil.validateUniqueLanguages.mockReturnValue(false);

            await expect(
                service.createByAdmin('term-policy-1', {
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                    contents: [
                        {
                            language: EnumMessageLanguage.en,
                            size: 1024,
                            key: 'a.hbs',
                        },
                    ],
                })
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
            expect(termPolicyRepository.create).not.toHaveBeenCalled();
        });

        it('throws TermPolicyContentKeyInvalidException and writes nothing when a content key is outside the policy path', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
            termPolicyUtil.validateUniqueLanguages.mockReturnValue(true);
            termPolicyUtil.isContentKeyInPath.mockReturnValueOnce(true);
            termPolicyUtil.isContentKeyInPath.mockReturnValueOnce(false);

            const promise = service.createByAdmin('term-policy-1', {
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
            });

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
            expect(termPolicyRepository.create).not.toHaveBeenCalled();
        });

        it('throws TermPolicyContentSizeExceededException and writes nothing when a content size exceeds the configured max', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
            termPolicyUtil.validateUniqueLanguages.mockReturnValue(true);
            termPolicyUtil.isContentSizeAllowed.mockReturnValueOnce(true);
            termPolicyUtil.isContentSizeAllowed.mockReturnValueOnce(false);

            const promise = service.createByAdmin('term-policy-1', {
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
            });

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
            expect(termPolicyRepository.create).not.toHaveBeenCalled();
        });

        it('throws AwsS3NotConfiguredException when S3 is not initialized', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
            termPolicyUtil.validateUniqueLanguages.mockReturnValue(true);
            awsS3Service.isInitialized.mockReturnValue(false);

            const promise = service.createByAdmin('term-policy-1', {
                type: EnumTermPolicyType.privacy,
                version: 1,
                contents: [
                    {
                        language: EnumMessageLanguage.en,
                        size: 1024,
                        key: 'term-policies/privacy/1/en.hbs',
                    },
                ],
            });

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
            expect(termPolicyRepository.create).not.toHaveBeenCalled();
        });

        it('creates the term policy with the given id and presigned contents', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
            termPolicyUtil.validateUniqueLanguages.mockReturnValue(true);
            const mapped: IAwsS3 = { ...contentEn };
            awsS3Service.mapPresign.mockReturnValue(mapped);
            termPolicyRepository.create.mockResolvedValue(draftTermPolicy);

            const result = await service.createByAdmin('term-policy-1', {
                type: EnumTermPolicyType.privacy,
                version: 1,
                contents: [
                    {
                        language: EnumMessageLanguage.en,
                        size: 1024,
                        key: 'term-policies/privacy/1/en.hbs',
                    },
                ],
            });

            expect(result).toBe(draftTermPolicy);
            expect(awsS3Service.mapPresign).toHaveBeenCalledWith(
                {
                    key: 'term-policies/privacy/1/en.hbs',
                    size: 1024,
                },
                { access: EnumAwsS3Accessibility.private }
            );
            expect(termPolicyRepository.create).toHaveBeenCalledWith(
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

        it('rethrows an AppBaseException raised while creating', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
            termPolicyUtil.validateUniqueLanguages.mockReturnValue(true);
            const error = new TermPolicyExistException();
            awsS3Service.mapPresign.mockImplementation(() => {
                throw error;
            });

            const promise = service.createByAdmin('term-policy-1', {
                type: EnumTermPolicyType.privacy,
                version: 1,
                contents: [
                    {
                        language: EnumMessageLanguage.en,
                        size: 1024,
                        key: 'a.hbs',
                    },
                ],
            });

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
            termPolicyUtil.validateUniqueLanguages.mockReturnValue(true);
            awsS3Service.mapPresign.mockReturnValue({ ...contentEn });
            const collision = new Error('unique violation');
            termPolicyRepository.create.mockRejectedValue(collision);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                service.createByAdmin('term-policy-1', {
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                    contents: [
                        {
                            language: EnumMessageLanguage.en,
                            size: 1024,
                            key: 'a.hbs',
                        },
                    ],
                })
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
            termPolicyUtil.validateUniqueLanguages.mockReturnValue(true);
            awsS3Service.mapPresign.mockReturnValue({ ...contentEn });
            const cause = new Error('write failed');
            termPolicyRepository.create.mockRejectedValue(cause);
            databaseUtil.isUniqueCollision.mockReturnValue(false);

            await expect(
                service.createByAdmin('term-policy-1', {
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                    contents: [
                        {
                            language: EnumMessageLanguage.en,
                            size: 1024,
                            key: 'a.hbs',
                        },
                    ],
                })
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
        it('throws TermPolicyNotFoundException when the term policy does not exist', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.deleteByAdmin('term-policy-1')
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
                service.deleteByAdmin('term-policy-1')
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

        it('throws TermPolicyStatusInvalidException and enqueues nothing when the guarded delete removes no row', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getPath.mockReturnValue('term-policies/privacy/1');
            termPolicyRepository.deleteDraft.mockResolvedValue(false);

            const promise = service.deleteByAdmin('term-policy-1');

            await expect(promise).rejects.toMatchObject({
                constructor: TermPolicyStatusInvalidException,
                module: 'termPolicy',
                statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
                statusCodeKey:
                    EnumTermPolicyStatusCodeError[
                        EnumTermPolicyStatusCodeError.statusInvalid
                    ],
                messagePath: 'termPolicy.error.statusInvalid',
            });
            expect(termPolicyQueue.deleteContent).not.toHaveBeenCalled();
        });

        it('deletes the draft term policy and enqueues the content delete', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getPath.mockReturnValue('term-policies/privacy/1');
            termPolicyRepository.deleteDraft.mockResolvedValue(true);

            const result = await service.deleteByAdmin('term-policy-1');

            expect(result).toBe(draftTermPolicy);
            expect(termPolicyRepository.deleteDraft).toHaveBeenCalledWith(
                'term-policy-1'
            );
            expect(termPolicyQueue.deleteContent).toHaveBeenCalledWith(
                'term-policies/privacy/1'
            );
        });

        it('does not call S3 in the request', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getPath.mockReturnValue('term-policies/privacy/1');
            termPolicyRepository.deleteDraft.mockResolvedValue(true);

            await service.deleteByAdmin('term-policy-1');

            expect(awsS3Service.deleteDir).not.toHaveBeenCalled();
        });

        it('enqueues the content delete after the repository delete resolves', async () => {
            const calls: string[] = [];
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getPath.mockReturnValue('term-policies/privacy/1');
            termPolicyRepository.deleteDraft.mockImplementation(async () => {
                calls.push('delete');

                return true;
            });
            termPolicyQueue.deleteContent.mockImplementation(async () => {
                calls.push('enqueue');
            });

            await service.deleteByAdmin('term-policy-1');

            expect(calls).toEqual(['delete', 'enqueue']);
        });

        it('enqueues nothing when the repository delete rejects', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getPath.mockReturnValue('term-policies/privacy/1');
            termPolicyRepository.deleteDraft.mockRejectedValue(
                new Error('delete failed')
            );

            await expect(
                service.deleteByAdmin('term-policy-1')
            ).rejects.toBeInstanceOf(AppUnknownException);
            expect(termPolicyQueue.deleteContent).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException raised while deleting', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            const error = new TermPolicyNotFoundException();
            termPolicyUtil.getPath.mockImplementation(() => {
                throw error;
            });

            const promise = service.deleteByAdmin('term-policy-1');

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
            termPolicyUtil.getPath.mockReturnValue('term-policies/privacy/1');
            const cause = new Error('delete failed');
            termPolicyRepository.deleteDraft.mockRejectedValue(cause);

            await expect(
                service.deleteByAdmin('term-policy-1')
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
                service.publishByAdmin('term-policy-1')
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
                termPolicyUtil.mapPublicContentKeys.mockReturnValue([
                    publicEnKey,
                ]);
                awsS3Service.mapPresign.mockReturnValue(publicEnItem);
                databaseService.withTransaction.mockImplementation(async fn =>
                    fn(tx)
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

            it('archives only the versions below the one it publishes', async () => {
                termPolicyRepository.findOneById.mockResolvedValue({
                    ...draftTermPolicy,
                    version: 3,
                });
                termPolicyRepository.findOneByIdInTx.mockResolvedValue({
                    ...publishedTermPolicy,
                    version: 3,
                });

                await service.publishByAdmin('term-policy-1');

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
                    service.publishByAdmin('term-policy-1')
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
                    service.publishByAdmin('term-policy-1')
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
                expect(databaseService.withTransaction).not.toHaveBeenCalled();
            });

            it('throws TermPolicyStatusInvalidException for an archived policy before any S3 or write', async () => {
                termPolicyRepository.findOneById.mockResolvedValue({
                    ...publishedTermPolicy,
                    status: EnumTermPolicyStatus.archived,
                });

                await expect(
                    service.publishByAdmin('term-policy-1')
                ).rejects.toMatchObject({
                    constructor: TermPolicyStatusInvalidException,
                    statusCode: EnumTermPolicyStatusCodeError.statusInvalid,
                });
                expect(awsS3Service.copyItems).not.toHaveBeenCalled();
                expect(databaseService.withTransaction).not.toHaveBeenCalled();
            });

            it('throws TermPolicyStatusInvalidException when publishInTx loses the race', async () => {
                termPolicyRepository.publishInTx.mockResolvedValue(false);

                await expect(
                    service.publishByAdmin('term-policy-1')
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
                databaseService.withTransaction.mockImplementation(async fn => {
                    await fn(tx);

                    throw cause;
                });

                await expect(
                    service.publishByAdmin('term-policy-1')
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

            it('publishes the public keys, archives the earlier published versions, and returns the row with the copy payload', async () => {
                const result = await service.publishByAdmin('term-policy-1');

                expect(result).toEqual({
                    termPolicy: publishedTermPolicy,
                    copy: {
                        termPolicyId: 'term-policy-1',
                        contents: [contentEn],
                        destination: 'public/term-policies/privacy/1',
                    },
                });
                expect(
                    termPolicyUtil.mapPublicContentKeys
                ).toHaveBeenCalledWith(draftTermPolicy, [contentEn]);
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

            it('calls no S3 copy or enqueue while publishing', async () => {
                await service.publishByAdmin('term-policy-1');

                expect(awsS3Service.copyItems).not.toHaveBeenCalled();
                expect(awsS3Service.copyItem).not.toHaveBeenCalled();
                expect(termPolicyQueue.copyContent).not.toHaveBeenCalled();
            });
        });

        it('throws TermPolicyContentInvalidException when the stored contents are invalid', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.toContents.mockReturnValue(
                new TermPolicyContentInvalidException()
            );

            await expect(
                service.publishByAdmin('term-policy-1')
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
                service.publishByAdmin('term-policy-1')
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
                service.publishByAdmin('term-policy-1')
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
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(
                termPolicyRepository.archivePublishedByTypeInTx
            ).not.toHaveBeenCalled();
        });

        it('throws TermPolicyStatusInvalidException when the transaction hits a write conflict', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getContentPublicPath.mockReturnValue(
                'public/term-policies/privacy/1'
            );
            termPolicyUtil.mapPublicContentKeys.mockReturnValue([publicEnKey]);
            awsS3Service.mapPresign.mockReturnValue(publicEnItem);
            const conflict = new Prisma.PrismaClientKnownRequestError(
                'write conflict',
                { code: 'P2034', clientVersion: 'test' }
            );
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.publishByAdmin('term-policy-1')
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
            termPolicyUtil.mapPublicContentKeys.mockReturnValue([publicEnKey]);
            awsS3Service.mapPresign.mockReturnValue(publicEnItem);
            const cause = new Prisma.PrismaClientKnownRequestError('other', {
                code: 'P2002',
                clientVersion: 'test',
            });
            databaseService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.publishByAdmin('term-policy-1')
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
            termPolicyUtil.mapPublicContentKeys.mockReturnValue([publicEnKey]);
            awsS3Service.mapPresign.mockReturnValue(publicEnItem);
            const cause = new Prisma.PrismaClientKnownRequestError(
                'unavailable',
                { code: 'P2024', clientVersion: 'test' }
            );
            databaseService.withTransaction.mockRejectedValue(cause);
            databaseUtil.toException.mockReturnValue(
                new DatabaseUnavailableException()
            );

            await expect(
                service.publishByAdmin('term-policy-1')
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
            termPolicyUtil.mapPublicContentKeys.mockReturnValue([publicEnKey]);
            awsS3Service.mapPresign.mockReturnValue(publicEnItem);
            databaseService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );
            termPolicyRepository.publishInTx.mockResolvedValue(true);
            termPolicyRepository.findOneByIdInTx.mockResolvedValue(null);

            await expect(
                service.publishByAdmin('term-policy-1')
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

            const promise = service.publishByAdmin('term-policy-1');

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
            termPolicyUtil.mapPublicContentKeys.mockReturnValue([publicEnKey]);
            awsS3Service.mapPresign.mockReturnValue(publicEnItem);
            const cause = new Error('transaction failed');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(
                service.publishByAdmin('term-policy-1')
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
});
