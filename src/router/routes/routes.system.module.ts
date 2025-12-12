import { HealthSystemController } from '@modules/health/controllers/health.system.controller';
import { HealthModule } from '@modules/health/health.module';
import { UserSystemController } from '@modules/user/controllers/user.system.controller';
import { UserModule } from '@modules/user/user.module';
import { Module } from '@nestjs/common';

/**
 * System routes module that provides system-level endpoints.
 * Contains controllers for user system operations and health checks for monitoring application status.
 */
@Module({
    controllers: [UserSystemController, HealthSystemController],
    providers: [],
    exports: [],
    imports: [UserModule, HealthModule],
})
export class RoutesSystemModule {}
