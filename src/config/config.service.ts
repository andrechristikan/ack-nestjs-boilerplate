import { Injectable, Scope } from '@nestjs/common';
import * as dotenv from 'dotenv';

@Injectable()
export class ConfigService {
    private readonly env: Record<string, any>;

    constructor() {
        dotenv.config();
        this.env = process.env as Record<string, any>;
    }

    getEnv(key: string): string {
        return this.env[key];
    }

    isEnv(env: string): boolean {
        return this.env.APP_ENV === env;
    }
}
