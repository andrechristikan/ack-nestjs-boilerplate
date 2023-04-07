import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import {
    SettingDoc,
    SettingEntity,
} from 'src/common/setting/repository/entities/setting.entity';

export const GetSetting = createParamDecorator(
    (
        returnPlain: boolean,
        ctx: ExecutionContext
    ): SettingDoc | SettingEntity => {
        const { __setting } = ctx
            .switchToHttp()
            .getRequest<IRequestApp & { __setting: SettingDoc }>();
        return returnPlain ? __setting.toObject() : __setting;
    }
);
