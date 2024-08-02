import 'reflect-metadata';
import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { ApiKeyCreateResponseDto } from 'src/modules/api-key/dtos/response/api-key.create.dto';

describe('ApiKeyCreateResponseDto', () => {
    it('should create a valid ApiKeyCreateResponseDto object', () => {
        const mockApiKeyCreateResponse: ApiKeyCreateResponseDto = {
            _id: faker.string.uuid(),
            key: faker.string.alpha(15),
            secret: faker.string.alpha(20),
        };

        const dto = plainToInstance(
            ApiKeyCreateResponseDto,
            mockApiKeyCreateResponse
        );

        expect(dto).toBeInstanceOf(ApiKeyCreateResponseDto);
    });
});
