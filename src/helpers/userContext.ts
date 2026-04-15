import type { Company, User } from '@relewise/client';

export type DemoUser = User & {
    companyIds?: string[];
};

function normalizeCompanyIds(companyIds: Array<string | undefined | null> = []) {
    const normalizedCompanyIds: string[] = [];

    for (const companyId of companyIds) {
        const normalizedCompanyId = companyId?.trim() ?? '';
        if (!normalizedCompanyId || normalizedCompanyIds.some((existingCompanyId) => existingCompanyId.toLowerCase() === normalizedCompanyId.toLowerCase())) {
            continue;
        }

        normalizedCompanyIds.push(normalizedCompanyId);
    }

    return normalizedCompanyIds;
}

export function getUserCompanyIds(user: User | undefined) {
    if (!user) {
        return [];
    }

    return normalizeCompanyIds((user as DemoUser).companyIds);
}

export function setUserCompanyIds(user: User, companyIds: string[]) {
    const normalizedCompanyIds = normalizeCompanyIds(companyIds);

    if (normalizedCompanyIds.length === 0) {
        delete (user as DemoUser).companyIds;
        return;
    }

    (user as DemoUser).companyIds = normalizedCompanyIds;
}

export function sanitizeUser(user: User) {
    const normalizedUser: DemoUser = {
        ...user,
        classifications: user.classifications ? { ...user.classifications } : undefined,
        identifiers: user.identifiers ? { ...user.identifiers } : undefined,
        data: user.data ? { ...user.data } : undefined,
        companyIds: getUserCompanyIds(user),
    };

    delete normalizedUser.company;
    if ((normalizedUser.companyIds?.length ?? 0) === 0) {
        delete normalizedUser.companyIds;
    }

    return normalizedUser;
}

export function sanitizeUsers(users?: User[]) {
    return (users ?? []).map(sanitizeUser);
}

function sanitizeRuntimeUser(user: User) {
    const normalizedUser = sanitizeUser(user);
    delete normalizedUser.companyIds;
    return normalizedUser as User;
}

function buildRuntimeCompany(company: Company | undefined, companies: Company[]) {
    if (!company) {
        return undefined;
    }

    const normalizedCompany: Company = {
        ...company,
        id: company.id?.trim() ?? '',
        data: company.data ? { ...company.data } : undefined,
    };

    const parentId = company.parent?.id?.trim();
    if (!parentId) {
        normalizedCompany.parent = undefined;
        return normalizedCompany;
    }

    const parentCompany = companies.find((candidate) => candidate.id === parentId);
    normalizedCompany.parent = parentCompany
        ? {
            ...parentCompany,
            id: parentCompany.id?.trim() ?? '',
            data: parentCompany.data ? { ...parentCompany.data } : undefined,
            parent: undefined,
        } as Company
        : { id: parentId } as Company;

    return normalizedCompany;
}

export function buildContextUser(user: User | undefined, company: Company | undefined, companies: Company[] = []) {
    const baseUser = user ? sanitizeRuntimeUser(user) : {};

    return {
        ...baseUser,
        company: buildRuntimeCompany(company, companies),
    } as User;
}
