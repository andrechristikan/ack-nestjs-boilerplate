import { applyDecorators } from '@nestjs/common';
import { ApiConsumes, ApiHeader } from '@nestjs/swagger';

export function ApiDefaultHeader(contentType?: string) {
    return applyDecorators(
        ApiConsumes(contentType || 'application/json'),
        ApiHeader({
            name: 'x-timezone',
            description: 'Custom timezone',
            required: false,
            allowEmptyValue: true,
            schema: { default: 'Asia/Jakarta', nullable: true },
        }),
        ApiHeader({
            name: 'x-custom-lang',
            description: 'Custom language',
            required: false,
            allowEmptyValue: true,
            schema: { default: 'en', nullable: true },
        }),
        ApiHeader({
            name: 'x-timestamp',
            description: 'Current timestamp',
            required: true,
            allowEmptyValue: false,
            schema: { default: '1659465208727', nullable: false },
        }),
        ApiHeader({
            name: 'User-Agent',
            description: 'User Agent Client',
            required: true,
            allowEmptyValue: false,
            schema: {
                default:
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X x.y; rv:42.0) Gecko/20100101 Firefox/42.0',
                nullable: false,
            },
        })
    );
}

// todo response
export function ApiDefaultResponse() {
    return applyDecorators();
}

// todo header responde

// headers: {
//     'x-timestamp': {
//         description: 'Current timestamp',
//         required: true,
//         allowEmptyValue: false,
//         schema: {
//             example: '1659465208727',
//         },
//     },
// },

// responseExpress.setHeader(
//     'x-custom-lang',
//     headers['x-custom-lang']
// );
// responseExpress.setHeader(
//     'x-timestamp',
//     headers['x-timestamp']
// );
// responseExpress.setHeader(
//     'x-timezone',
//     headers['x-timezone']
// );
// responseExpress.setHeader(
//     'x-request-id',
//     headers['x-request-id']
// );
// responseExpress.setHeader(
//     'x-api-version',
//     headers['x-api-version']
// );

// todo
// description?: string;
// required?: boolean;
// deprecated?: boolean;
// allowEmptyValue?: boolean;
// style?: ParameterStyle;
// explode?: boolean;
// allowReserved?: boolean;
// schema?: SchemaObject | ReferenceObject;
// examples?: Record<string, ExampleObject | ReferenceObject>;
// example?: any;
// content?: ContentObject;
