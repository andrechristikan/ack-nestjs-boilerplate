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
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { FileService } from '@common/file/services/file.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import {
    EnumActivityLogAction,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { Prisma, TermPolicy } from '@generated/prisma-client/client';
import { TermPolicyDomain } from '@modules/term-policy/domains/term-policy.domain';
import { TermPolicyContentEmptyException } from '@modules/term-policy/exceptions/term-policy.content-empty.exception';
import { TermPolicyExistException } from '@modules/term-policy/exceptions/term-policy.exist.exception';
import { TermPolicyLanguageDuplicateException } from '@modules/term-policy/exceptions/term-policy.language-duplicate.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { ITermPolicyContent } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { UserDomain } from '@modules/user/domains/user.domain';

describe('TermPolicyDomain', () => {
    const termPolicyRepository: MockProxy<TermPolicyRepository> =
        mock<TermPolicyRepository>();
    const awsS3Service: MockProxy<AwsS3Service> = mock<AwsS3Service>();
    const termPolicyUtil: MockProxy<TermPolicyUtil> = mock<TermPolicyUtil>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const fileService: MockProxy<FileService> = mock<FileService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();

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

    const preparedEvent: IActivityLogStagedEvent = {
        action: EnumActivityLogAction.adminTermPolicyCreate,
        metadata: {},
        onError: false,
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

    let domain: TermPolicyDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        awsS3Service.isInitialized.mockReturnValue(true);
        helperDateService.create.mockReturnValue(timestamp);
        termPolicyUtil.mapActivityLogMetadata.mockReturnValue({
            termPolicyId: 'term-policy-1',
            termPolicyType: EnumTermPolicyType.privacy,
            termPolicyVersion: 1,
            timestamp,
        });
        activityLogDomain.prepare.mockReturnValue(preparedEvent);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyDomain,
                {
                    provide: TermPolicyRepository,
                    useValue: termPolicyRepository,
                },
                { provide: AwsS3Service, useValue: awsS3Service },
                { provide: TermPolicyUtil, useValue: termPolicyUtil },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: FileService, useValue: fileService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: UserDomain, useValue: userDomain },
            ],
        }).compile();

        domain = module.get(TermPolicyDomain);
    });

    describe('mapPublicContent', () => {
        it('assigns the language of the content matching the filename', () => {
            const newItem: IAwsS3 = {
                ...contentEn,
                access: EnumAwsS3Accessibility.public,
            };
            fileService.extractFilenameFromPath.mockImplementation(
                (path: string) => path.split('/').pop() ?? ''
            );

            const result = domain.mapPublicContent([newItem], [contentEn]);

            expect(result).toEqual([
                { ...newItem, language: contentEn.language },
            ]);
        });

        it('assigns an undefined language when no content matches the filename', () => {
            const newItem: IAwsS3 = {
                ...contentEn,
                key: 'term-policies/privacy/1/fr.hbs',
                access: EnumAwsS3Accessibility.public,
            };
            fileService.extractFilenameFromPath.mockImplementation(
                (path: string) => path.split('/').pop() ?? ''
            );

            const result = domain.mapPublicContent([newItem], [contentEn]);

            expect(result).toEqual([{ ...newItem, language: undefined }]);
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

            const result = await domain.getListByAdmin(
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

            const result = await domain.getListByAdmin(pagination);

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
            const params = { limit: 20, orderBy: [] };
            const page = {
                type: EnumPaginationType.cursor as const,
                perPage: 20,
                hasNext: false,
                data: [] as TermPolicy[],
            };
            termPolicyRepository.findPublished.mockResolvedValue(page);

            const result = await domain.getListPublished(params, {
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
                { limit: 20, orderBy: [] };
            const page: IResponsePaginationReturn<TermPolicy> = {
                type: EnumPaginationType.cursor,
                perPage: 20,
                hasNext: false,
                data: [],
            };
            termPolicyRepository.findPublished.mockResolvedValue(page);

            const result = await domain.getListPublished(pagination);

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
                domain.createByAdmin({
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
                domain.createByAdmin({
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

        it('throws AwsS3NotConfiguredException when S3 is not initialized', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
            termPolicyUtil.validateUniqueLanguages.mockReturnValue(true);
            awsS3Service.isInitialized.mockReturnValue(false);

            const promise = domain.createByAdmin({
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

        it('creates the term policy and stages the create activity log', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
            termPolicyUtil.validateUniqueLanguages.mockReturnValue(true);
            const mapped: IAwsS3 = { ...contentEn };
            awsS3Service.mapPresign.mockReturnValue(mapped);
            databaseUtil.createId.mockReturnValue('term-policy-1');
            termPolicyRepository.create.mockResolvedValue(draftTermPolicy);

            const result = await domain.createByAdmin({
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
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedEvent,
            ]);
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

            const promise = domain.createByAdmin({
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

        it('wraps a non-AppBaseException failure in AppUnknownException', async () => {
            termPolicyRepository.existsByVersionAndType.mockResolvedValue(
                false
            );
            termPolicyUtil.validateUniqueLanguages.mockReturnValue(true);
            awsS3Service.mapPresign.mockReturnValue({ ...contentEn });
            databaseUtil.createId.mockReturnValue('term-policy-1');
            const cause = new Error('write failed');
            termPolicyRepository.create.mockRejectedValue(cause);

            await expect(
                domain.createByAdmin({
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

    describe('deleteByAdmin', () => {
        it('throws TermPolicyNotFoundException when the term policy does not exist', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(null);

            await expect(
                domain.deleteByAdmin('term-policy-1')
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
                domain.deleteByAdmin('term-policy-1')
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

        it('deletes the draft term policy and its S3 content, and stages the delete activity log', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getPath.mockReturnValue('term-policies/privacy/1');
            termPolicyRepository.delete.mockResolvedValue(draftTermPolicy);
            awsS3Service.deleteDir.mockResolvedValue(undefined);

            const result = await domain.deleteByAdmin('term-policy-1');

            expect(result).toBe(draftTermPolicy);
            expect(termPolicyRepository.delete).toHaveBeenCalledWith(
                'term-policy-1'
            );
            expect(awsS3Service.deleteDir).toHaveBeenCalledWith(
                'term-policies/privacy/1',
                { access: EnumAwsS3Accessibility.private }
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedEvent,
            ]);
        });

        it('rethrows an AppBaseException raised while deleting', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            const error = new TermPolicyNotFoundException();
            termPolicyUtil.getPath.mockImplementation(() => {
                throw error;
            });

            const promise = domain.deleteByAdmin('term-policy-1');

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
            termPolicyRepository.delete.mockRejectedValue(cause);
            awsS3Service.deleteDir.mockResolvedValue(undefined);

            await expect(
                domain.deleteByAdmin('term-policy-1')
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
                domain.publishByAdmin('term-policy-1', 'user-1')
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

        it('throws TermPolicyStatusInvalidException when already published', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                publishedTermPolicy
            );

            await expect(
                domain.publishByAdmin('term-policy-1', 'user-1')
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

        it('throws TermPolicyContentEmptyException when there is no content', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(
                emptyDraftTermPolicy
            );

            await expect(
                domain.publishByAdmin('term-policy-1', 'user-1')
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
                domain.publishByAdmin('term-policy-1', 'user-1')
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
                userDomain.resetTermPolicyInTx
            ).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendPublishTermPolicy
            ).not.toHaveBeenCalled();
        });

        it('publishes the term policy, resets user acceptance, and queues the notification', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getContentPublicPath.mockReturnValue(
                'public/term-policies/privacy/1'
            );
            const publicItem: IAwsS3 = {
                ...contentEn,
                access: EnumAwsS3Accessibility.public,
            };
            awsS3Service.copyItems.mockResolvedValue([publicItem]);
            fileService.extractFilenameFromPath.mockImplementation(
                (path: string) => path.split('/').pop() ?? ''
            );
            const publishedRow: TermPolicy = {
                ...publishedTermPolicy,
                updatedAt: timestamp,
            };
            databaseService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );
            termPolicyRepository.publishInTx.mockResolvedValue(true);
            termPolicyRepository.findOneByIdInTx.mockResolvedValue(
                publishedRow
            );
            userDomain.resetTermPolicyInTx.mockResolvedValue(
                undefined
            );
            notificationQueue.sendPublishTermPolicy.mockResolvedValue(
                undefined
            );

            await domain.publishByAdmin('term-policy-1', 'user-1');

            expect(awsS3Service.copyItems).toHaveBeenCalledWith(
                [contentEn],
                'public/term-policies/privacy/1',
                { access: EnumAwsS3Accessibility.public }
            );
            expect(termPolicyRepository.publishInTx).toHaveBeenCalledWith(
                tx,
                'term-policy-1',
                [{ ...publicItem, language: contentEn.language }]
            );
            expect(termPolicyRepository.findOneByIdInTx).toHaveBeenCalledWith(
                tx,
                'term-policy-1'
            );
            expect(
                userDomain.resetTermPolicyInTx
            ).toHaveBeenCalledWith(tx, EnumTermPolicyType.privacy);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedEvent,
            ]);
            expect(
                notificationQueue.sendPublishTermPolicy
            ).toHaveBeenCalledWith(
                {
                    termPolicyId: 'term-policy-1',
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                },
                'user-1'
            );
        });

        it('throws TermPolicyStatusInvalidException and queues nothing when the guarded publish matches no draft row', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getContentPublicPath.mockReturnValue(
                'public/term-policies/privacy/1'
            );
            const publicItem: IAwsS3 = {
                ...contentEn,
                access: EnumAwsS3Accessibility.public,
            };
            awsS3Service.copyItems.mockResolvedValue([publicItem]);
            fileService.extractFilenameFromPath.mockImplementation(
                (path: string) => path.split('/').pop() ?? ''
            );
            databaseService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );
            termPolicyRepository.publishInTx.mockResolvedValue(false);

            await expect(
                domain.publishByAdmin('term-policy-1', 'user-1')
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
                userDomain.resetTermPolicyInTx
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendPublishTermPolicy
            ).not.toHaveBeenCalled();
        });

        it('throws TermPolicyNotFoundException and queues nothing when the published row cannot be read back', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getContentPublicPath.mockReturnValue(
                'public/term-policies/privacy/1'
            );
            awsS3Service.copyItems.mockResolvedValue([]);
            fileService.extractFilenameFromPath.mockReturnValue('en.hbs');
            databaseService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );
            termPolicyRepository.publishInTx.mockResolvedValue(true);
            termPolicyRepository.findOneByIdInTx.mockResolvedValue(null);

            await expect(
                domain.publishByAdmin('term-policy-1', 'user-1')
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
                userDomain.resetTermPolicyInTx
            ).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(
                notificationQueue.sendPublishTermPolicy
            ).not.toHaveBeenCalled();
        });

        it('rethrows an AppBaseException raised while publishing', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            const error = new TermPolicyNotFoundException();
            termPolicyUtil.getContentPublicPath.mockImplementation(() => {
                throw error;
            });

            const promise = domain.publishByAdmin('term-policy-1', 'user-1');

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
            awsS3Service.copyItems.mockResolvedValue([]);
            fileService.extractFilenameFromPath.mockReturnValue('en.hbs');
            const cause = new Error('transaction failed');
            databaseService.withTransaction.mockRejectedValue(cause);

            await expect(
                domain.publishByAdmin('term-policy-1', 'user-1')
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

    describe('prepareActivityLog', () => {
        it('builds the metadata through the util and prepares the activity log event', () => {
            const result = domain['prepareActivityLog'](
                EnumActivityLogAction.adminTermPolicyCreate,
                {
                    id: 'term-policy-1',
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                },
                timestamp
            );

            expect(result).toBe(preparedEvent);
            expect(termPolicyUtil.mapActivityLogMetadata).toHaveBeenCalledWith(
                {
                    id: 'term-policy-1',
                    type: EnumTermPolicyType.privacy,
                    version: 1,
                },
                timestamp
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.adminTermPolicyCreate,
                metadata: {
                    termPolicyId: 'term-policy-1',
                    termPolicyType: EnumTermPolicyType.privacy,
                    termPolicyVersion: 1,
                    timestamp,
                },
            });
        });
    });
});
