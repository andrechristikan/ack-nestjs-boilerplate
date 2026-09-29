import { faker } from '@faker-js/faker';
import { CountryResponseSchema } from '@modules/country/dtos/response/country.response.dto';

describe('CountryResponseSchema', () => {
    const row = {
        id: faker.database.mongodbObjectId(),
        createdAt: new Date(),
        createdBy: null,
        updatedAt: new Date(),
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
});
