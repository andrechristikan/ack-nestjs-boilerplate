import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthSocialGooglePayloadDto } from 'src/modules/auth/dtos/social/auth.social.google-payload.dto';

describe('AuthSocialGooglePayloadDto', () => {
    it('should be defined', () => {
        const dto = new AuthSocialGooglePayloadDto();
        expect(dto).toBeDefined();
    });

    it('should validate email property', async () => {
        const dto = plainToInstance(AuthSocialGooglePayloadDto, {
            email: 'test@example.com',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });
});
