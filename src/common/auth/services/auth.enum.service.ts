import { Injectable } from '@nestjs/common';
import { ENUM_AUTH_ACCESS_FOR } from '../constants/auth.enum.constant';

@Injectable()
export class AuthEnumService {
    async getAccessFor(): Promise<string[]> {
        return Object.values(ENUM_AUTH_ACCESS_FOR);
    }
}
