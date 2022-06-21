import {
    Injectable,
    CanActivate,
    ExecutionContext,
    NotFoundException,
} from '@nestjs/common';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { ENUM_SETTING_STATUS_CODE_ERROR } from '../setting.constant';

@Injectable()
export class SettingNotFoundGuard implements CanActivate {
    constructor(private readonly debuggerService: DebuggerService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const { __setting, id } = context.switchToHttp().getRequest();

        if (!__setting) {
            this.debuggerService.error(id, {
                description: 'Setting not found',
                class: 'SettingNotFoundGuard',
                function: 'canActivate',
            });

            throw new NotFoundException({
                statusCode:
                    ENUM_SETTING_STATUS_CODE_ERROR.SETTING_NOT_FOUND_ERROR,
                message: 'setting.error.notFound',
            });
        }

        return true;
    }
}
