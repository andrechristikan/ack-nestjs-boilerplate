import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthLoginRequestDto } from 'src/modules/auth/dtos/request/auth.login.request.dto';

describe('AuthLoginRequestDto', () => {
    it('should be defined', () => {
        const dto = new AuthLoginRequestDto();
        expect(dto).toBeDefined();
    });

    it('should validate example data', async () => {
        const dto = plainToInstance(AuthLoginRequestDto, {
            email: faker.internet.email(),
            password: faker.string.alphanumeric(),
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });
});
