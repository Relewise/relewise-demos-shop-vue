import type { IDataset } from '@/stores/context.store';
import type { Company, DataValue } from '@relewise/client';

export function validatePersonalization(dataset: IDataset) {
    const errors: string[] = [];
    const users = dataset.users ?? [];
    const companies = dataset.companies ?? [];

    const invalidUserMetadata = users.some((user) => hasInvalidRecord(user.classifications) || hasInvalidRecord(user.identifiers) || hasInvalidDataRecord(user.data));
    if (invalidUserMetadata) {
        errors.push('All user classifications, identifiers, and data values must include both a key and value.');
    }

    if (hasDuplicateValues(users, (user) => user.temporaryId?.trim())) {
        errors.push('Temporary IDs must be unique.');
    }

    if (hasDuplicateValues(users, (user) => user.authenticatedId?.trim())) {
        errors.push('Authenticated IDs must be unique.');
    }

    if (hasDuplicateValues(users, (user) => user.email?.trim().toLowerCase())) {
        errors.push('User emails must be unique.');
    }

    const invalidCompanies = companies.filter((company) => !company.id?.trim());
    if (invalidCompanies.length > 0) {
        errors.push('Each company must have an ID.');
    }

    if (hasDuplicateValues(companies, (company) => company.id?.trim())) {
        errors.push('Company IDs must be unique.');
    }

    const invalidCompanyData = companies.some((company) => hasInvalidDataRecord(company.data));
    if (invalidCompanyData) {
        errors.push('All company data values must include both a key and value.');
    }

    const companiesById = new Map(
        companies
            .filter((company) => company.id?.trim())
            .map((company) => [company.id.trim(), company] as const),
    );

    const hasUnknownParentReference = companies.some((company) => {
        const parentId = company.parent?.id?.trim();
        if (!parentId) {
            return false;
        }

        return !companiesById.has(parentId);
    });

    if (hasUnknownParentReference) {
        errors.push('Each parent company must reference another company in the dataset.');
    }

    const hasParentAndChildren = companies.some((company) => {
        const companyId = company.id?.trim();
        if (!companyId || !company.parent?.id?.trim()) {
            return false;
        }

        return companies.some((candidate) => candidate.parent?.id?.trim() === companyId);
    });

    if (hasParentAndChildren) {
        errors.push('A company with child companies cannot also have a parent company.');
    }

    if (hasCompanyHierarchyCycle(companiesById)) {
        errors.push('Company hierarchy cannot contain cycles.');
    }

    if (hasCompanyHierarchyDeeperThanTwoLevels(companiesById)) {
        errors.push('Company hierarchy can only be 2 levels deep.');
    }

    return errors;
}

function hasInvalidRecord(record?: Record<string, string | null>) {
    if (!record) {
        return false;
    }

    return Object.entries(record).some(([key, value]) => !key || !value);
}

function hasInvalidDataRecord(record?: Record<string, DataValue>) {
    if (!record) {
        return false;
    }

    return Object.entries(record).some(([key, value]) => !key || !value?.value);
}

function hasDuplicateValues<T>(items: T[], getValue: (item: T) => string | undefined) {
    const seenValues = new Set<string>();

    for (const item of items) {
        const value = getValue(item);
        if (!value) {
            continue;
        }

        if (seenValues.has(value)) {
            return true;
        }

        seenValues.add(value);
    }

    return false;
}

function hasCompanyHierarchyCycle(companiesById: Map<string, Company>) {
    for (const companyId of companiesById.keys()) {
        const visited = new Set<string>();
        let currentCompanyId: string | undefined = companyId;

        while (currentCompanyId) {
            if (visited.has(currentCompanyId)) {
                return true;
            }

            visited.add(currentCompanyId);
            currentCompanyId = companiesById.get(currentCompanyId)?.parent?.id?.trim();
        }
    }

    return false;
}

function hasCompanyHierarchyDeeperThanTwoLevels(companiesById: Map<string, Company>) {
    for (const companyId of companiesById.keys()) {
        let depth = 0;
        let currentCompanyId = companiesById.get(companyId)?.parent?.id?.trim();
        const visited = new Set<string>();

        while (currentCompanyId && !visited.has(currentCompanyId)) {
            visited.add(currentCompanyId);
            depth += 1;

            if (depth > 1) {
                return true;
            }

            currentCompanyId = companiesById.get(currentCompanyId)?.parent?.id?.trim();
        }
    }

    return false;
}
