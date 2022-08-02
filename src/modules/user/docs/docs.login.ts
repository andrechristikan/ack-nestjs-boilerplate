import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
    ApiDefaultHeader,
    ApiDefaultResponse,
} from 'src/common/swagger/swagger.decorator';
import { UserLoginDto } from '../dtos/user.login.dto';
import { UserLoginSerialization } from '../serializations/user.login.serialization';

// Login
export function UserLoginDoc(): any {
    return applyDecorators(
        ApiTags('user'),
        ApiDefaultHeader(),
        ApiDefaultResponse(),
        ApiBody({
            type: UserLoginDto,
            examples: {
                superadmin: {
                    summary: 'superadmin',
                    description: 'login with user superadmin',
                    value: {
                        email: 'superadmin@mail.com',
                        password: 'aaAA@@123444',
                        rememberMe: false,
                    },
                },
                admin: {
                    summary: 'admin',
                    description: 'login with user admin',
                    value: {
                        email: 'admin@mail.com',
                        password: 'aaAA@@123444',
                        rememberMe: false,
                    },
                },
                user: {
                    summary: 'user',
                    description: 'login with user',
                    value: {
                        email: 'user@mail.com',
                        password: 'aaAA@@123444',
                        rememberMe: false,
                    },
                },
            },
        }),
        ApiOkResponse({
            description: 'Login succeed',
            type: UserLoginSerialization,
            headers: {
                'x-timestamp': {
                    description: 'Current timestamp',
                    required: true,
                    allowEmptyValue: false,
                    schema: {
                        example: '1659465208727',
                    },
                },
            },
        })
    );
}
