import { EnumRoleType } from '@generated/prisma-client/client';
import { AuthTokenResponseSchema } from '@modules/auth/dtos/response/auth.token.response.dto';

describe('AuthTokenResponseSchema', () => {
    const token = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token-value',
        refreshToken: 'refresh-token-value',
    };

    it('parses a token pair into exactly the declared fields', () => {
        const result = AuthTokenResponseSchema.parse(token);

        expect(result).toEqual(token);
    });

    it('strips an undeclared key', () => {
        const result = AuthTokenResponseSchema.parse({
            ...token,
            jti: 'jti-value',
        });

        expect(result).toEqual(token);
    });
});
