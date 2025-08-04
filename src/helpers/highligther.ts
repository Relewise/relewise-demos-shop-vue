export function highlightWithOffsets(text: string, offsets: { lowerBoundInclusive: number, upperBoundInclusive: number }[] | undefined) {
    if (!text || !offsets || offsets.length === 0) return text;
    let result = '';
    let currentIndex = 0;
    for (const offset of offsets) {
        if (!offset) continue;
        result += text.slice(currentIndex, offset.lowerBoundInclusive);
        result += `<mark>${text.slice(offset.lowerBoundInclusive, offset.upperBoundInclusive)}</mark>`;
        currentIndex = offset.upperBoundInclusive;
    }
    result += text.slice(currentIndex);
    return result;
}