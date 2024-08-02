import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthSocialApplePayloadDto } from 'src/modules/auth/dtos/social/auth.social.apple-payload.dto';

describe('AuthSocialApplePayloadDto', () => {
    it('should be defined', () => {
        const dto = new AuthSocialApplePayloadDto();
        expect(dto).toBeDefined();
    });

    it('should validate email property', async () => {
        const dto = plainToInstance(AuthSocialApplePayloadDto, {
            email: 'test@example.com',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });
});
