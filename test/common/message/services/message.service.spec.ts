import type { StandardSchemaV1 } from '@standard-schema/spec';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';

import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { MessageService } from '@common/message/services/message.service';

type IIssue = StandardSchemaV1.Issue & { code?: unknown };

const issue = (value: IIssue): StandardSchemaV1.Issue => value;

describe('MessageService', () => {
    const i18n: MockProxy<I18nService> = mock<I18nService>();
    const translate = vi.fn<(path: string, options: unknown) => string>();
    const configService = new ConfigService({
        'message.language': EnumMessageLanguage.en,
        'message.availableLanguage': [EnumMessageLanguage.en],
    });

    let service: MessageService;

    beforeEach(() => {
        // translate echoes the path unless a case overrides it
        translate.mockImplementation(path => path);
        i18n.translate.mockImplementation(((path: string, options: unknown) =>
            translate(path, options)) as unknown as I18nService['translate']);
        service = new MessageService(
            i18n as unknown as I18nService,
            configService
        );
    });

    describe('filterLanguage', () => {
        it('returns an available language', () => {
            expect(service.filterLanguage('en')).toBe('en');
        });

        it('returns undefined for an unavailable language', () => {
            expect(service.filterLanguage('zz')).toBeUndefined();
        });
    });

    describe('setMessage', () => {
        it('uses the default language and forwards args', () => {
            translate.mockReturnValue('translated');

            expect(service.setMessage('a.b', { properties: { n: 1 } })).toBe(
                'translated'
            );
            expect(translate).toHaveBeenCalledWith('a.b', {
                lang: EnumMessageLanguage.en,
                args: { n: 1 },
            });
        });

        it('uses the default language when no options are given', () => {
            service.setMessage('a.b');

            expect(translate).toHaveBeenCalledWith('a.b', {
                lang: EnumMessageLanguage.en,
                args: undefined,
            });
        });

        it('filters a custom language through the available list', () => {
            service.setMessage('a.b', { customLanguage: 'en' });
            service.setMessage('a.b', { customLanguage: 'zz' });

            expect(translate).toHaveBeenNthCalledWith(1, 'a.b', {
                lang: 'en',
                args: undefined,
            });
            expect(translate).toHaveBeenNthCalledWith(2, 'a.b', {
                lang: undefined,
                args: undefined,
            });
        });
    });

    describe('setValidationMessage', () => {
        it('camel-cases the issue code and falls back to request.error.<key>', () => {
            translate.mockImplementation(path =>
                path === 'request.error.invalidFormat' ? 'Bad format' : path
            );

            expect(
                service.setValidationMessage([
                    issue({
                        code: 'invalid_format',
                        message: 'Invalid string',
                        path: ['email'],
                    }),
                ])
            ).toEqual([
                {
                    key: 'invalidFormat',
                    property: 'email',
                    message: 'Bad format',
                },
            ]);
            expect(translate).toHaveBeenCalledWith(
                'request.error.invalidFormat',
                {
                    lang: EnumMessageLanguage.en,
                    args: { property: 'email' },
                }
            );
        });

        it('keeps the translated issue message when it overrides the raw one', () => {
            translate.mockImplementation(path =>
                path === 'user.custom' ? 'Custom text' : path
            );

            expect(
                service.setValidationMessage([
                    issue({
                        code: 'custom',
                        message: 'user.custom',
                        path: ['name'],
                    }),
                ])
            ).toEqual([
                { key: 'custom', property: 'name', message: 'Custom text' },
            ]);
            expect(translate).not.toHaveBeenCalledWith(
                'request.error.custom',
                expect.anything()
            );
        });

        it('uses the fallback key when the issue has no string code', () => {
            const [noCode, numericCode] = service.setValidationMessage([
                { message: 'x', path: ['a'] },
                issue({ code: 5, message: 'x', path: ['a'] }),
            ]);

            expect(noCode.key).toBe('custom');
            expect(numericCode.key).toBe('custom');
        });

        it('joins nested path segments, unwrapping object segments, and passes the last one as property arg', () => {
            const [result] = service.setValidationMessage(
                [
                    issue({
                        code: 'too_small',
                        message: 'x',
                        path: ['items', 2, { key: 'name' }],
                    }),
                ],
                { customLanguage: 'en' }
            );

            expect(result.property).toBe('items.2.name');
            expect(translate).toHaveBeenCalledWith('request.error.tooSmall', {
                lang: 'en',
                args: { property: 'name' },
            });
        });

        it('reports Unknown when the path is empty or missing', () => {
            const results = service.setValidationMessage([
                issue({ code: 'custom', message: 'x', path: [] }),
                issue({ code: 'custom', message: 'x' }),
            ]);

            expect(results.map(r => r.property)).toEqual([
                'Unknown',
                'Unknown',
            ]);
        });
    });

    describe('setValidationImportMessage', () => {
        it('keeps the row and localizes each row error', () => {
            const result = service.setValidationImportMessage([
                {
                    row: 3,
                    errors: [
                        issue({
                            code: 'invalid_type',
                            message: 'x',
                            path: ['age'],
                        }),
                    ],
                },
                { row: 4, errors: [] },
            ]);

            expect(result).toEqual([
                {
                    row: 3,
                    errors: [
                        {
                            key: 'invalidType',
                            property: 'age',
                            message: 'request.error.invalidType',
                        },
                    ],
                },
                { row: 4, errors: [] },
            ]);
        });
    });
});
