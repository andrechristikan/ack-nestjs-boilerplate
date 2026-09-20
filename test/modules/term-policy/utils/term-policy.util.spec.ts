import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
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
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();
    let util: TermPolicyUtil;

    beforeEach(async () => {
        vi.resetAllMocks();
        const config: Record<string, string> = {
            'termPolicy.uploadContentPath': '/terms/{type}/{version}',
            'termPolicy.contentPublicPath': 'public/{type}/{version}',
        };
        vi.mocked(configService.get).mockImplementation(
            (key: string) => config[key]
        );
        helperArrayService.unique.mockImplementation(items => [
            ...new Set(items),
        ]);
        helperStringService.fillPattern.mockImplementation(
            (pattern: string, values: Record<string, string>) =>
                pattern.replace(/\{(\w+)\}/g, (_m, k: string) => values[k])
        );
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyUtil,
                { provide: ConfigService, useValue: configService },
                { provide: HelperArrayService, useValue: helperArrayService },
                { provide: HelperStringService, useValue: helperStringService },
            ],
        }).compile();
        util = moduleRef.get(TermPolicyUtil);
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
