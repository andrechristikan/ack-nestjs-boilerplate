import * as dotenv from 'dotenv';
import * as dotConfigs from 'config/config';

export class ConfigService {
    private readonly env: Record<string, any>;
    private readonly configs: Record<string, any> | string | string[];

    constructor() {
        dotenv.config();
        this.env = process.env as Record<string, any>;
        this.configs = dotConfigs as
            | Record<string, unknown>
            | string
            | Array<string>;
    }

    getEnv(key: string): string {
        return this.env[key];
    }

    getConfig(key: string): Record<string, any> | string | string[] | number {
        const index: string[] = key.split('.');
        let config: Record<string, any> | string | string[] | number;

        for (let i = 0; i < index.length; i += 1) {
            config = this.configs[index[i]];
        }

        return config;
    }

    isEnv(env: string): boolean {
        return this.env.APP_ENV === env;
    }
}
