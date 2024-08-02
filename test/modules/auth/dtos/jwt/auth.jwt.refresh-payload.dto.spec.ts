import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthJwtRefreshPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.refresh-payload.dto';

describe('AuthJwtRefreshPayloadDto', () => {
    it('should be defined', () => {
        const dto = new AuthJwtRefreshPayloadDto();
        expect(dto).toBeDefined();
    });

    it('should validate _id, loginDate, and loginFrom properties', async () => {
        const dto = plainToInstance(AuthJwtRefreshPayloadDto, {
            _id: '12345',
            loginDate: new Date(),
            loginFrom: 'web',
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });
});
