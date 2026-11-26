export type DatasetBranding = {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
};

export const defaultPrimaryColor = '#3764E4';
export const defaultSecondaryColor = '#FFC1D7';
export const defaultShopLogo = '/demoshopwise.png';

export const brandingFields = [
    { key: 'logoUrl', label: 'Logo URL' },
    { key: 'primaryColor', label: 'Primary color' },
    { key: 'secondaryColor', label: 'Secondary color' },
] as const;

export function normalizeBrandColor(value: unknown) {
    if (typeof value !== 'string') {
        return undefined;
    }

    const color = value.trim();
    return /^#[\da-f]{6}$/i.test(color) ? color.toUpperCase() : undefined;
}

export function normalizeLogoUrl(value: unknown) {
    if (typeof value !== 'string') {
        return undefined;
    }

    try {
        const url = new URL(value.trim());
        // Share only a web address, without embedded image data or credentials.
        return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined;
    }
    catch {
        return undefined;
    }
}

export function normalizeDatasetBranding(value: unknown): DatasetBranding | undefined {
    if (!value || typeof value !== 'object') {
        return undefined;
    }

    const branding = value as Record<string, unknown>;
    const logoUrl = normalizeLogoUrl(branding.logoUrl);
    const primaryColor = normalizeBrandColor(branding.primaryColor);
    const secondaryColor = normalizeBrandColor(branding.secondaryColor);

    return logoUrl || primaryColor || secondaryColor ? { logoUrl, primaryColor, secondaryColor } : undefined;
}

export function validateDatasetBranding(branding?: DatasetBranding) {
    const errors: string[] = [];

    if (branding?.logoUrl?.trim() && !normalizeLogoUrl(branding.logoUrl)) {
        errors.push('Logo URL must be an absolute HTTPS URL without credentials.');
    }
    if (branding?.primaryColor?.trim() && !normalizeBrandColor(branding.primaryColor)) {
        errors.push('Primary color must be a six-digit hex color, such as #3764E4.');
    }
    if (branding?.secondaryColor?.trim() && !normalizeBrandColor(branding.secondaryColor)) {
        errors.push('Secondary color must be a six-digit hex color, such as #FFC1D7.');
    }

    return errors;
}

export function brandForeground(color: string) {
    function channel(offset: number) {
        const value = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }

    // At this relative luminance, black gives more contrast than white.
    const luminance = channel(1) * 0.2126 + channel(3) * 0.7152 + channel(5) * 0.0722;
    return luminance > 0.179 ? '#000' : '#fff';
}
