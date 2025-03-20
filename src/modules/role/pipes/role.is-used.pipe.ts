import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/enums/role.status-code.enum';
import { RoleDoc } from 'src/modules/role/repository/entities/role.entity';
import { UserService } from 'src/modules/user/services/user.service';

@Injectable()
export class RoleIsUsedPipe implements PipeTransform {
    constructor(private readonly userService: UserService) {}

    async transform(value: RoleDoc): Promise<RoleDoc> {
        const exist = await this.userService.existByRole(value._id);
        if (exist) {
            throw new BadRequestException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.USED,
                message: 'role.error.used',
            });
        }

        return value;
    }
}
