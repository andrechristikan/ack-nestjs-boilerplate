import { FeatureFlagSystemController } from '@modules/feature-flag/controllers/feature-flag.system.controller';
import { FeatureFlagUseCaseModule } from '@modules/feature-flag/feature-flag.use-case.module';
import { HealthSystemController } from '@modules/health/controllers/health.system.controller';
import { HealthUseCaseModule } from '@modules/health/health.use-case.module';
import { PolicySystemController } from '@modules/policy/controllers/policy.system.controller';
import { PolicyUseCaseModule } from '@modules/policy/policy.use-case.module';
import { RoleSystemController } from '@modules/role/controllers/role.system.controller';
import { RoleUseCaseModule } from '@modules/role/role.use-case.module';
import { UserSystemController } from '@modules/user/controllers/user.system.controller';
import { UserUseCaseModule } from '@modules/user/user.use-case.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [
        UserSystemController,
        HealthSystemController,
        FeatureFlagSystemController,
        PolicySystemController,
        RoleSystemController,
    ],
    providers: [],
    exports: [],
    imports: [
        UserUseCaseModule,
        HealthUseCaseModule,
        FeatureFlagUseCaseModule,
        PolicyUseCaseModule,
        RoleUseCaseModule,
    ],
})
export class RouterHttpSystemModule {}
