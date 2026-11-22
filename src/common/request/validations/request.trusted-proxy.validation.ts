import { z } from 'zod';

const RequestTrustedProxyPresets: ReadonlyArray<string> = [
    'loopback',
    'linklocal',
    'uniquelocal',
];

const RequestTrustedProxyAddressSchemas = [
    z.ipv4(),
    z.ipv6(),
    z.cidrv4(),
    z.cidrv6(),
];

/** @public */
export const RequestTrustedProxySchema = z
    .string()
    .refine(
        value =>
            value.split(',').every(entry => {
                const network = entry.trim();

                return (
                    RequestTrustedProxyPresets.includes(network) ||
                    RequestTrustedProxyAddressSchemas.some(
                        schema => schema.safeParse(network).success
                    )
                );
            }),
        { message: 'Must be proxy-addr presets, IP addresses, or CIDRs' }
    )
    .meta({
        description:
            'Comma-separated trusted proxy networks: loopback, linklocal, uniquelocal, IP, or CIDR',
        example: 'loopback,uniquelocal',
    });
