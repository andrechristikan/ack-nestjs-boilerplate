import { CountryListRequestSchema } from '@modules/country/dtos/request/country.list.request.dto';
import { CountryDefaultAvailableSearch } from '@modules/country/constants/country.list.constant';
import { EnumCountryOrderBy } from '@modules/country/enums/country.enum';

describe('CountryListRequestSchema', () => {
    const payload = {
        cursor: 'eyJpZCI6IjE2In0',
        perPage: 20,
        search: 'Indonesia',
        orderBy: 'latest',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = CountryListRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty object when every field is omitted', () => {
        const result = CountryListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('coerces a numeric string perPage into an integer', () => {
        const result = CountryListRequestSchema.parse({
            ...payload,
            perPage: '20',
        });

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        const result = CountryListRequestSchema.safeParse({
            ...payload,
            page: 1,
        });

        expect(result.error?.issues).toEqual([
            expect.objectContaining({ path: [], code: 'unrecognized_keys' }),
        ]);
    });

    it('keeps the module search description', () => {
        expect(
            CountryListRequestSchema.shape.search.meta()?.description
        ).toContain(CountryDefaultAvailableSearch.join(', '));
    });

    it('keeps the preset names in the orderBy description', () => {
        expect(
            CountryListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(Object.values(EnumCountryOrderBy).join(', '));
    });

    it.each(Object.values(EnumCountryOrderBy))(
        'accepts the preset %s',
        orderBy => {
            expect(
                CountryListRequestSchema.safeParse({ orderBy }).success
            ).toBe(true);
        }
    );

    it('accepts an empty orderBy so the default preset applies', () => {
        expect(
            CountryListRequestSchema.safeParse({ orderBy: '' }).success
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
            CountryListRequestSchema.safeParse({ orderBy }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });

    it('rejects a repeated orderBy', () => {
        expect(
            CountryListRequestSchema.safeParse({
                orderBy: ['latest', 'latest'],
            }).error?.issues
        ).toEqual([
            expect.objectContaining({
                path: ['orderBy'],
                code: 'invalid_union',
            }),
        ]);
    });
});
