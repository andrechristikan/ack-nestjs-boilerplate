import { ApiKeyUpdateStatusRequestSchema } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';

describe('ApiKeyUpdateStatusRequestSchema', () => {
    it.each([true, false])('accepts boolean status %s', isActive =>
        expect(ApiKeyUpdateStatusRequestSchema.parse({ isActive })).toEqual({
            isActive,
        })
    );
    it.each([{ isActive: 'true' }, { isActive: true, unknown: true }])(
        'rejects malformed or unknown input',
        input =>
            expect(
                ApiKeyUpdateStatusRequestSchema.safeParse(input).success
            ).toBe(false)
    );
});
