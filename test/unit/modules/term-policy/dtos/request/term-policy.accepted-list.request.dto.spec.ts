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
});
