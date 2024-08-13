import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthSignUpRequestDto } from 'src/modules/auth/dtos/request/auth.sign-up.request.dto';
jest.mock(
    'src/common/request/validations/request.is-password.validation',
    () => ({
        IsPassword: jest.fn().mockReturnValue(jest.fn()),
    })
);

describe('AuthSignUpRequestDto', () => {
    it('should be defined', () => {
        const dto = new AuthSignUpRequestDto();
        expect(dto).toBeDefined();
    });

    it('should validate example data', async () => {
        const dto = plainToInstance(AuthSignUpRequestDto, {
            password: faker.string.alphanumeric(10),
            email: faker.internet.email(),
            name: faker.person.fullName(),
            country: faker.string.uuid(),
        });
        const errors = await validate(dto);
        expect(errors.length).toBe(0);
    });
});
