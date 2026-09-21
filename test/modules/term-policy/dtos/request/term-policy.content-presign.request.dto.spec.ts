import { EnumTermPolicyType } from '@generated/prisma-client';
import { EnumMessageLanguage } from '@common/message/enums/message.enum';
import { TermPolicyContentPresignRequestSchema } from '@modules/term-policy/dtos/request/term-policy.content-presign.request.dto';
describe('TermPolicyContentPresignRequestSchema', () => {
    const valid = {
        type: EnumTermPolicyType.privacy,
        language: EnumMessageLanguage.en,
        version: 1,
        size: 1,
    };
    it('accepts an integer content presign request', () =>
        expect(TermPolicyContentPresignRequestSchema.parse(valid)).toEqual(
            valid
        ));
    it.each([
        { ...valid, version: 1.5 },
        { ...valid, language: 'xx' },
        { ...valid, unknown: true },
    ])('rejects malformed or unknown input', input =>
        expect(
            TermPolicyContentPresignRequestSchema.safeParse(input).success
        ).toBe(false)
    );
});
