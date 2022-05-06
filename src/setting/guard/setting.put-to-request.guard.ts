import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { SettingDocument } from '../schema/setting.schema';
import { SettingService } from '../service/setting.service';

@Injectable()
export class SettingPutToRequestGuard implements CanActivate {
    constructor(private readonly settingService: SettingService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const { params } = request;
        const { setting } = params;

        const check: SettingDocument = await this.settingService.findOneById(
            setting
        );
        request.__setting = check;

        return true;
    }
}
