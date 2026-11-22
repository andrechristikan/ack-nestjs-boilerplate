import { RequestGeoLocationResponseSchema } from '@common/request/dtos/response/request.geo-location.response.dto';

describe('RequestGeoLocationResponseSchema', () => {
    const payload = {
        latitude: -6.2,
        longitude: 106.816666,
        country: 'Indonesia',
        region: 'Jakarta',
        city: 'Jakarta',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = RequestGeoLocationResponseSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('strips an undeclared key', () => {
        const result = RequestGeoLocationResponseSchema.parse({
            ...payload,
            extra: 'field',
        });

        expect(result).toEqual(payload);
    });

    it('rejects a missing required field', () => {
        const { latitude: _latitude, ...withoutLatitude } = payload;

        expect(() =>
            RequestGeoLocationResponseSchema.parse(withoutLatitude)
        ).toThrow();
    });
});
