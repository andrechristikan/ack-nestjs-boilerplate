import { UserAddMobileNumberRequestSchema } from '@modules/user/dtos/request/user.add-mobile-number.request.dto';

describe('UserAddMobileNumberRequestSchema', () => {
    const payload = {
        countryId: '507f1f77bcf86cd799439012',
        number: '81234567890',
        phoneCode: '+62',
    };

    it('parses a payload into exactly the declared fields', () => {
        const result = UserAddMobileNumberRequestSchema.parse(payload);

        expect(result).toEqual(payload);
    });

    it('rejects a number shorter than 8 characters', () => {
        expect(() =>
            UserAddMobileNumberRequestSchema.parse({
                ...payload,
                number: '123',
            })
        ).toThrow();
    });

    it.each(['62', '+', '+0', '+12345', '+6 2', ''])(
        'rejects phoneCode %j that is not E.164 with a leading +',
        phoneCode => {
            expect(() =>
                UserAddMobileNumberRequestSchema.parse({
                    ...payload,
                    phoneCode,
                })
            ).toThrow();
        }
    );

    it.each([
        ['812 345 678', '812345678'],
        ['812-345-678', '812345678'],
        ['(812) 345.678', '812345678'],
        [' 812345678 ', '812345678'],
    ])('strips separators from number %j into %j', (input, expected) => {
        const result = UserAddMobileNumberRequestSchema.parse({
            ...payload,
            number: input,
        });

        expect(result.number).toBe(expected);
    });

    it('measures the length after the separators are removed', () => {
        expect(() =>
            UserAddMobileNumberRequestSchema.parse({
                ...payload,
                number: '12 34 56',
            })
        ).toThrow();
    });

    it.each(['8123a4567', '+81234567', '8123/4567'])(
        'rejects number %j that still has characters other than digits',
        number => {
            expect(() =>
                UserAddMobileNumberRequestSchema.parse({
                    ...payload,
                    number,
                })
            ).toThrow();
        }
    );

    it('rejects an undeclared key', () => {
        expect(() =>
            UserAddMobileNumberRequestSchema.parse({
                ...payload,
                username: 'johnSmith123',
            })
        ).toThrow();
    });
});
