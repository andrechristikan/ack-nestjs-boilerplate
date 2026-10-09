import { TermPolicyAcceptanceDefaultAvailableOrderBy } from '@modules/term-policy/constants/term-policy.list.constant';
import { TermPolicyAcceptedListRequestSchema } from '@modules/term-policy/dtos/request/term-policy.accepted-list.request.dto';

describe('TermPolicyAcceptedListRequestSchema', () => {
    it('parses a payload into exactly the declared fields', () => {
        const payload = {
            cursor: 'eyJpZCI6IjEifQ',
            perPage: 20,
            orderBy: 'createdAt:desc',
        };

        const result = TermPolicyAcceptedListRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty payload with every field optional', () => {
        const result = TermPolicyAcceptedListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces perPage to a number', () => {
        const result = TermPolicyAcceptedListRequestSchema.parse({
            perPage: '10',
        });

        expect(result).toEqual({ perPage: 10 });
    });

    it('accepts a repeated orderBy as an array', () => {
        const result = TermPolicyAcceptedListRequestSchema.parse({
            orderBy: ['createdAt:asc', 'createdAt:desc'],
        });

        expect(result).toEqual({
            orderBy: ['createdAt:asc', 'createdAt:desc'],
        });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            TermPolicyAcceptedListRequestSchema.parse({ search: 'x' })
        ).toThrow();
    });

    it('keeps the module orderBy description', () => {
        expect(
            TermPolicyAcceptedListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(TermPolicyAcceptanceDefaultAvailableOrderBy.join(', '));
    });

    it('accepts a single and a repeated orderBy built from the allow-list', () => {
        const first = TermPolicyAcceptanceDefaultAvailableOrderBy[0];
        const last =
            TermPolicyAcceptanceDefaultAvailableOrderBy[
                TermPolicyAcceptanceDefaultAvailableOrderBy.length - 1
            ];

        expect(
            TermPolicyAcceptedListRequestSchema.safeParse({
                orderBy: `${first}:asc`,
            }).success
        ).toBe(true);
        expect(
            TermPolicyAcceptedListRequestSchema.safeParse({
                orderBy: [`${first}:asc`, `${last}:desc`],
            }).success
        ).toBe(true);
    });

    it.each([
        'unknownField:asc',
        `${TermPolicyAcceptanceDefaultAvailableOrderBy[0]}:`,
        `${TermPolicyAcceptanceDefaultAvailableOrderBy[0]}:DESC`,
        `${TermPolicyAcceptanceDefaultAvailableOrderBy[0]}:up`,
    ])('rejects the orderBy %s', orderBy => {
        expect(
            TermPolicyAcceptedListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });
});
