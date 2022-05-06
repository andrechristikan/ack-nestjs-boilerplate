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
        const { __setting } = context.switchToHttp().getRequest();

        if (!__setting) {
            this.debuggerService.error(
                'Setting not found',
                'SettingNotFoundGuard',
                'canActivate'
            );

            throw new NotFoundException({
                statusCode:
                    ENUM_SETTING_STATUS_CODE_ERROR.SETTING_NOT_FOUND_ERROR,
                message: 'setting.error.notFound',
            });
        }

        return true;
    }
}
