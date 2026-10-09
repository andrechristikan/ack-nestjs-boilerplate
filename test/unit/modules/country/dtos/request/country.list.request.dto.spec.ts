import { CountryListRequestSchema } from '@modules/country/dtos/request/country.list.request.dto';
import {
    CountryDefaultAvailableSearch,
    CountryDefaultAvailableOrderBy,
} from '@modules/country/constants/country.list.constant';

describe('CountryListRequestSchema', () => {
    const payload = {
        cursor: 'eyJpZCI6IjE2In0',
        perPage: 20,
        search: 'Indonesia',
        orderBy: 'name:desc',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = CountryListRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('parses an empty object when every field is omitted', () => {
        const result = CountryListRequestSchema.parse({});

        expect(result).toEqual({});
    });

    it('parses orderBy as a list of fields', () => {
        const result = CountryListRequestSchema.parse({
            ...payload,
            orderBy: ['name:desc', 'alpha2Code:asc'],
        });

        expect(result.orderBy).toEqual(['name:desc', 'alpha2Code:asc']);
    });

    it('coerces a numeric string perPage into an integer', () => {
        const result = CountryListRequestSchema.parse({
            ...payload,
            perPage: '20',
        });

        expect(result).toEqual(payload);
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            CountryListRequestSchema.parse({ ...payload, page: 1 })
        ).toThrow();
    });

    it('keeps the module search and orderBy descriptions', () => {
        expect(
            CountryListRequestSchema.shape.search.meta()?.description
        ).toContain(CountryDefaultAvailableSearch.join(', '));
        expect(
            CountryListRequestSchema.shape.orderBy.meta()?.description
        ).toContain(CountryDefaultAvailableOrderBy.join(', '));
    });
});
