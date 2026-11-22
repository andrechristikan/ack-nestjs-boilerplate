import { FeatureFlagGetListByAdminUseCase } from '@modules/feature-flag/use-cases/feature-flag.get-list-by-admin.use-case';
import { FeatureFlagGetListCursorUseCase } from '@modules/feature-flag/use-cases/feature-flag.get-list-cursor.use-case';
import { FeatureFlagUpdateStatusByAdminUseCase } from '@modules/feature-flag/use-cases/feature-flag.update-status-by-admin.use-case';
import { FeatureFlagUpdateMetadataByAdminUseCase } from '@modules/feature-flag/use-cases/feature-flag.update-metadata-by-admin.use-case';
import { FeatureFlagAddTargetUserByAdminUseCase } from '@modules/feature-flag/use-cases/feature-flag.add-target-user-by-admin.use-case';
import { FeatureFlagRemoveTargetUserByAdminUseCase } from '@modules/feature-flag/use-cases/feature-flag.remove-target-user-by-admin.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        FeatureFlagGetListByAdminUseCase,
        FeatureFlagGetListCursorUseCase,
        FeatureFlagUpdateStatusByAdminUseCase,
        FeatureFlagUpdateMetadataByAdminUseCase,
        FeatureFlagAddTargetUserByAdminUseCase,
        FeatureFlagRemoveTargetUserByAdminUseCase,
    ],
    exports: [
        FeatureFlagGetListByAdminUseCase,
        FeatureFlagGetListCursorUseCase,
        FeatureFlagUpdateStatusByAdminUseCase,
        FeatureFlagUpdateMetadataByAdminUseCase,
        FeatureFlagAddTargetUserByAdminUseCase,
        FeatureFlagRemoveTargetUserByAdminUseCase,
    ],
    imports: [],
})
export class FeatureFlagUseCaseModule {}
