import { faker } from '@faker-js/faker';
import { z } from 'zod';

/**
 * PostgreSQL UUID string parameter schema.
 * @public
 */
export const RequestUuidSchema = z.string().uuid().meta({
    description: 'PostgreSQL UUID',
    example: faker.string.uuid(),
});
