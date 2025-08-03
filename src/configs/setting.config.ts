import { registerAs } from '@nestjs/config';

export interface IConfigSetting {
    keyPrefix: string;
}

export default registerAs(
    'setting',
    (): IConfigSetting => ({
        keyPrefix: 'Setting',
    })
);
