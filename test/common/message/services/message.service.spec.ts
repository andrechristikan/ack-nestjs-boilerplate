import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { MessageService } from '@common/message/services/message.service';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { MessageValidationIssueFallbackKey } from '@common/message/constants/message.constant';

type TestIssue = StandardSchemaV1.Issue & { code?: unknown };

describe('MessageService', () => {
    const translate =
        vi.fn<
            (
                path: string,
                options?: { lang?: string; args?: unknown }
            ) => string
        >();
    const i18n: MockProxy<I18nService> = mock<I18nService>({
        translate: translate as I18nService['translate'],
    });
    const configGet = vi.fn<(key: string) => unknown>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let service: MessageService;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            if (key === 'message.language') {
                return EnumMessageLanguage.en;
            }
            if (key === 'message.availableLanguage') {
                return [EnumMessageLanguage.en];
            }
            return undefined;
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessageService,
                { provide: I18nService, useValue: i18n },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get(MessageService);
    });

    describe('filterLanguage', () => {
        it('returns the matching available language', () => {
            expect(service.filterLanguage(EnumMessageLanguage.en)).toBe(
                EnumMessageLanguage.en
            );
        });

        it('returns undefined when the language is not available', () => {
            expect(service.filterLanguage('fr')).toBeUndefined();
        });
    });

    describe('setMessage', () => {
        it('translates with the default language when no custom language is given', () => {
            translate.mockReturnValue('translated');

            const result = service.setMessage('user.error.notFound');

            expect(result).toBe('translated');
            expect(translate).toHaveBeenCalledWith('user.error.notFound', {
                lang: EnumMessageLanguage.en,
                args: undefined,
            });
        });

        it('translates with the resolved custom language and properties', () => {
            translate.mockReturnValue('translated');

            const result = service.setMessage('user.error.notFound', {
                customLanguage: EnumMessageLanguage.en,
                properties: { name: 'x' },
            });

            expect(result).toBe('translated');
            expect(translate).toHaveBeenCalledWith('user.error.notFound', {
                lang: EnumMessageLanguage.en,
                args: { name: 'x' },
            });
        });
    });

    describe('setValidationMessage', () => {
        it('maps every issue into a validation message', () => {
            translate.mockImplementation((path: string) => path);
            const issues: TestIssue[] = [
                { message: 'm1', path: ['a'], code: 'too_small' },
                { message: 'm2', path: ['b'], code: 'too_big' },
            ];

            const result = service.setValidationMessage(issues);

            expect(result).toHaveLength(2);
            expect(result[0]).toMatchObject({
                key: 'tooSmall',
                property: 'a',
            });
            expect(result[1]).toMatchObject({
                key: 'tooBig',
                property: 'b',
            });
        });
    });

    describe('setValidationImportMessage', () => {
        it('groups the mapped validation messages under their row', () => {
            translate.mockImplementation((path: string) => path);

            const result = service.setValidationImportMessage([
                {
                    row: 3,
                    errors: [
                        {
                            message: 'm1',
                            path: ['a'],
                            code: 'too_small',
                        } as TestIssue,
                    ],
                },
            ]);

            expect(result).toEqual([
                {
                    row: 3,
                    errors: [
                        {
                            key: 'tooSmall',
                            property: 'a',
                            message: 'request.error.tooSmall',
                        },
                    ],
                },
            ]);
        });
    });

    describe('resolveIssueKey', () => {
        it('camel-cases a snake_case issue code', () => {
            const issue = { message: 'm', code: 'too_small' } as TestIssue;

            expect(service['resolveIssueKey'](issue)).toBe('tooSmall');
        });

        it('falls back to the default key when no code is present', () => {
            const issue = { message: 'm' } as TestIssue;

            expect(service['resolveIssueKey'](issue)).toBe(
                MessageValidationIssueFallbackKey
            );
        });

        it('falls back to the default key when the code is not a string', () => {
            const issue = { message: 'm', code: 123 } as TestIssue;

            expect(service['resolveIssueKey'](issue)).toBe(
                MessageValidationIssueFallbackKey
            );
        });
    });

    describe('resolveIssueProperty', () => {
        it('returns Unknown for an empty path', () => {
            const issue = { message: 'm', path: [] } as TestIssue;

            expect(service['resolveIssueProperty'](issue)).toBe('Unknown');
        });

        it('returns Unknown when no path is given', () => {
            const issue = { message: 'm' } as TestIssue;

            expect(service['resolveIssueProperty'](issue)).toBe('Unknown');
        });

        it('joins plain path segments with a dot', () => {
            const issue = {
                message: 'm',
                path: ['user', 'email'],
            } as TestIssue;

            expect(service['resolveIssueProperty'](issue)).toBe('user.email');
        });

        it('reads the key of an object path segment', () => {
            const issue = {
                message: 'm',
                path: [{ key: 'items' }, 0, 'email'],
            } as TestIssue;

            expect(service['resolveIssueProperty'](issue)).toBe(
                'items.0.email'
            );
        });
    });

    describe('createValidationMessage', () => {
        it('uses the overridden translation when it differs from the issue message', () => {
            const issue = {
                message: 'auth.error.custom',
                path: ['field'],
                code: 'custom',
            } as TestIssue;
            translate.mockReturnValueOnce('Custom message');

            const result = service['createValidationMessage'](issue);

            expect(result).toEqual({
                key: 'custom',
                property: 'field',
                message: 'Custom message',
            });
            expect(translate).toHaveBeenCalledTimes(1);
        });

        it('falls back to the request.error path when no override applies', () => {
            const issue = {
                message: 'plain text, not a path',
                path: ['field'],
                code: 'too_small',
            } as TestIssue;
            translate.mockImplementation((path: string) =>
                path === issue.message ? issue.message : 'Fallback message'
            );

            const result = service['createValidationMessage'](issue);

            expect(result).toEqual({
                key: 'tooSmall',
                property: 'field',
                message: 'Fallback message',
            });
            expect(translate).toHaveBeenCalledTimes(2);
            expect(translate).toHaveBeenNthCalledWith(
                2,
                'request.error.tooSmall',
                expect.objectContaining({ lang: EnumMessageLanguage.en })
            );
        });
    });
});
