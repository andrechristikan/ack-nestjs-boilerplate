import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { DatabaseDto } from 'src/common/database/dtos/database.dto';

describe('DatabaseDto', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should be successful calls', () => {
        const response: DatabaseDto = {
            _id: faker.string.uuid(),
            createdAt: faker.date.recent(),
            updatedAt: faker.date.recent(),
            deletedAt: faker.date.recent(),
            deletedBy: faker.string.uuid(),
            deleted: false,
        };

        const dto = plainToInstance(DatabaseDto, response);

        expect(dto).toBeInstanceOf(DatabaseDto);
        expect(dto._id).toBeDefined();
    });
});
