import type { INestApplication } from '@nestjs/common';
import { DatabaseClientToken } from '@common/database/constants/database.constant';
import type { IDatabaseClient } from '@common/database/interfaces/database.client.interface';

/**
 * Resolves the real Prisma client wired into the booted application, so a spec can assert
 * persisted state (or seed a fixture row) through the same client the app itself uses.
 */
export function getPrismaClient(app: INestApplication): IDatabaseClient {
    return app.get<IDatabaseClient>(DatabaseClientToken);
}
