import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyContentsRequestSchema } from '@modules/term-policy/dtos/request/term-policy.contents.request.dto';

describe('TermPolicyContentsRequestSchema', () => {
    const contents = [
        {
            language: EnumMessageLanguage.en,
            size: 1024,
            key: 'term-policies/privacy/v1/en.hbs',
        },
    ];

    it('parses a payload into exactly the declared fields', () => {
        const result = TermPolicyContentsRequestSchema.parse({ contents });

        expect(result).toEqual({ contents });
    });

    it('rejects an empty contents list', () => {
        expect(() =>
            TermPolicyContentsRequestSchema.parse({ contents: [] })
        ).toThrow();
    });

    it('rejects a duplicated language across contents', () => {
        expect(() =>
            TermPolicyContentsRequestSchema.parse({
                contents: [
                    ...contents,
                    {
                        language: EnumMessageLanguage.en,
                        size: 2048,
                        key: 'term-policies/privacy/v1/en-2.hbs',
                    },
                ],
            })
        ).toThrow();
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            TermPolicyContentsRequestSchema.parse({
                contents,
                version: 1,
            })
        ).toThrow();
    });
});
