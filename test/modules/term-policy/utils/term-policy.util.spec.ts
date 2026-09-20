import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';

import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
    type TermPolicy,
} from '@generated/prisma-client';
import { EnumFileExtensionDocument } from '@common/file/enums/file.enum';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';
import { ConfigService } from '@nestjs/config';

describe('TermPolicyUtil', () => {
    let configService: ConfigService;
    let util: TermPolicyUtil;

    beforeEach(() => {
        vi.resetAllMocks();
        configService = new ConfigService({
            termPolicy: {
                uploadContentPath: '/terms/{type}/{version}',
                contentPublicPath: 'public/{type}/{version}',
            },
        });
        util = new TermPolicyUtil(
            configService,
            new HelperArrayService(),
            new HelperStringService()
        );
    });

    it('rejects duplicate languages', () => {
        expect(
            util.validateUniqueLanguages([
                { language: EnumMessageLanguage.en, size: 1, key: 'en' },
                { language: EnumMessageLanguage.en, size: 2, key: 'en-2' },
            ] satisfies TermPolicyContentRequestDto[])
        ).toBe(false);
    });

    it('builds private and public content paths', () => {
        const termPolicy = {
            type: EnumTermPolicyType.privacy,
            version: 2,
        } as TermPolicy;

        expect(util.getPath(termPolicy)).toBe('/terms/privacy/2');
        expect(
            util.getContentPublicPath(termPolicy.type, termPolicy.version)
        ).toBe('public/privacy/2');
        expect(
            util.createRandomFilenameContentWithPath(
                EnumTermPolicyType.privacy,
                2,
                EnumMessageLanguage.en,
                { extension: EnumFileExtensionDocument.pdf }
            )
        ).toBe('terms/privacy/2/en.pdf');
    });

    it('maps activity metadata using the updated timestamp', () => {
        const updatedAt = new Date('2026-01-02T00:00:00.000Z');
        const termPolicy = {
            id: 'term-id',
            type: EnumTermPolicyType.privacy,
            version: 2,
            status: EnumTermPolicyStatus.draft,
            publishedAt: null,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt,
            updatedBy: null,
        } satisfies TermPolicy;

        expect(util.mapActivityLogMetadata(termPolicy, updatedAt)).toEqual({
            termPolicyId: 'term-id',
            termPolicyType: EnumTermPolicyType.privacy,
            termPolicyVersion: 2,
            timestamp: updatedAt,
        });
    });
});
