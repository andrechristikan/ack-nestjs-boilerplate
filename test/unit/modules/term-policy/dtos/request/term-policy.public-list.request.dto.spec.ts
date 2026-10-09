import { TermPolicyDefaultAvailableOrderBy } from '@modules/term-policy/constants/term-policy.list.constant';
import { TermPolicyPublicListRequestSchema } from '@modules/term-policy/dtos/request/term-policy.public-list.request.dto';

describe('TermPolicyPublicListRequestSchema', () => {
    it('parses a payload into exactly the declared fields', () => {
        const payload = {
            cursor: 'eyJpZCI6IjEifQ',
            perPage: 20,
            orderBy: 'version:desc',
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

    it('keeps the module orderBy description', () => {
        expect(
            TermPolicyPublicListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(TermPolicyDefaultAvailableOrderBy.join(', '));
    });

    it('accepts an empty orderBy so the module default order applies', () => {
        expect(
            TermPolicyPublicListRequestSchema.safeParse({ orderBy: '' }).success
        ).toBe(true);
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = TermPolicyDefaultAvailableOrderBy[0];
        const last =
            TermPolicyDefaultAvailableOrderBy[
                TermPolicyDefaultAvailableOrderBy.length - 1
            ];

        expect(
            TermPolicyPublicListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            TermPolicyPublicListRequestSchema.safeParse({
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
            TermPolicyPublicListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });
});
