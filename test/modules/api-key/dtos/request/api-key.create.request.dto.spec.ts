import { EnumApiKeyType } from '@generated/prisma-client';
import { ApiKeyCreateRequestSchema } from '@modules/api-key/dtos/request/api-key.create.request.dto';

describe('ApiKeyCreateRequestSchema', () => {
    const base = { name: 'key', type: EnumApiKeyType.default };
    it.each([base, { ...base, startAt: '2026-01-01', endAt: '2026-01-01' }])(
        'accepts valid optional and equal date windows',
        input =>
            expect(ApiKeyCreateRequestSchema.safeParse(input).success).toBe(
                true
            )
    );
    it('rejects an inverted date window', () =>
        expect(
            ApiKeyCreateRequestSchema.safeParse({
                ...base,
                startAt: '2026-02-01',
                endAt: '2026-01-01',
            }).success
        ).toBe(false));
});
