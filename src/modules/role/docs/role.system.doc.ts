// TODO: RESOLVE THIS
// import { applyDecorators } from '@nestjs/common';
// import {
//     Doc,
//     DocAuth,
//     DocRequest,
//     DocResponsePaging,
// } from '@common/doc/decorators/doc.decorator';
// import { RoleDocQueryType } from '@modules/role/constants/role.doc.constant';
// import { RoleShortResponseDto } from '@modules/role/dtos/response/role.short.response.dto';

// export function RoleSystemListDoc(): MethodDecorator {
//     return applyDecorators(
//         Doc({
//             summary: 'get all of roles',
//         }),
//         DocRequest({
//             queries: RoleDocQueryType,
//         }),
//         DocAuth({
//             xApiKey: true,
//         }),
//         DocResponsePaging<RoleShortResponseDto>('role.list', {
//             dto: RoleShortResponseDto,
//         })
//     );
// }
