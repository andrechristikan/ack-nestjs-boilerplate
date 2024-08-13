import 'reflect-metadata';
import { ApiKeyResetResponseDto } from 'src/modules/api-key/dtos/response/api-key.reset.dto';
import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';

describe('ApiKeyResetResponseDto', () => {
    it('should create a valid ApiKeyResetResponseDto object', () => {
        const mockApiKeyResetResponse: ApiKeyResetResponseDto = {
            _id: faker.string.uuid(),
            key: faker.string.alpha(15),
            secret: faker.string.alpha(20),
        };

        const dto = plainToInstance(
            ApiKeyResetResponseDto,
            mockApiKeyResetResponse
        );

        expect(dto).toBeInstanceOf(ApiKeyResetResponseDto);
    });
});
