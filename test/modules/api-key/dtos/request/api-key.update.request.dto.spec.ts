import { ApiKeyUpdateRequestDto } from 'src/modules/api-key/dtos/request/api-key.update.request.dto';
import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

describe('ApiKeyUpdateRequestDto', () => {
    it('should create a valid', () => {
        const mockApiKeyUpdateRequest: Record<string, any> = {
            name: faker.company.name(),
        };

        const dto = plainToInstance(
            ApiKeyUpdateRequestDto,
            mockApiKeyUpdateRequest
        );

        expect(dto).toBeInstanceOf(ApiKeyUpdateRequestDto);
    });

    it('should return errors instance', async () => {
        const mockApiKeyUpdateRequest: Record<string, any> = {
            name: 123,
        };

        const dto = plainToInstance(
            ApiKeyUpdateRequestDto,
            mockApiKeyUpdateRequest
        );

        const errors: ValidationError[] = await validate(dto);

        expect(dto).toBeInstanceOf(ApiKeyUpdateRequestDto);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors.length).toEqual(1);
        expect(errors.every(e => e instanceof ValidationError)).toEqual(true);
    });
});
