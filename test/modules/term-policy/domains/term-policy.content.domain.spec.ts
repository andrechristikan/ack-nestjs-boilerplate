import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { AwsS3Service } from '@common/aws/services/aws.s3.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    type TermPolicyContent,
} from '@generated/prisma-client';
import { TermPolicyContentExistException } from '@modules/term-policy/exceptions/term-policy.content-exist.exception';
import { TermPolicyContentNotFoundException } from '@modules/term-policy/exceptions/term-policy.content-not-found.exception';
import { TermPolicyNotFoundException } from '@modules/term-policy/exceptions/term-policy.not-found.exception';
import { TermPolicyStatusInvalidException } from '@modules/term-policy/exceptions/term-policy.status-invalid.exception';
import type { ITermPolicy } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRepository } from '@modules/term-policy/repositories/term-policy.repository';
import { TermPolicyContentDomain } from '@modules/term-policy/domains/term-policy.content.domain';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';

describe('TermPolicyContentDomain', () => {
    const termPolicyRepository = {
        findOneById: vi.fn<TermPolicyRepository['findOneById']>(),
        addContent: vi.fn<TermPolicyRepository['addContent']>(),
        removeContent: vi.fn<TermPolicyRepository['removeContent']>(),
    } satisfies Pick<
        TermPolicyRepository,
        'findOneById' | 'addContent' | 'removeContent'
    >;
    const awsS3Service = {
        mapPresign: vi.fn<AwsS3Service['mapPresign']>(),
    } satisfies Pick<AwsS3Service, 'mapPresign'>;
    const termPolicyUtil = {
        getContentByLanguage: vi.fn<TermPolicyUtil['getContentByLanguage']>(),
        mapActivityLogMetadata:
            vi.fn<TermPolicyUtil['mapActivityLogMetadata']>(),
    } satisfies Pick<
        TermPolicyUtil,
        'getContentByLanguage' | 'mapActivityLogMetadata'
    >;
    const requestStoreService = {
        merge: vi.fn<RequestStoreService['merge']>(),
    } satisfies Pick<RequestStoreService, 'merge'>;
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
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyContentDomain,
                {
                    provide: TermPolicyRepository,
                    useValue: termPolicyRepository,
                },
                { provide: AwsS3Service, useValue: awsS3Service },
                { provide: TermPolicyUtil, useValue: termPolicyUtil },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        service = moduleRef.get(TermPolicyContentDomain);
    });

    it('rejects content mutation for an unknown policy', async () => {
        termPolicyRepository.findOneById.mockResolvedValue(null);

        await expect(
            service.addContentByAdmin(
                'missing',
                { language: EnumMessageLanguage.en, key: 'key', size: 100 },
                'admin-id'
            )
        ).rejects.toBeInstanceOf(TermPolicyNotFoundException);
    });

    it('rejects content mutation after publication', async () => {
        termPolicyRepository.findOneById.mockResolvedValue({
            ...draft,
            status: EnumTermPolicyStatus.published,
        });

        await expect(
            service.removeContentByAdmin(
                draft.id,
                EnumMessageLanguage.en,
                'admin-id'
            )
        ).rejects.toBeInstanceOf(TermPolicyStatusInvalidException);
    });

    it('rejects adding a language already present in the draft', async () => {
        termPolicyRepository.findOneById.mockResolvedValue(draft);
        termPolicyUtil.getContentByLanguage.mockReturnValue(content);

        await expect(
            service.addContentByAdmin(
                draft.id,
                { language: EnumMessageLanguage.en, key: 'key', size: 100 },
                'admin-id'
            )
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
            service.addContentByAdmin(
                draft.id,
                {
                    language: EnumMessageLanguage.en,
                    key: mapped.key,
                    size: mapped.size,
                },
                'admin-id'
            )
        ).resolves.toBeUndefined();
        expect(termPolicyRepository.addContent).toHaveBeenCalledWith(
            draft.id,
            { language: EnumMessageLanguage.en, ...mapped },
            'admin-id'
        );
    });

    it('rejects removing a language absent from the draft', async () => {
        termPolicyRepository.findOneById.mockResolvedValue(draft);
        termPolicyUtil.getContentByLanguage.mockReturnValue(null);

        await expect(
            service.removeContentByAdmin(
                draft.id,
                EnumMessageLanguage.en,
                'admin-id'
            )
        ).rejects.toBeInstanceOf(TermPolicyContentNotFoundException);
    });
});
