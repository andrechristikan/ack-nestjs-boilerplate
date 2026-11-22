import { z } from 'zod';
import { RequestTrustedProxyPresets } from '@common/request/constants/request.constant';

/** @public */
export const RequestTrustedProxySchema = z
    .string()
    .refine(
        value => {
            const addressSchema = z.union([
                z.ipv4(),
                z.ipv6(),
                z.cidrv4(),
                z.cidrv6(),
            ]);

            return value.split(',').every(entry => {
                const network = entry.trim();

                return (
                    RequestTrustedProxyPresets.has(network) ||
                    addressSchema.safeParse(network).success
                );
            });
        },
        { message: 'Must be proxy-addr presets, IP addresses, or CIDRs' }
    )
    .meta({
        description:
            'Comma-separated trusted proxy networks: loopback, linklocal, uniquelocal, IP, or CIDR',
        example: 'loopback,uniquelocal',
    });
