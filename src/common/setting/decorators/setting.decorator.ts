import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { SettingDoc } from 'src/common/setting/repository/entities/setting.entity';

export const GetSetting = createParamDecorator(
    <T>(returnPlain: boolean, ctx: ExecutionContext): T => {
        const { __setting } = ctx
            .switchToHttp()
            .getRequest<IRequestApp & { __setting: SettingDoc }>();
        return (returnPlain ? __setting.toObject() : __setting) as T;
    }
);
