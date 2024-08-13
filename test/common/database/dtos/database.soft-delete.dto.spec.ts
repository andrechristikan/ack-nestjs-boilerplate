import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { DatabaseSoftDeleteDto } from 'src/common/database/dtos/database.soft-delete.dto';

describe('DatabaseSoftDeleteDto', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should be successful calls', () => {
        const response: DatabaseSoftDeleteDto = {
            deletedBy: faker.string.uuid(),
        };

        const dto = plainToInstance(DatabaseSoftDeleteDto, response);

        expect(dto).toBeInstanceOf(DatabaseSoftDeleteDto);
        expect(dto.deletedBy).toBeDefined();
    });
});
