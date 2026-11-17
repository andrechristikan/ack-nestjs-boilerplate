import { CountryResponseSchema } from '@modules/country/dtos/response/country.response.dto';

describe('CountryResponseSchema', () => {
    const row = {
        id: '507f1f77bcf86cd799439011',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        name: 'Indonesia',
        alpha2Code: 'ID',
        alpha3Code: 'IDN',
        phoneCode: ['62'],
        continent: 'Asia',
        timezone: 'Asia/Jakarta',
    };

    it('parses a row into exactly the declared fields', () => {
        const result = CountryResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = CountryResponseSchema.parse({
            ...row,
            extra: 'unexpected',
        });

        expect(result).toEqual(row);
    });

    it('rejects a missing required field', () => {
        const { name: _name, ...withoutName } = row;

        expect(() => CountryResponseSchema.parse(withoutName)).toThrow();
    });

    it('rejects an alpha2Code that is not exactly two characters', () => {
        expect(() =>
            CountryResponseSchema.parse({ ...row, alpha2Code: 'IDN' })
        ).toThrow();
    });

    it('declares a continent name as the continent example', () => {
        const { example } = CountryResponseSchema.shape.continent.meta() ?? {};

        expect([
            'Africa',
            'Antarctica',
            'Asia',
            'Europe',
            'North America',
            'Oceania',
            'South America',
        ]).toContain(example);
    });
});
