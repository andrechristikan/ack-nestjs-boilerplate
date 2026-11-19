import { TermPolicyPublicListRequestSchema } from '@modules/term-policy/dtos/request/term-policy.public-list.request.dto';
import { EnumTermPolicyOrderBy } from '@modules/term-policy/enums/term-policy.enum';

describe('TermPolicyPublicListRequestSchema', () => {
    it('parses a payload into exactly the declared fields', () => {
        const payload = {
            cursor: 'eyJpZCI6IjEifQ',
            perPage: 20,
            orderBy: 'latest',
            type: 'privacy',
        };

        const result = TermPolicyPublicListRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty payload with every field optional', () => {
        const result = TermPolicyPublicListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            TermPolicyPublicListRequestSchema.parse({ status: 'draft' })
        ).toThrow();
    });

    it('rejects search', () => {
        expect(
            TermPolicyPublicListRequestSchema.safeParse({ search: 'x' }).success
        ).toBe(false);
    });

    it('accepts a type of 256 characters and rejects one of 257', () => {
        expect(() =>
            TermPolicyPublicListRequestSchema.parse({ type: 'a'.repeat(256) })
        ).not.toThrow();
        expect(() =>
            TermPolicyPublicListRequestSchema.parse({ type: 'a'.repeat(257) })
        ).toThrow();
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            TermPolicyPublicListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumTermPolicyOrderBy).join(', '));
    });

    it.each(Object.values(EnumTermPolicyOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                TermPolicyPublicListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            TermPolicyPublicListRequestSchema.safeParse({ orderBy: '' }).success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'latest:asc',
        'default',
        'createdAt',
        'publishedAt',
        'version',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            TermPolicyPublicListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            TermPolicyPublicListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
