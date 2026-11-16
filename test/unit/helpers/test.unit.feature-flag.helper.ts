export function buildMetadataWithKeyCount(
    count: number
): Record<string, boolean> {
    const metadata: Record<string, boolean> = {};
    for (let index = 0; index < count; index++) {
        metadata[`key${'a'.repeat(index)}`] = true;
    }

    return metadata;
}
