import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyContentsRequestSchema } from '@modules/term-policy/dtos/request/term-policy.contents.request.dto';

describe('TermPolicyContentsRequestSchema', () => {
    const contents = [
        {
            language: EnumMessageLanguage.en,
            key: 'term-policies/privacy/v1/en.hbs',
        },
    ];

    it('parses a payload into exactly the declared fields', () => {
        const result = TermPolicyContentsRequestSchema.parse({ contents });

        expect(result).toEqual({ contents });
    });

    it('rejects an empty contents list', () => {
        const result = TermPolicyContentsRequestSchema.safeParse({
            contents: [],
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['contents'], code: 'too_small' }),
        ]);
    });

    it('rejects a duplicated language across contents', () => {
        const result = TermPolicyContentsRequestSchema.safeParse({
            contents: [
                ...contents,
                {
                    language: EnumMessageLanguage.en,
                    key: 'term-policies/privacy/v1/en-2.hbs',
                },
            ],
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['contents'], code: 'too_big' }),
            expect.objectContaining({ path: ['contents'], code: 'custom' }),
        ]);
    });

    it('rejects an undeclared key', () => {
        const result = TermPolicyContentsRequestSchema.safeParse({
            contents,
            version: 1,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('accepts one content per language and rejects more than the language count', () => {
        const pastBound = new Array(
            Object.values(EnumMessageLanguage).length + 1
        ).fill(contents[0]);

        expect(() =>
            TermPolicyContentsRequestSchema.parse({ contents })
        ).not.toThrow();
        const result = TermPolicyContentsRequestSchema.safeParse({
            contents: pastBound,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['contents'], code: 'too_big' }),
            expect.objectContaining({ path: ['contents'], code: 'custom' }),
        ]);
    });
});
