import {
    Injectable,
    CanActivate,
    ExecutionContext,
    NotFoundException,
} from '@nestjs/common';
import { ENUM_SETTING_STATUS_CODE_ERROR } from '../constants/setting.status-error.constant';

@Injectable()
export class SettingNotFoundGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { __setting } = context.switchToHttp().getRequest();

        if (!__setting) {
            throw new NotFoundException({
                statusCode:
                    ENUM_SETTING_STATUS_CODE_ERROR.SETTING_NOT_FOUND_ERROR,
                message: 'setting.error.notFound',
            });
        }

        return true;
    }
}
