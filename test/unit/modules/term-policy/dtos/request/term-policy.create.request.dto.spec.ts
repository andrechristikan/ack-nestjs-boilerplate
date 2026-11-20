import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { TermPolicyCreateRequestSchema } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';

describe('TermPolicyCreateRequestSchema', () => {
    const payload = {
        type: EnumTermPolicyType.privacy,
        version: 1,
        contents: [
            {
                language: EnumMessageLanguage.en,
                size: 1024,
                key: 'term-policies/privacy/v1/en.hbs',
            },
        ],
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = TermPolicyCreateRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = TermPolicyCreateRequestSchema.safeParse({
            ...payload,
            status: 'draft',
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('rejects an empty contents list', () => {
        const result = TermPolicyCreateRequestSchema.safeParse({
            ...payload,
            contents: [],
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: ['contents'], code: 'too_small' }),
        ]);
    });
});
