import { TermPolicyAdminListRequestSchema } from '@modules/term-policy/dtos/request/term-policy.admin-list.request.dto';
import { EnumTermPolicyOrderBy } from '@modules/term-policy/enums/term-policy.enum';

describe('TermPolicyAdminListRequestSchema', () => {
    it('parses a payload into exactly the declared fields', () => {
        const payload = {
            page: 1,
            perPage: 20,
            orderBy: 'latest',
            type: 'privacy',
            status: 'draft',
        };

        const result = TermPolicyAdminListRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty payload with every field optional', () => {
        const result = TermPolicyAdminListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces page and perPage to numbers', () => {
        const result = TermPolicyAdminListRequestSchema.parse({
            page: '2',
            perPage: '10',
        });

        expect(result).toEqual({ page: 2, perPage: 10 });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            TermPolicyAdminListRequestSchema.parse({ search: 'x' })
        ).toThrow();
    });

    it('accepts a type of 256 characters and rejects one of 257', () => {
        expect(() =>
            TermPolicyAdminListRequestSchema.parse({ type: 'a'.repeat(256) })
        ).not.toThrow();
        expect(() =>
            TermPolicyAdminListRequestSchema.parse({ type: 'a'.repeat(257) })
        ).toThrow();
    });

    it('accepts a status of 256 characters and rejects one of 257', () => {
        expect(() =>
            TermPolicyAdminListRequestSchema.parse({ status: 'a'.repeat(256) })
        ).not.toThrow();
        expect(() =>
            TermPolicyAdminListRequestSchema.parse({ status: 'a'.repeat(257) })
        ).toThrow();
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            TermPolicyAdminListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumTermPolicyOrderBy).join(', '));
    });

    it.each(Object.values(EnumTermPolicyOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                TermPolicyAdminListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            TermPolicyAdminListRequestSchema.safeParse({ orderBy: '' }).success
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
            TermPolicyAdminListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            TermPolicyAdminListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
