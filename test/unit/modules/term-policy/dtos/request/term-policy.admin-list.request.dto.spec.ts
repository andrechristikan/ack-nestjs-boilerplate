import { TermPolicyDefaultAvailableOrderBy } from '@modules/term-policy/constants/term-policy.list.constant';
import { TermPolicyAdminListRequestSchema } from '@modules/term-policy/dtos/request/term-policy.admin-list.request.dto';

describe('TermPolicyAdminListRequestSchema', () => {
    it('parses a payload into exactly the declared fields', () => {
        const payload = {
            page: 1,
            perPage: 20,
            orderBy: 'version:desc',
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

    it('keeps the module orderBy description', () => {
        expect(
            TermPolicyAdminListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(TermPolicyDefaultAvailableOrderBy.join(', '));
    });

    it('accepts an empty orderBy so the module default order applies', () => {
        expect(
            TermPolicyAdminListRequestSchema.safeParse({ orderBy: '' }).success
        ).toBe(true);
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = TermPolicyDefaultAvailableOrderBy[0];
        const last =
            TermPolicyDefaultAvailableOrderBy[
                TermPolicyDefaultAvailableOrderBy.length - 1
            ];

        expect(
            TermPolicyAdminListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            TermPolicyAdminListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${TermPolicyDefaultAvailableOrderBy[0]}:`,
        `${TermPolicyDefaultAvailableOrderBy[0]}:DESC`,
        `${TermPolicyDefaultAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            TermPolicyAdminListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });
});
