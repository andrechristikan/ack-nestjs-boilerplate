import 'reflect-metadata';
import { ApiKeyListResponseDto } from 'src/modules/api-key/dtos/response/api-key.list.response.dto';
import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';

describe('ApiKeyListResponseDto', () => {
    it('should create a valid ApiKeyListResponseDto object', () => {
        const mockApiKeyListResponse: ApiKeyListResponseDto = {
            _id: faker.string.uuid(),
            name: faker.person.jobTitle(),
            type: ENUM_API_KEY_TYPE.DEFAULT,
            key: faker.string.alpha(15),
            hash: faker.string.alpha(20),
            isActive: true,
            startDate: faker.date.past(),
            endDate: faker.date.future(),
            createdAt: faker.date.recent(),
            updatedAt: faker.date.recent(),
            deletedAt: faker.date.recent(),
            deleted: false,
        };

        const dto = plainToInstance(
            ApiKeyListResponseDto,
            mockApiKeyListResponse
        );

        expect(dto).toBeInstanceOf(ApiKeyListResponseDto);
    });
});
