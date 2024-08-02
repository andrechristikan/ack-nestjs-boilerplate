import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthChangePasswordRequestDto } from 'src/modules/auth/dtos/request/auth.change-password.request.dto';

jest.mock(
    'src/common/request/validations/request.is-password.validation',
    () => ({
        IsPassword: jest.fn().mockReturnValue(jest.fn()),
    })
);

describe('AuthChangePasswordRequestDto', () => {
    it('should be defined', () => {
        const dto = new AuthChangePasswordRequestDto();
        expect(dto).toBeDefined();
    });

    it('should validate example data', async () => {
        const dto = plainToInstance(AuthChangePasswordRequestDto, {
            newPassword: faker.string.alphanumeric(10),
            oldPassword: faker.string.alphanumeric(10),
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });
});
