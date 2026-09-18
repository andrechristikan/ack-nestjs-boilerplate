import { faker } from '@faker-js/faker';
import { z } from 'zod';

export const RequestUuidSchema = z.uuid().meta({
    description: 'UUID',
    example: faker.string.uuid(),
});
