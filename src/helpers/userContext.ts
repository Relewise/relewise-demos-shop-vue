import type { Company, User } from '@relewise/client';

export function sanitizeUser(user: User) {
    const normalizedUser: User = {
        ...user,
        classifications: user.classifications ? { ...user.classifications } : undefined,
        identifiers: user.identifiers ? { ...user.identifiers } : undefined,
        data: user.data ? { ...user.data } : undefined,
    };

    delete normalizedUser.company;

    return normalizedUser;
}

export function sanitizeUsers(users?: User[]) {
    return (users ?? []).map(sanitizeUser);
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
    const baseUser = user ? sanitizeUser(user) : {};

    return {
        ...baseUser,
        company: buildRuntimeCompany(company, companies),
    } as User;
}
