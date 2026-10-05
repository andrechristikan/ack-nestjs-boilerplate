import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAwsS3Accessibility } from '@common/aws/enums/aws.enum';
import { EnumFileExtensionTemplate } from '@common/file/enums/file.enum';
import { HelperArrayService } from '@common/helper/services/helper.array.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import {
    EnumTermPolicyStatus,
    EnumTermPolicyType,
} from '@generated/prisma-client/client';
import type { Prisma, TermPolicy } from '@generated/prisma-client/client';
import type { TermPolicyContentRequestDto } from '@modules/term-policy/dtos/request/term-policy.content.request.dto';
import type { ITermPolicyContent } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';

describe('TermPolicyUtil', () => {
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const helperArrayService: MockProxy<HelperArrayService> =
        mock<HelperArrayService>();
    const helperStringService: MockProxy<HelperStringService> =
        mock<HelperStringService>();

    let util: TermPolicyUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            if (key === 'termPolicy.uploadContentPath') {
                return 'term-policies/{type}/{version}';
            }
            if (key === 'termPolicy.contentPublicPath') {
                return 'public/term-policies/{type}/{version}';
            }
            return undefined;
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyUtil,
                { provide: ConfigService, useValue: configService },
                { provide: HelperArrayService, useValue: helperArrayService },
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
            ],
        }).compile();

        util = module.get(TermPolicyUtil);
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

            expect(util.validateUniqueLanguages(contents)).toBe(true);
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

            expect(util.validateUniqueLanguages(contents)).toBe(false);
        });
    });

    describe('getPath', () => {
        it('fills the upload content path with type and version', () => {
            helperStringService.fillPattern.mockReturnValue(
                'term-policies/privacy/1'
            );
            const timestamp = new Date('2026-01-01T00:00:00.000Z');
            const termPolicy: TermPolicy = {
                id: 'term-policy-1',
                type: EnumTermPolicyType.privacy,
                contents: [],
                version: 1,
                status: EnumTermPolicyStatus.published,
                publishedAt: timestamp,
                createdAt: timestamp,
                createdBy: null,
                updatedAt: timestamp,
                updatedBy: null,
            };

            const result = util.getPath(termPolicy);

            expect(result).toBe('term-policies/privacy/1');
            expect(helperStringService.fillPattern).toHaveBeenCalledWith(
                'term-policies/{type}/{version}',
                { type: EnumTermPolicyType.privacy, version: '1' }
            );
        });
    });

    describe('createRandomFilenameContentWithPath', () => {
        it('appends the language and extension to the filled path', () => {
            helperStringService.fillPattern.mockReturnValue(
                'term-policies/privacy/1'
            );

            const result = util.createRandomFilenameContentWithPath(
                EnumTermPolicyType.privacy,
                1,
                EnumMessageLanguage.en,
                { extension: EnumFileExtensionTemplate.hbs }
            );

            expect(result).toBe('term-policies/privacy/1/en.hbs');
        });

        it('strips a single leading slash from the filled path', () => {
            helperStringService.fillPattern.mockReturnValue(
                '/term-policies/privacy/1'
            );

            const result = util.createRandomFilenameContentWithPath(
                EnumTermPolicyType.privacy,
                1,
                EnumMessageLanguage.en,
                { extension: EnumFileExtensionTemplate.hbs }
            );

            expect(result).toBe('term-policies/privacy/1/en.hbs');
        });

        it('lowercases the extension', () => {
            helperStringService.fillPattern.mockReturnValue(
                'term-policies/privacy/1'
            );

            const result = util.createRandomFilenameContentWithPath(
                EnumTermPolicyType.privacy,
                1,
                EnumMessageLanguage.en,
                { extension: 'HBS' as EnumFileExtensionTemplate }
            );

            expect(result).toBe('term-policies/privacy/1/en.hbs');
        });
    });

    describe('checkContentExist', () => {
        it('returns true when a content in the language exists', () => {
            const contents = [
                { language: EnumMessageLanguage.en },
            ] as unknown as Prisma.JsonArray;

            expect(
                util.checkContentExist(contents, EnumMessageLanguage.en)
            ).toBe(true);
        });

        it('returns false when no content in the language exists', () => {
            const contents = [] as unknown as Prisma.JsonArray;

            expect(
                util.checkContentExist(contents, EnumMessageLanguage.en)
            ).toBe(false);
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

    describe('getContentByLanguage', () => {
        it('returns the content matching the language', () => {
            const content: ITermPolicyContent = {
                language: EnumMessageLanguage.en,
                bucket: 'sample-bucket',
                key: 'term-policies/privacy/v1/en.hbs',
                cdnUrl: null,
                completedUrl: 'https://cdn.example.com/en.hbs',
                mime: 'text/plain',
                extension: 'hbs',
                access: EnumAwsS3Accessibility.public,
                size: 1024,
            };

            expect(
                util.getContentByLanguage([content], EnumMessageLanguage.en)
            ).toBe(content);
        });

        it('returns null when no content matches the language', () => {
            expect(
                util.getContentByLanguage([], EnumMessageLanguage.en)
            ).toBeNull();
        });
    });
});
