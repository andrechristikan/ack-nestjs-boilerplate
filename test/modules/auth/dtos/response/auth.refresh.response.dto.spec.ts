import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { AuthRefreshResponseDto } from 'src/modules/auth/dtos/response/auth.refresh.response.dto';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';

describe('AuthRefreshResponseDto', () => {
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

        const dto = plainToInstance(AuthRefreshResponseDto, data);

        expect(dto).toBeInstanceOf(AuthRefreshResponseDto);
    });

    it('Should be successful calls with image', () => {
        const data = {
            tokenType: 'Bearer',
            roleType: ENUM_POLICY_ROLE_TYPE.USER,
            expiresIn: 1000,
            accessToken: faker.string.alphanumeric(),
            refreshToken: faker.string.alphanumeric(),
        };

        const dto = plainToInstance(AuthRefreshResponseDto, data);

        expect(dto instanceof AuthRefreshResponseDto).toBe(true);
    });
});
