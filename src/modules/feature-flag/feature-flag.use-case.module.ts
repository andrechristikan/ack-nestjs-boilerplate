import { FeatureFlagGetListByAdminUseCase } from '@modules/feature-flag/use-cases/feature-flag.get-list-by-admin.use-case';
import { FeatureFlagGetListCursorUseCase } from '@modules/feature-flag/use-cases/feature-flag.get-list-cursor.use-case';
import { FeatureFlagUpdateStatusByAdminUseCase } from '@modules/feature-flag/use-cases/feature-flag.update-status-by-admin.use-case';
import { FeatureFlagUpdateMetadataByAdminUseCase } from '@modules/feature-flag/use-cases/feature-flag.update-metadata-by-admin.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        FeatureFlagGetListByAdminUseCase,
        FeatureFlagGetListCursorUseCase,
        FeatureFlagUpdateStatusByAdminUseCase,
        FeatureFlagUpdateMetadataByAdminUseCase,
    ],
    exports: [
        FeatureFlagGetListByAdminUseCase,
        FeatureFlagGetListCursorUseCase,
        FeatureFlagUpdateStatusByAdminUseCase,
        FeatureFlagUpdateMetadataByAdminUseCase,
    ],
    imports: [],
})
export class FeatureFlagUseCaseModule {}
