import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { RoleDoc } from 'src/modules/role/repository/entities/role.entity';

@Injectable()
export class RoleActivePipe implements PipeTransform {
    async transform(value: RoleDoc): Promise<RoleDoc> {
        if (!value.isActive) {
            throw new BadRequestException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.IS_ACTIVE_ERROR,
                message: 'role.error.isActiveInvalid',
            });
        }

        return value;
    }
}

@Injectable()
export class RoleInactivePipe implements PipeTransform {
    async transform(value: RoleDoc): Promise<RoleDoc> {
        if (value.isActive) {
            throw new BadRequestException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.IS_ACTIVE_ERROR,
                message: 'role.error.isActiveInvalid',
            });
        }

        return value;
    }
}
