import { UserMobileNumberResponseSchema } from '@modules/user/dtos/response/user.mobile-number.response.dto';

describe('UserMobileNumberResponseSchema', () => {
    const country = {
        id: 'country-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
        name: 'Indonesia',
        alpha2Code: 'ID',
        alpha3Code: 'IDN',
        phoneCode: ['62'],
        continent: 'Asia',
        timezone: 'Asia/Jakarta',
    };

    const row = {
        id: 'mobile-number-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-1',
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: 'user-1',
        number: '81234567890',
        phoneCode: '62',
        country,
    };

    it('parses a row into exactly the declared fields', () => {
        const result = UserMobileNumberResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips deletedAt and deletedBy inherited from DatabaseResponseSchema', () => {
        const result = UserMobileNumberResponseSchema.parse({
            ...row,
            deletedAt: null,
            deletedBy: null,
        });

        expect(result).toEqual(row);
    });
});
