import {
    Injectable,
    CanActivate,
    ExecutionContext,
    NotFoundException,
} from '@nestjs/common';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ENUM_SETTING_STATUS_CODE_ERROR } from 'src/common/setting/constants/setting.status-code.constant';
import { SettingDoc } from 'src/common/setting/repository/entities/setting.entity';

@Injectable()
export class SettingNotFoundGuard implements CanActivate {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { __setting } = context
            .switchToHttp()
            .getRequest<IRequestApp & { __setting: SettingDoc }>();

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
