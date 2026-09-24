import { Test, type TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsServiceUnavailableException } from '@common/aws/exceptions/aws.service-unavailable.exception';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    EnumActivityLogAction,
    type TermPolicyContent,
} from '@generated/prisma-client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { TermPolicyContentExistException } from '@modules/term-policy/exceptions/term-policy.content-exist.exception';
import { TermPolicyContentNotFoundException } from '@modules/term-policy/exceptions/term-policy.content-not-found.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import type { ITermPolicy } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyContentDomain } from '@modules/term-policy/domains/term-policy.content.domain';
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
    const now = new Date('2026-01-01T00:00:00.000Z');
    const content = {
        id: 'content-id',
        termPolicyId: 'term-id',
        language: EnumMessageLanguage.en,
        bucket: 'private-bucket',
        key: 'private/privacy/1/en.hbs',
        cdnUrl: null,
        completedUrl: 'https://private/en.hbs',
        mime: 'text/x-handlebars-template',
        extension: 'hbs',
        access: EnumAwsS3Accessibility.private,
        size: 100,
    } satisfies TermPolicyContent;
    const draft = {
        id: 'term-id',
        type: EnumTermPolicyType.privacy,
        version: 1,
        status: EnumTermPolicyStatus.draft,
        publishedAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        contents: [content],
    } satisfies ITermPolicy;

    let service: TermPolicyContentDomain;

    beforeEach(async () => {
        helperDateService.create.mockReturnValue(now);
        const moduleRef: TestingModule = await Test.createTestingModule({
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
        service = moduleRef.get(TermPolicyContentDomain);
    });

    it('rejects content mutation for an unknown policy', async () => {
        termPolicyRepository.findOneById.mockResolvedValue(null);

        await expect(
            service.addContentByAdmin('missing', {
                language: EnumMessageLanguage.en,
                key: 'key',
                size: 100,
            })
        ).rejects.toBeInstanceOf(TermPolicyNotFoundException);
    });

    it('rejects content mutation after publication', async () => {
        termPolicyRepository.findOneById.mockResolvedValue({
            ...draft,
            status: EnumTermPolicyStatus.published,
        });

        await expect(
            service.removeContentByAdmin(draft.id, EnumMessageLanguage.en)
        ).rejects.toBeInstanceOf(TermPolicyStatusInvalidException);
    });

    it('rejects adding a language already present in the draft', async () => {
        termPolicyRepository.findOneById.mockResolvedValue(draft);
        termPolicyUtil.getContentByLanguage.mockReturnValue(content);

        await expect(
            service.addContentByAdmin(draft.id, {
                language: EnumMessageLanguage.en,
                key: 'key',
                size: 100,
            })
        ).rejects.toBeInstanceOf(TermPolicyContentExistException);
    });

    it('maps and adds a new localized draft content item', async () => {
        const mapped = {
            bucket: 'private-bucket',
            key: 'private/privacy/1/en.hbs',
            cdnUrl: null,
            completedUrl: 'https://private/id.hbs',
            mime: content.mime,
            extension: content.extension,
            access: EnumAwsS3Accessibility.private,
            size: 120,
        };
        termPolicyRepository.findOneById.mockResolvedValue({
            ...draft,
            contents: [],
        });
        termPolicyUtil.getContentByLanguage.mockReturnValue(null);
        awsS3Service.mapPresign.mockReturnValue(mapped);
        termPolicyRepository.addContent.mockResolvedValue(draft);

        await expect(
            service.addContentByAdmin(draft.id, {
                language: EnumMessageLanguage.en,
                key: mapped.key,
                size: mapped.size,
            })
        ).resolves.toBeUndefined();
        expect(termPolicyRepository.addContent).toHaveBeenCalledWith(draft.id, {
            language: EnumMessageLanguage.en,
            ...mapped,
        });
    });

    it('rejects removing a language absent from the draft', async () => {
        termPolicyRepository.findOneById.mockResolvedValue(draft);
        termPolicyUtil.getContentByLanguage.mockReturnValue(null);

        await expect(
            service.removeContentByAdmin(draft.id, EnumMessageLanguage.en)
        ).rejects.toBeInstanceOf(TermPolicyContentNotFoundException);
    });

    it('rejects creating a presigned content URL for a published policy version', async () => {
        termPolicyRepository.findStatusByVersionAndType.mockResolvedValue(
            EnumTermPolicyStatus.published
        );

        await expect(
            service.generateContentPresignByAdmin({
                language: EnumMessageLanguage.en,
                size: 100,
                type: EnumTermPolicyType.privacy,
                version: 1,
            })
        ).rejects.toBeInstanceOf(TermPolicyStatusInvalidException);
    });

    it('rejects when S3 cannot generate an upload presign', async () => {
        termPolicyRepository.findStatusByVersionAndType.mockResolvedValue(null);
        termPolicyUtil.createRandomFilenameContentWithPath.mockReturnValue(
            'private/privacy/1/en.hbs'
        );
        awsS3Service.presignPutItem.mockResolvedValue(null);

        await expect(
            service.generateContentPresignByAdmin({
                language: EnumMessageLanguage.en,
                size: 100,
                type: EnumTermPolicyType.privacy,
                version: 1,
            })
        ).rejects.toBeInstanceOf(AwsServiceUnavailableException);
    });

    it('generates an upload presign for draft content', async () => {
        const presign =
            mock<
                NonNullable<Awaited<ReturnType<AwsS3Service['presignPutItem']>>>
            >();
        termPolicyRepository.findStatusByVersionAndType.mockResolvedValue(
            EnumTermPolicyStatus.draft
        );
        termPolicyUtil.createRandomFilenameContentWithPath.mockReturnValue(
            content.key
        );
        awsS3Service.presignPutItem.mockResolvedValue(presign);

        await expect(
            service.generateContentPresignByAdmin({
                language: EnumMessageLanguage.en,
                size: content.size,
                type: EnumTermPolicyType.privacy,
                version: 1,
            })
        ).resolves.toBe(presign);
        expect(awsS3Service.presignPutItem).toHaveBeenCalledWith(
            { key: content.key, size: content.size },
            { forceUpdate: true, access: EnumAwsS3Accessibility.private }
        );
    });

    it('updates draft content and stages its activity', async () => {
        const mapped = {
            bucket: content.bucket,
            key: content.key,
            cdnUrl: content.cdnUrl,
            completedUrl: content.completedUrl,
            mime: content.mime,
            extension: content.extension,
            access: content.access,
            size: content.size,
        };
        termPolicyRepository.findOneById.mockResolvedValue(draft);
        awsS3Service.mapPresign.mockReturnValue(mapped);

        await expect(
            service.updateContentByAdmin(draft.id, {
                language: content.language,
                key: content.key,
                size: content.size,
            })
        ).resolves.toBeUndefined();
        expect(termPolicyRepository.updateContent).toHaveBeenCalledWith(
            draft.id,
            { language: content.language, ...mapped }
        );
        expect(activityLogDomain.prepare).toHaveBeenCalledWith({
            action: EnumActivityLogAction.adminTermPolicyUpdateContent,
            metadata: undefined,
        });
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledOnce();
    });

    it.each([
        [
            'typed',
            new TermPolicyNotFoundException(),
            TermPolicyNotFoundException,
        ],
        ['unknown', new Error('failure'), AppUnknownException],
    ])('maps %s update-content failures', async (_name, error, expected) => {
        termPolicyRepository.findOneById.mockResolvedValue(draft);
        awsS3Service.mapPresign.mockImplementation(() => {
            throw error;
        });

        await expect(
            service.updateContentByAdmin(draft.id, {
                language: content.language,
                key: content.key,
                size: content.size,
            })
        ).rejects.toBeInstanceOf(expected);
    });

    it.each([
        [
            'typed',
            new TermPolicyNotFoundException(),
            TermPolicyNotFoundException,
        ],
        ['unknown', new Error('failure'), AppUnknownException],
    ])('maps %s add-content failures', async (_name, error, expected) => {
        termPolicyRepository.findOneById.mockResolvedValue({
            ...draft,
            contents: [],
        });
        termPolicyUtil.getContentByLanguage.mockReturnValue(null);
        awsS3Service.mapPresign.mockImplementation(() => {
            throw error;
        });

        await expect(
            service.addContentByAdmin(draft.id, {
                language: content.language,
                key: content.key,
                size: content.size,
            })
        ).rejects.toBeInstanceOf(expected);
    });

    it('removes draft content and stages its activity', async () => {
        termPolicyRepository.findOneById.mockResolvedValue(draft);
        termPolicyUtil.getContentByLanguage.mockReturnValue(content);

        await expect(
            service.removeContentByAdmin(draft.id, content.language)
        ).resolves.toBeUndefined();
        expect(termPolicyRepository.removeContent).toHaveBeenCalledWith(
            draft.id,
            { language: content.language }
        );
        expect(activityLogDomain.stagePrepared).toHaveBeenCalledOnce();
    });

    it.each([
        [
            'typed',
            new TermPolicyNotFoundException(),
            TermPolicyNotFoundException,
        ],
        ['unknown', new Error('failure'), AppUnknownException],
    ])('maps %s remove-content failures', async (_name, error, expected) => {
        termPolicyRepository.findOneById.mockResolvedValue(draft);
        termPolicyUtil.getContentByLanguage.mockReturnValue(content);
        termPolicyRepository.removeContent.mockRejectedValue(error);

        await expect(
            service.removeContentByAdmin(draft.id, content.language)
        ).rejects.toBeInstanceOf(expected);
    });

    it('rejects reading content for an unknown policy', async () => {
        termPolicyRepository.findOneById.mockResolvedValue(null);

        await expect(
            service.getContentByAdmin('missing', content.language)
        ).rejects.toBeInstanceOf(TermPolicyNotFoundException);
    });

    it('rejects reading a missing localized content item', async () => {
        termPolicyRepository.findOneById.mockResolvedValue(draft);
        termPolicyUtil.getContentByLanguage.mockReturnValue(null);

        await expect(
            service.getContentByAdmin(draft.id, content.language)
        ).rejects.toBeInstanceOf(TermPolicyContentNotFoundException);
    });

    it('rejects when S3 cannot generate a content read presign', async () => {
        termPolicyRepository.findOneById.mockResolvedValue(draft);
        termPolicyUtil.getContentByLanguage.mockReturnValue(content);
        awsS3Service.presignGetItem.mockResolvedValue(null);

        await expect(
            service.getContentByAdmin(draft.id, content.language)
        ).rejects.toBeInstanceOf(AwsServiceUnavailableException);
    });

    it('returns a content read presign', async () => {
        const presign =
            mock<
                NonNullable<Awaited<ReturnType<AwsS3Service['presignGetItem']>>>
            >();
        termPolicyRepository.findOneById.mockResolvedValue(draft);
        termPolicyUtil.getContentByLanguage.mockReturnValue(content);
        awsS3Service.presignGetItem.mockResolvedValue(presign);

        await expect(
            service.getContentByAdmin(draft.id, content.language)
        ).resolves.toBe(presign);
        expect(awsS3Service.presignGetItem).toHaveBeenCalledWith(content.key, {
            access: EnumAwsS3Accessibility.private,
        });
    });
});
