export async function* iterateBatches(
    batches: string[][]
): AsyncGenerator<string[]> {
    for (const batch of batches) {
        yield batch;
    }
}
