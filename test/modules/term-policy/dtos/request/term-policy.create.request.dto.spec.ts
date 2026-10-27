import { EnumTermPolicyType } from '@generated/prisma-client';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyCreateRequestSchema } from '@modules/term-policy/dtos/request/term-policy.create.request.dto';
describe('TermPolicyCreateRequestSchema', () => {
    const valid = {
        type: EnumTermPolicyType.privacy,
        version: 1,
        contents: [
            {
                language: EnumMessageLanguage.en,
                size: 1,
                key: 'term-policies/privacy/v1/en.hbs',
            },
        ],
    };
    it('accepts a draft with localized content', () =>
        expect(TermPolicyCreateRequestSchema.safeParse(valid).success).toBe(
            true
        ));
    it.each([
        { ...valid, contents: [] },
        { ...valid, version: 1.5 },
        { ...valid, unknown: true },
    ])('rejects malformed or unknown input', input =>
        expect(TermPolicyCreateRequestSchema.safeParse(input).success).toBe(
            false
        )
    );
});
