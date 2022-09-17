import { Injectable } from '@nestjs/common';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { IAuthEnumService } from 'src/common/auth/interfaces/auth.enum-service.interface';

@Injectable()
export class AuthEnumService implements IAuthEnumService {
    async getAccessFor(): Promise<string[]> {
        return Object.values(ENUM_AUTH_ACCESS_FOR);
    }
}
