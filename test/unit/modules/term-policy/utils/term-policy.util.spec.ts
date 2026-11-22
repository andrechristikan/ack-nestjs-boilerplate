import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAwsS3Accessibility } from '@generated/prisma-client/client';
import { EnumFileExtensionTemplate } from '@common/file/enums/file.enum';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { TermPolicyContentInvalidException } from '@modules/term-policy/exceptions/term-policy.content-invalid.exception';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';

describe('TermPolicyUtil', () => {
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();

    let util: TermPolicyUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            if (key === 'termPolicy.uploadContentPathPattern') {
                return 'term-policies/{type}/{version}';
            }
            if (key === 'termPolicy.contentPublicPathPattern') {
                return 'public/term-policies/{type}/{version}';
            }
            if (key === 'termPolicy.content.maxSizeInBytes') {
                return 4096;
            }
            if (key === 'termPolicy.contentKeyRandomLength') {
                return 20;
            }
            return undefined;
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyUtil,
                { provide: ConfigService, useValue: configService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
            ],
        }).compile();

        util = module.get(TermPolicyUtil);
    });

    describe('isContentSizeAllowed', () => {
        it('returns true at the configured maximum', () => {
            expect(util.isContentSizeAllowed(4096)).toBe(true);
        });

        it('returns false above the configured maximum', () => {
            expect(util.isContentSizeAllowed(4097)).toBe(false);
        });
    });

    describe('isContentKeyInPath', () => {
        beforeEach(() => {
            helperStringService.fillPattern.mockReturnValue(
                'term-policies/privacy/1'
            );
        });

        it('returns true when the key sits under the path of the type and version', () => {
            const result = util.isContentKeyInPath(
                EnumTermPolicyType.privacy,
                1,
                'term-policies/privacy/1/en.hbs'
            );

            expect(result).toBe(true);
        });

        it('returns false when the key sits under another path', () => {
            const result = util.isContentKeyInPath(
                EnumTermPolicyType.privacy,
                1,
                'term-policies/privacy/2/en.hbs'
            );

            expect(result).toBe(false);
        });

        it('returns false when the key only shares the path as a prefix of a segment', () => {
            const result = util.isContentKeyInPath(
                EnumTermPolicyType.privacy,
                1,
                'term-policies/privacy/10/en.hbs'
            );

            expect(result).toBe(false);
        });

        it("returns false for a key ending in the path's slash", () => {
            const result = util.isContentKeyInPath(
                EnumTermPolicyType.privacy,
                1,
                'term-policies/privacy/1/'
            );

            expect(result).toBe(false);
        });

        it('returns true for a filename under the path', () => {
            const result = util.isContentKeyInPath(
                EnumTermPolicyType.privacy,
                1,
                'term-policies/privacy/1/a'
            );

            expect(result).toBe(true);
        });
    });

    describe('getContentKey', () => {
        beforeEach(() => {
            helperStringService.fillPattern.mockReturnValue(
                'term-policies/privacy/1'
            );
            helperStringService.random.mockReturnValue('abc123');
        });

        it('builds the key under the version path as language, random part, and extension', () => {
            const result = util.getContentKey(
                EnumTermPolicyType.privacy,
                1,
                EnumMessageLanguage.en,
                { extension: EnumFileExtensionTemplate.hbs }
            );

            expect(result).toBe('term-policies/privacy/1/en-abc123.hbs');
            expect(helperStringService.random).toHaveBeenCalledWith(20);
        });

        it('returns a different key on each call', () => {
            helperStringService.random
                .mockReturnValueOnce('first111')
                .mockReturnValueOnce('second22');

            const first = util.getContentKey(
                EnumTermPolicyType.privacy,
                1,
                EnumMessageLanguage.en,
                { extension: EnumFileExtensionTemplate.hbs }
            );
            const second = util.getContentKey(
                EnumTermPolicyType.privacy,
                1,
                EnumMessageLanguage.en,
                { extension: EnumFileExtensionTemplate.hbs }
            );

            expect(first).toBe('term-policies/privacy/1/en-first111.hbs');
            expect(second).toBe('term-policies/privacy/1/en-second22.hbs');
            expect(first).not.toBe(second);
        });

        it('strips a single leading slash from the filled path', () => {
            helperStringService.fillPattern.mockReturnValue(
                '/term-policies/privacy/1'
            );

            const result = util.getContentKey(
                EnumTermPolicyType.privacy,
                1,
                EnumMessageLanguage.en,
                { extension: EnumFileExtensionTemplate.hbs }
            );

            expect(result).toBe('term-policies/privacy/1/en-abc123.hbs');
        });

        it('lowercases the extension', () => {
            const result = util.getContentKey(
                EnumTermPolicyType.privacy,
                1,
                EnumMessageLanguage.en,
                { extension: 'HBS' as EnumFileExtensionTemplate }
            );

            expect(result).toBe('term-policies/privacy/1/en-abc123.hbs');
        });
    });

    describe('toContents', () => {
        const stored = {
            language: EnumMessageLanguage.en,
            bucket: 'bucket',
            key: 'term/en.pdf',
            cdnUrl: null,
            completedUrl: 'https://bucket/term/en.pdf',
            mime: 'application/pdf',
            extension: 'pdf',
            access: EnumAwsS3Accessibility.private,
            size: 10,
        };

        it('returns the contents typed when every language is known', () => {
            const result = util.toContents([stored]);

            expect(result).toEqual([stored]);
        });

        it('returns TermPolicyContentInvalidException for an unknown language', () => {
            const result = util.toContents([{ ...stored, language: 'xx' }]);

            expect(result).toBeInstanceOf(TermPolicyContentInvalidException);
        });
    });

    describe('getContentPublicPath', () => {
        it('fills the content public path with type and version', () => {
            helperStringService.fillPattern.mockReturnValue(
                'public/term-policies/privacy/1'
            );

            const result = util.getContentPublicPath(
                EnumTermPolicyType.privacy,
                1
            );

            expect(result).toBe('public/term-policies/privacy/1');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'public/term-policies/{type}/{version}',
                { type: EnumTermPolicyType.privacy, version: '1' }
            );
        });
    });

    describe('mapActivityLogMetadata', () => {
        it('maps the term policy identity and timestamp', () => {
            const termPolicy = {
                id: 'term-policy-1',
                type: EnumTermPolicyType.privacy,
                version: 1,
            };
            const timestamp = new Date('2026-01-01T00:00:00.000Z');

            const result = util.mapActivityLogMetadata(termPolicy, timestamp);

            expect(result).toEqual({
                termPolicyId: 'term-policy-1',
                termPolicyType: EnumTermPolicyType.privacy,
                termPolicyVersion: 1,
                timestamp,
            });
        });
    });

    describe('getPath', () => {
        it('fills the upload content path with type and version', () => {
            helperStringService.fillPattern.mockReturnValue(
                'term-policies/privacy/1'
            );

            const result = util['getPath'](EnumTermPolicyType.privacy, 1);

            expect(result).toBe('term-policies/privacy/1');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'term-policies/{type}/{version}',
                { type: EnumTermPolicyType.privacy, version: '1' }
            );
        });
    });
});
