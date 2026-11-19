import { TermPolicyAcceptedListRequestSchema } from '@modules/term-policy/dtos/request/term-policy.accepted-list.request.dto';
import { EnumTermPolicyAcceptanceOrderBy } from '@modules/term-policy/enums/term-policy.enum';

describe('TermPolicyAcceptedListRequestSchema', () => {
    it('parses a payload into exactly the declared fields', () => {
        const payload = {
            cursor: 'eyJpZCI6IjEifQ',
            perPage: 20,
            orderBy: 'latest',
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

    it('rejects an undeclared key', () => {
        expect(() =>
            TermPolicyAcceptedListRequestSchema.parse({ search: 'x' })
        ).toThrow();
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            TermPolicyAcceptedListRequestSchema.shape.orderBy.meta()
                ?.description
        ).toContain(Object.values(EnumTermPolicyAcceptanceOrderBy).join(', '));
    });

    it.each(Object.values(EnumTermPolicyAcceptanceOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                TermPolicyAcceptedListRequestSchema.safeParse({ orderBy })
                    .success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            TermPolicyAcceptedListRequestSchema.safeParse({ orderBy: '' })
                .success
        ).toBe(true);
    });

    it.each([
        'unknownPreset',
        'createdAt:desc',
        'latest:asc',
        'default',
        'createdAt',
    ])('rejects the orderBy %s', orderBy => {
        expect(
            TermPolicyAcceptedListRequestSchema.safeParse({ orderBy }).success
        ).toBe(false);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            TermPolicyAcceptedListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).success
        ).toBe(false);
    });
});
