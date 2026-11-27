import type { MockInstance } from 'vitest';
import { createTermPolicyUtilModule } from '@test/unit/helpers/test.unit.term-policy.helper';
import { EnumAwsS3Accessibility } from '@generated/prisma-client/client';
import { EnumFileExtensionTemplate } from '@common/file/enums/file.enum';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { TermPolicyContentInvalidException } from '@modules/term-policy/exceptions/term-policy.content-invalid.exception';
import type { ITermPolicyContentCheck } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';

describe('TermPolicyUtil', () => {
    let util: TermPolicyUtil;
    let helperStringService: HelperStringService;

    beforeEach(async () => {
        const module = await createTermPolicyUtilModule(
            'term-policies/{type}/{version}'
        );

        util = module.get(TermPolicyUtil);
        helperStringService = module.get(HelperStringService);
    });

    describe('isContentSizeAllowed', () => {
        it('returns true at the configured maximum', () => {
            expect(util.isContentSizeAllowed(4096)).toBe(true);
        });

        it('returns false above the configured maximum', () => {
            expect(util.isContentSizeAllowed(4097)).toBe(false);
        });
    });

    describe('isContentRejected', () => {
        const accepted: ITermPolicyContentCheck = {
            isSizeAllowed: true,
            isContentValid: true,
            content: {
                language: EnumMessageLanguage.en,
                bucket: 'bucket',
                key: 'term-policies/privacy/1/en.hbs',
                cdnUrl: null,
                completedUrl: 'https://bucket/term-policies/privacy/1/en.hbs',
                mime: 'text/plain',
                extension: 'hbs',
                access: EnumAwsS3Accessibility.private,
                size: 10,
            },
        };

        it('returns false when every check passes', () => {
            expect(util.isContentRejected([accepted, accepted])).toBe(false);
        });

        it('returns false for no check', () => {
            expect(util.isContentRejected([])).toBe(false);
        });

        it('returns true when one object is over the size', () => {
            expect(
                util.isContentRejected([
                    accepted,
                    { ...accepted, isSizeAllowed: false },
                ])
            ).toBe(true);
        });

        it('returns true when one object is not a text template', () => {
            expect(
                util.isContentRejected([{ ...accepted, isContentValid: false }])
            ).toBe(true);
        });
    });

    describe('isContentKeyInPath', () => {
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
        let random: MockInstance<HelperStringService['random']>;

        beforeEach(() => {
            random = vi
                .spyOn(helperStringService, 'random')
                .mockReturnValue('abc123');
        });

        it('builds the key under the version path as language, random part, and extension', () => {
            const result = util.getContentKey(
                EnumTermPolicyType.privacy,
                1,
                EnumMessageLanguage.en,
                { extension: EnumFileExtensionTemplate.hbs }
            );

            expect(result).toBe('term-policies/privacy/1/en-abc123.hbs');
            expect(random).toHaveBeenCalledWith(20);
        });

        it('returns a different key on each call', () => {
            random
                .mockReset()
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

        it('strips a single leading slash from the filled path', async () => {
            const module = await createTermPolicyUtilModule(
                '/term-policies/{type}/{version}'
            );
            vi.spyOn(module.get(HelperStringService), 'random').mockReturnValue(
                'abc123'
            );

            const result = module
                .get(TermPolicyUtil)
                .getContentKey(
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
            const result = util.getContentPublicPath(
                EnumTermPolicyType.privacy,
                1
            );

            expect(result).toBe('public/term-policies/privacy/1');
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
            const result = util['getPath'](EnumTermPolicyType.privacy, 1);

            expect(result).toBe('term-policies/privacy/1');
        });
    });
});
