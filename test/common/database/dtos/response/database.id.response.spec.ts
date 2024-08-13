import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';

describe('DatabaseIdResponseDto', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should be successful calls', () => {
        const response: DatabaseIdResponseDto = {
            _id: faker.string.uuid(),
        };

        const dto = plainToInstance(DatabaseIdResponseDto, response);

        expect(dto).toBeInstanceOf(DatabaseIdResponseDto);
        expect(dto._id).toBeDefined();
    });
});
