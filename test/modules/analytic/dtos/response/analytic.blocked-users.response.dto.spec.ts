import { AnalyticBlockedUsersResponseSchema } from '@modules/analytic/dtos/response/analytic.blocked-users.response.dto';

describe('AnalyticBlockedUsersResponseSchema', () => {
    const row = { trend: 3, current: 5 };

    it('parses a row into exactly the declared fields', () => {
        const result = AnalyticBlockedUsersResponseSchema.parse(row);

        expect(result).toEqual(row);
    });

    it('strips an undeclared key', () => {
        const result = AnalyticBlockedUsersResponseSchema.parse({
            ...row,
            emails: ['user@example.com'],
        });

        expect(result).toEqual(row);
    });
});
