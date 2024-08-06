import 'reflect-metadata';
import { faker } from '@faker-js/faker';
import { ApiKeyPayloadDto } from 'src/modules/api-key/dtos/api-key.payload.dto';
import { plainToInstance } from 'class-transformer';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';

describe('ApiKeyPayloadDto', () => {
    it('should create a valid ApiKeyPayloadDto object', () => {
        const mockApiKeyPayload: ApiKeyPayloadDto = {
            _id: faker.string.uuid(),
            name: faker.person.jobTitle(),
            type: ENUM_API_KEY_TYPE.DEFAULT,
            key: faker.string.alpha(15),
        };

        const dto = plainToInstance(ApiKeyPayloadDto, mockApiKeyPayload);

        expect(dto).toBeInstanceOf(ApiKeyPayloadDto);
    });
});
