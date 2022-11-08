import { Injectable } from '@nestjs/common';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { IRoleEnumService } from 'src/modules/role/interfaces/role.enum-service.interface';

@Injectable()
export class RoleEnumService implements IRoleEnumService {
    async getAccessFor(): Promise<string[]> {
        return Object.values(ENUM_AUTH_ACCESS_FOR);
    }
}
