import 'reflect-metadata';
import { ApiKeyGetResponseDto } from 'src/modules/api-key/dtos/response/api-key.get.response.dto';
import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';

describe('ApiKeyGetResponseDto', () => {
    it('should create a valid ApiKeyGetResponseDto object', () => {
        const mockApiKeyGetResponse: ApiKeyGetResponseDto = {
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
            ApiKeyGetResponseDto,
            mockApiKeyGetResponse
        );

        expect(dto).toBeInstanceOf(ApiKeyGetResponseDto);
    });
});
