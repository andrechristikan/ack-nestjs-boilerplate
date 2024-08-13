import { ApiKeyUpdateDateRequestDto } from 'src/modules/api-key/dtos/request/api-key.update-date.request.dto';
import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

describe('ApiKeyCreateRawRequestDto', () => {
    it('should create a valid', () => {
        const startDate = faker.date.recent();
        const endDate = new Date(startDate.getTime() + 1000 * 60 * 60 * 24);

        const mockApiKeyUpdateDateRequest: Record<string, any> = {
            startDate,
            endDate,
        };

        const dto = plainToInstance(
            ApiKeyUpdateDateRequestDto,
            mockApiKeyUpdateDateRequest
        );

        expect(dto).toBeInstanceOf(ApiKeyUpdateDateRequestDto);
    });

    it('should return errors instance', async () => {
        const startDate = faker.date.recent();

        const mockApiKeyUpdateDateRequest: Record<string, any> = {
            startDate,
            endDate: 1234,
        };

        const dto = plainToInstance(
            ApiKeyUpdateDateRequestDto,
            mockApiKeyUpdateDateRequest
        );

        const errors: ValidationError[] = await validate(dto);

        expect(dto).toBeInstanceOf(ApiKeyUpdateDateRequestDto);
        expect(Array.isArray(errors)).toEqual(true);
        expect(errors.length).toEqual(2);
        expect(errors.every(e => e instanceof ValidationError)).toEqual(true);
    });
});
