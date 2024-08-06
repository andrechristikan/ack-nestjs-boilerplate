import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { AuthLoginResponseDto } from 'src/modules/auth/dtos/response/auth.login.response.dto';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';

describe('AuthLoginResponseDto', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should be successful calls', () => {
        const data = {
            tokenType: 'Bearer',
            roleType: ENUM_POLICY_ROLE_TYPE.USER,
            expiresIn: 1000,
            accessToken: faker.string.alphanumeric(),
            refreshToken: faker.string.alphanumeric(),
        };

        const dto = plainToInstance(AuthLoginResponseDto, data);

        expect(dto).toBeInstanceOf(AuthLoginResponseDto);
    });

    it('Should be successful calls with image', () => {
        const data = {
            tokenType: 'Bearer',
            roleType: ENUM_POLICY_ROLE_TYPE.USER,
            expiresIn: 1000,
            accessToken: faker.string.alphanumeric(),
            refreshToken: faker.string.alphanumeric(),
        };

        const dto = plainToInstance(AuthLoginResponseDto, data);

        expect(dto instanceof AuthLoginResponseDto).toBe(true);
    });
});
