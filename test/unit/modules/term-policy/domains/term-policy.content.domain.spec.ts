import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3NotConfiguredException } from '@common/aws/exceptions/aws.s3-not-configured.exception';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import type {
    IAwsS3,
    IAwsS3Presign,
} from '@common/aws/interfaces/aws.interface';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import {
    EnumActivityLogAction,
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { TermPolicy } from '@generated/prisma-client/client';
import { TermPolicyContentDomain } from '@modules/term-policy/domains/term-policy.content.domain';
import { TermPolicyContentExistException } from '@modules/term-policy/exceptions/term-policy.content-exist.exception';
import { TermPolicyContentInvalidException } from '@modules/term-policy/exceptions/term-policy.content-invalid.exception';
import { TermPolicyContentNotFoundException } from '@modules/term-policy/exceptions/term-policy.content-not-found.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import { EnumTermPolicyStatusCodeError } from '@modules/term-policy/enums/term-policy.status-code.enum';
import type { ITermPolicyContent } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';

describe('TermPolicyContentDomain', () => {
    const termPolicyRepository: MockProxy<TermPolicyRepository> =
        mock<TermPolicyRepository>();
    const awsS3Service: MockProxy<AwsS3Service> = mock<AwsS3Service>();
    const termPolicyUtil: MockProxy<TermPolicyUtil> = mock<TermPolicyUtil>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    const timestamp = new Date('2026-01-01T00:00:00.000Z');
    const preparedEvent: IActivityLogStagedEvent = {
        action: EnumActivityLogAction.adminTermPolicyUpdateContent,
        metadata: {},
        onError: false,
        userId: null,
        createdBy: null,
        workspaceId: null,
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

    const publishedTermPolicy: TermPolicy = {
        ...draftTermPolicy,
        status: EnumTermPolicyStatus.published,
        publishedAt: timestamp,
    };

    let domain: TermPolicyContentDomain;

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
        termPolicyUtil.toContents.mockReturnValue([existingContent]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyContentDomain,
                {
                    provide: TermPolicyRepository,
                    useValue: termPolicyRepository,
                },
                { provide: AwsS3Service, useValue: awsS3Service },
                { provide: TermPolicyUtil, useValue: termPolicyUtil },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        domain = module.get(TermPolicyContentDomain);
    });

    describe('generateContentPresignByAdmin', () => {
        it('throws TermPolicyStatusInvalidException when the version is already published', async () => {
            termPolicyRepository.findStatusByVersionAndType.mockResolvedValue(
                EnumTermPolicyStatus.published
            );

            const promise = domain.generateContentPresignByAdmin({
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
            termPolicyUtil.createRandomFilenameContentWithPath.mockReturnValue(
                'term-policies/privacy/1/en.hbs'
            );
            awsS3Service.presignPutItem.mockResolvedValue(null);

            const promise = domain.generateContentPresignByAdmin({
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
            termPolicyUtil.createRandomFilenameContentWithPath.mockReturnValue(
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

            const result = await domain.generateContentPresignByAdmin({
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

    describe('updateContentByAdmin', () => {
        it('throws TermPolicyNotFoundException when the term policy does not exist', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(null);

            await expect(
                domain.updateContentByAdmin('term-policy-1', {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'term-policies/privacy/v1/en.hbs',
                })
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
                domain.updateContentByAdmin('term-policy-1', {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'term-policies/privacy/v1/en.hbs',
                })
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
                domain.updateContentByAdmin('term-policy-1', {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'term-policies/privacy/v1/en.hbs',
                })
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

        it('throws AwsS3NotConfiguredException when S3 is not initialized', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            awsS3Service.isInitialized.mockReturnValue(false);

            const promise = domain.updateContentByAdmin('term-policy-1', {
                language: EnumMessageLanguage.en,
                size: 2048,
                key: 'term-policies/privacy/v1/en-2.hbs',
            });

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
            expect(termPolicyRepository.updateContent).not.toHaveBeenCalled();
        });

        it('updates the content and stages the update-content activity log', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            const mapped: IAwsS3 = { ...existingContent };
            awsS3Service.mapPresign.mockReturnValue(mapped);
            termPolicyRepository.updateContent.mockResolvedValue(
                draftTermPolicy
            );

            await domain.updateContentByAdmin('term-policy-1', {
                language: EnumMessageLanguage.en,
                size: 2048,
                key: 'term-policies/privacy/v1/en-2.hbs',
            });

            expect(awsS3Service.mapPresign).toHaveBeenCalledWith(
                {
                    key: 'term-policies/privacy/v1/en-2.hbs',
                    size: 2048,
                },
                { access: EnumAwsS3Accessibility.private }
            );
            expect(termPolicyRepository.updateContent).toHaveBeenCalledWith(
                'term-policy-1',
                [existingContent],
                { language: EnumMessageLanguage.en, ...mapped }
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedEvent,
            ]);
        });

        it('wraps a non-AppBaseException failure in AppUnknownException', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            awsS3Service.mapPresign.mockReturnValue({
                ...existingContent,
            });
            const rawError = new Error('write failed');
            termPolicyRepository.updateContent.mockRejectedValue(rawError);

            const promise = domain.updateContentByAdmin('term-policy-1', {
                language: EnumMessageLanguage.en,
                size: 2048,
                key: 'term-policies/privacy/v1/en-2.hbs',
            });

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

            const promise = domain.updateContentByAdmin('term-policy-1', {
                language: EnumMessageLanguage.en,
                size: 2048,
                key: 'term-policies/privacy/v1/en-2.hbs',
            });

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
        it('throws TermPolicyNotFoundException when the term policy does not exist', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(null);

            await expect(
                domain.addContentByAdmin('term-policy-1', {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'term-policies/privacy/v1/fr.hbs',
                })
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
                domain.addContentByAdmin('term-policy-1', {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'term-policies/privacy/v1/fr.hbs',
                })
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
            termPolicyUtil.getContentByLanguage.mockReturnValue(
                existingContent
            );

            const promise = domain.addContentByAdmin('term-policy-1', {
                language: EnumMessageLanguage.en,
                size: 1024,
                key: 'term-policies/privacy/v1/en.hbs',
            });

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
            awsS3Service.isInitialized.mockReturnValue(false);

            const promise = domain.addContentByAdmin('term-policy-1', {
                language: EnumMessageLanguage.en,
                size: 2048,
                key: 'term-policies/privacy/v1/en-2.hbs',
            });

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
            expect(termPolicyRepository.addContent).not.toHaveBeenCalled();
        });

        it('adds the content and stages the add-content activity log', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getContentByLanguage.mockReturnValue(null);
            const mapped: IAwsS3 = {
                ...existingContent,
                key: 'term-policies/privacy/v1/fr.hbs',
            };
            awsS3Service.mapPresign.mockReturnValue(mapped);
            termPolicyRepository.addContent.mockResolvedValue(draftTermPolicy);

            await domain.addContentByAdmin('term-policy-1', {
                language: EnumMessageLanguage.en,
                size: 1024,
                key: 'term-policies/privacy/v1/fr.hbs',
            });

            expect(termPolicyRepository.addContent).toHaveBeenCalledWith(
                'term-policy-1',
                { language: EnumMessageLanguage.en, ...mapped }
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedEvent,
            ]);
        });

        it('wraps a non-AppBaseException failure in AppUnknownException', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getContentByLanguage.mockReturnValue(null);
            awsS3Service.mapPresign.mockReturnValue({ ...existingContent });
            const rawError = new Error('write failed');
            termPolicyRepository.addContent.mockRejectedValue(rawError);

            await expect(
                domain.addContentByAdmin('term-policy-1', {
                    language: EnumMessageLanguage.en,
                    size: 1024,
                    key: 'term-policies/privacy/v1/fr.hbs',
                })
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
            termPolicyUtil.getContentByLanguage.mockReturnValue(null);
            const error = new TermPolicyContentExistException();
            awsS3Service.mapPresign.mockImplementation(() => {
                throw error;
            });

            const promise = domain.addContentByAdmin('term-policy-1', {
                language: EnumMessageLanguage.en,
                size: 1024,
                key: 'term-policies/privacy/v1/fr.hbs',
            });

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
                domain.removeContentByAdmin(
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
                domain.removeContentByAdmin(
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
            termPolicyUtil.getContentByLanguage.mockReturnValue(null);

            await expect(
                domain.removeContentByAdmin(
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

        it('removes the content and stages the remove-content activity log', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getContentByLanguage.mockReturnValue(
                existingContent
            );
            termPolicyRepository.removeContent.mockResolvedValue(
                draftTermPolicy
            );

            await domain.removeContentByAdmin(
                'term-policy-1',
                EnumMessageLanguage.en
            );

            expect(termPolicyRepository.removeContent).toHaveBeenCalledWith(
                'term-policy-1',
                [existingContent],
                { language: EnumMessageLanguage.en }
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                preparedEvent,
            ]);
        });

        it('rethrows an AppBaseException raised while removing', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);
            termPolicyUtil.getContentByLanguage.mockReturnValue(
                existingContent
            );
            const error = new TermPolicyContentNotFoundException();
            termPolicyRepository.removeContent.mockRejectedValue(error);

            const promise = domain.removeContentByAdmin(
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
            termPolicyUtil.getContentByLanguage.mockReturnValue(
                existingContent
            );
            const rawError = new Error('write failed');
            termPolicyRepository.removeContent.mockRejectedValue(rawError);

            await expect(
                domain.removeContentByAdmin(
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
                domain.getContentByAdmin(
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
                domain.getContentByAdmin(
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
            termPolicyUtil.getContentByLanguage.mockReturnValue(null);

            await expect(
                domain.getContentByAdmin(
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
            termPolicyUtil.getContentByLanguage.mockReturnValue(
                existingContent
            );
            awsS3Service.presignGetItem.mockResolvedValue(null);

            await expect(
                domain.getContentByAdmin(
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
            termPolicyUtil.getContentByLanguage.mockReturnValue(
                existingContent
            );
            const presign: IAwsS3Presign = {
                key: existingContent.key,
                mime: existingContent.mime,
                extension: existingContent.extension,
                presignUrl: 'https://s3.example.com/get-presign',
                expiredInSeconds: 900,
            };
            awsS3Service.presignGetItem.mockResolvedValue(presign);

            const result = await domain.getContentByAdmin(
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

    describe('prepareActivityLog', () => {
        it('builds the metadata through the util and prepares the activity log event', () => {
            const result = domain['prepareActivityLog'](
                EnumActivityLogAction.adminTermPolicyUpdateContent,
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
                action: EnumActivityLogAction.adminTermPolicyUpdateContent,
                metadata: {
                    termPolicyId: 'term-policy-1',
                    termPolicyType: EnumTermPolicyType.privacy,
                    termPolicyVersion: 1,
                    timestamp,
                },
            });
        });
    });

    describe('findOneDraftById', () => {
        it('returns the term policy when it exists and is a draft', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(draftTermPolicy);

            const result = await domain['findOneDraftById']('term-policy-1');

            expect(result).toBe(draftTermPolicy);
            expect(termPolicyRepository.findOneById).toHaveBeenCalledWith(
                'term-policy-1'
            );
        });

        it('throws TermPolicyNotFoundException when the term policy does not exist', async () => {
            termPolicyRepository.findOneById.mockResolvedValue(null);

            await expect(
                domain['findOneDraftById']('term-policy-1')
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
                domain['findOneDraftById']('term-policy-1')
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
});
