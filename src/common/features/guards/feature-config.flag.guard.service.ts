import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_CONFIG_FLAG_META_KEY } from '@common/features/constants/feature-config.flag.constant';
import { ENUM_FEATURE_FLAG_STATUS_CODE_ERROR } from '@common/features/enums/feature-config.enum.status-code';
import { FeatureConfigService } from '@common/features/services/feature-config.service';

@Injectable()
export class FeatureConfigFlagGuard implements CanActivate {
  constructor(
    private readonly featureSettings: FeatureConfigService,
    private readonly reflector: Reflector,
  ) {
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.get<string>(FEATURE_CONFIG_FLAG_META_KEY, context.getHandler());
    const isFeatureEnabled = await this.featureSettings.isEnabled(featureKey, false, true);

    if (!isFeatureEnabled) {
      throw new ForbiddenException({
        statusCode: ENUM_FEATURE_FLAG_STATUS_CODE_ERROR.INACTIVE,
        message: 'feature.error.inactive',
      });
    }

    return isFeatureEnabled;
  }
}