import { faker } from '@faker-js/faker';
import { ApiKeyCreateRawRequestDto } from 'src/modules/api-key/dtos/request/api-key.create.request.dto';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';

describe('ApiKeyCreateRawRequestDto', () => {
    it('should create a valid', () => {
        const mockApiKeyCreateRawRequest: Record<string, any> = {
            type: ENUM_API_KEY_TYPE.DEFAULT,
            key: faker.string.alphanumeric(10),
            secret: faker.string.alphanumeric(20),
            name: faker.company.name(),
            startDate: faker.date.past(),
            endDate: faker.date.future(),
        };

        const dto = plainToInstance(
            ApiKeyCreateRawRequestDto,
            mockApiKeyCreateRawRequest
        );

        expect(dto).toBeInstanceOf(ApiKeyCreateRawRequestDto);
    });

    it('should return errors instance', async () => {
        const mockApiKeyCreateRawRequest: Record<string, any> = {
            type: ENUM_API_KEY_TYPE.DEFAULT,
            key: faker.string.alphanumeric(10),
            secret: faker.string.alphanumeric(20),
            name: 1234,
        };

        const dto = plainToInstance(
            ApiKeyCreateRawRequestDto,
            mockApiKeyCreateRawRequest
        );

        const errors: ValidationError[] = await validate(dto);

        expect(dto).toBeInstanceOf(ApiKeyCreateRawRequestDto);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors.length).toEqual(1);
        expect(errors.every(e => e instanceof ValidationError)).toEqual(true);
    });
});
