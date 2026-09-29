import { CountryRequestSchema } from '@modules/country/dtos/request/country.request.dto';

describe('CountryRequestSchema', () => {
    const payload = {
        name: 'Indonesia',
        continent: 'Asia',
        timezone: 'Asia/Jakarta',
        alpha2Code: 'id',
        alpha3Code: 'idn',
        phoneCode: ['62'],
    };

    it('parses a payload and upper-cases the ISO codes', () => {
        const result = CountryRequestSchema.parse(payload);

        expect(result).toEqual({
            ...payload,
            alpha2Code: 'ID',
            alpha3Code: 'IDN',
        });
    });

    it('rejects an undeclared key', () => {
        expect(() =>
            CountryRequestSchema.parse({ ...payload, extra: 'unexpected' })
        ).toThrow();
    });

    it('rejects an alpha2Code that is not exactly two characters', () => {
        expect(() =>
            CountryRequestSchema.parse({ ...payload, alpha2Code: 'idn' })
        ).toThrow();
    });

    it('rejects an alpha3Code that is not exactly three characters', () => {
        expect(() =>
            CountryRequestSchema.parse({ ...payload, alpha3Code: 'id' })
        ).toThrow();
    });

    it('rejects an empty phoneCode list', () => {
        expect(() =>
            CountryRequestSchema.parse({ ...payload, phoneCode: [] })
        ).toThrow();
    });

    it('rejects a missing required field', () => {
        const { name: _name, ...withoutName } = payload;

        expect(() => CountryRequestSchema.parse(withoutName)).toThrow();
    });
});
