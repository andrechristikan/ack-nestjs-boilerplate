import { ApiKeyUpdateDateRequestSchema } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';

describe('ApiKeyUpdateDateRequestSchema', () => {
    it('accepts an equal date window', () =>
        expect(
            ApiKeyUpdateDateRequestSchema.safeParse({
                startAt: '2026-01-01',
                endAt: '2026-01-01',
            }).success
        ).toBe(true));
    it('rejects an inverted date window', () =>
        expect(
            ApiKeyUpdateDateRequestSchema.safeParse({
                startAt: '2026-02-01',
                endAt: '2026-01-01',
            }).success
        ).toBe(false));
});
