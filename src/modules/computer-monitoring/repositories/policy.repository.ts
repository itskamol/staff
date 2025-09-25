import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../../shared/repositories/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { IPolicyRepository, IPolicy, IDataScope } from '../../../shared/interfaces';
import { QueryDto } from '../../../shared/dto';

@Injectable()
export class PolicyRepository extends BaseRepository implements IPolicyRepository {
    constructor(protected readonly prisma: PrismaService) {
        super(prisma);
    }

    async findAll(query: QueryDto, scope: IDataScope): Promise<IPolicy[]> {
        const where = this.buildWhereClause(scope);

        // Add search functionality
        if (query.search) {
            where.title = {
                contains: query.search,
                mode: 'insensitive',
            };
        }

        const policies = await this.prisma.policy.findMany({
            where,
            include: {
                screenshotOptions: true,
                visitedSitesOptions: true,
                activeWindowsOptions: true,
                employees: {
                    include: {
                        department: {
                            select: {
                                id: true,
                                fullName: true,
                            },
                        },
                    },
                },
            },
            orderBy: query.sortBy
                ? { [query.sortBy]: query.sortOrder || 'asc' }
                : { createdAt: 'desc' },
            skip: query.skip,
            take: query.limit,
        });

        return policies;
    }

    async findById(id: number): Promise<IPolicy | null> {
        const policy = await this.prisma.policy.findUnique({
            where: { id },
            include: {
                screenshotOptions: true,
                visitedSitesOptions: true,
                activeWindowsOptions: true,
                employees: {
                    include: {
                        department: {
                            select: {
                                id: true,
                                fullName: true,
                            },
                        },
                    },
                },
            },
        });

        return policy;
    }

    async create(data: Partial<IPolicy>): Promise<IPolicy> {
        const policy = await this.prisma.policy.create({
            data: {
                title: data.title!,
                activeWindow: data.activeWindow!,
                screenshot: data.screenshot!,
                visitedSites: data.visitedSites!,
                isActive: data.isActive ?? true,
            },
            include: {
                screenshotOptions: true,
                visitedSitesOptions: true,
                activeWindowsOptions: true,
                employees: {
                    include: {
                        department: {
                            select: {
                                id: true,
                                fullName: true,
                            },
                        },
                    },
                },
            },
        });

        return policy;
    }

    async update(id: number, data: Partial<IPolicy>): Promise<IPolicy> {
        const policy = await this.prisma.policy.update({
            where: { id },
            data: {
                title: data.title,
                activeWindow: data.activeWindow,
                screenshot: data.screenshot,
                visitedSites: data.visitedSites,
                isActive: data.isActive,
            },
            include: {
                screenshotOptions: true,
                visitedSitesOptions: true,
                activeWindowsOptions: true,
                employees: {
                    include: {
                        department: {
                            select: {
                                id: true,
                                fullName: true,
                            },
                        },
                    },
                },
            },
        });

        return policy;
    }

    async delete(id: number): Promise<void> {
        // First check if policy has dependencies
        const policy = await this.prisma.policy.findUnique({
            where: { id },
            include: {
                employees: true,
            },
        });

        if (policy && policy.employees.length > 0) {
            throw new Error('Cannot delete policy that is assigned to employees');
        }

        // Delete related options first
        await this.prisma.$transaction(async tx => {
            const policyToDelete = await tx.policy.findUnique({
                where: { id },
                select: {
                    screenshotOptionsId: true,
                    visitedSitesOptionsId: true,
                    activeWindowsOptionsId: true,
                },
            });

            if (policyToDelete) {
                // Delete screenshot options if exists
                if (policyToDelete.screenshotOptionsId) {
                    await tx.screenshotOption.delete({
                        where: { id: policyToDelete.screenshotOptionsId },
                    });
                }

                // Delete visited sites options if exists
                if (policyToDelete.visitedSitesOptionsId) {
                    await tx.visitedSitesOption.delete({
                        where: { id: policyToDelete.visitedSitesOptionsId },
                    });
                }

                // Delete active windows options if exists
                if (policyToDelete.activeWindowsOptionsId) {
                    await tx.activeWindowsOption.delete({
                        where: { id: policyToDelete.activeWindowsOptionsId },
                    });
                }

                // Finally delete the policy
                await tx.policy.delete({
                    where: { id },
                });
            }
        });
    }

    async findEmployeePolicies(employeeId: number): Promise<IPolicy[]> {
        const policies = await this.prisma.policy.findMany({
            where: {
                employees: {
                    some: {
                        id: employeeId,
                    },
                },
                isActive: true,
            },
            include: {
                screenshotOptions: true,
                visitedSitesOptions: true,
                activeWindowsOptions: true,
            },
        });

        return policies;
    }

    async assignToEmployees(policyId: number, employeeIds: number[]): Promise<void> {
        await this.prisma.policy.update({
            where: { id: policyId },
            data: {
                employees: {
                    connect: employeeIds.map(id => ({ id })),
                },
            },
        });
    }

    async removeFromEmployees(policyId: number, employeeIds: number[]): Promise<void> {
        await this.prisma.policy.update({
            where: { id: policyId },
            data: {
                employees: {
                    disconnect: employeeIds.map(id => ({ id })),
                },
            },
        });
    }

    async createWithOptions(
        policyData: Partial<IPolicy>,
        screenshotOptions?: any,
        visitedSitesOptions?: any,
        activeWindowsOptions?: any
    ): Promise<IPolicy> {
        return await this.prisma.$transaction(async tx => {
            let screenshotOptionsId: number | undefined;
            let visitedSitesOptionsId: number | undefined;
            let activeWindowsOptionsId: number | undefined;

            // Create screenshot options if provided
            if (screenshotOptions) {
                const createdScreenshotOptions = await tx.screenshotOption.create({
                    data: screenshotOptions,
                });
                screenshotOptionsId = createdScreenshotOptions.id;
            }

            // Create visited sites options if provided
            if (visitedSitesOptions) {
                const createdVisitedSitesOptions = await tx.visitedSitesOption.create({
                    data: visitedSitesOptions,
                });
                visitedSitesOptionsId = createdVisitedSitesOptions.id;
            }

            // Create active windows options if provided
            if (activeWindowsOptions) {
                const createdActiveWindowsOptions = await tx.activeWindowsOption.create({
                    data: activeWindowsOptions,
                });
                activeWindowsOptionsId = createdActiveWindowsOptions.id;
            }

            // Create policy with option references
            const policy = await tx.policy.create({
                data: {
                    title: policyData.title!,
                    activeWindow: policyData.activeWindow!,
                    screenshot: policyData.screenshot!,
                    visitedSites: policyData.visitedSites!,
                    screenshotOptionsId,
                    visitedSitesOptionsId,
                    activeWindowsOptionsId,
                    isActive: policyData.isActive ?? true,
                },
                include: {
                    screenshotOptions: true,
                    visitedSitesOptions: true,
                    activeWindowsOptions: true,
                    employees: {
                        include: {
                            department: {
                                select: {
                                    id: true,
                                    fullName: true,
                                },
                            },
                        },
                    },
                },
            });

            return policy;
        });
    }

    async updateWithOptions(
        id: number,
        policyData: Partial<IPolicy>,
        screenshotOptions?: any,
        visitedSitesOptions?: any,
        activeWindowsOptions?: any
    ): Promise<IPolicy> {
        return await this.prisma.$transaction(async tx => {
            const existingPolicy = await tx.policy.findUnique({
                where: { id },
                select: {
                    screenshotOptionsId: true,
                    visitedSitesOptionsId: true,
                    activeWindowsOptionsId: true,
                },
            });

            if (!existingPolicy) {
                throw new Error('Policy not found');
            }

            let screenshotOptionsId = existingPolicy.screenshotOptionsId;
            let visitedSitesOptionsId = existingPolicy.visitedSitesOptionsId;
            let activeWindowsOptionsId = existingPolicy.activeWindowsOptionsId;

            // Update or create screenshot options
            if (screenshotOptions) {
                if (screenshotOptionsId) {
                    await tx.screenshotOption.update({
                        where: { id: screenshotOptionsId },
                        data: screenshotOptions,
                    });
                } else {
                    const created = await tx.screenshotOption.create({
                        data: screenshotOptions,
                    });
                    screenshotOptionsId = created.id;
                }
            }

            // Update or create visited sites options
            if (visitedSitesOptions) {
                if (visitedSitesOptionsId) {
                    await tx.visitedSitesOption.update({
                        where: { id: visitedSitesOptionsId },
                        data: visitedSitesOptions,
                    });
                } else {
                    const created = await tx.visitedSitesOption.create({
                        data: visitedSitesOptions,
                    });
                    visitedSitesOptionsId = created.id;
                }
            }

            // Update or create active windows options
            if (activeWindowsOptions) {
                if (activeWindowsOptionsId) {
                    await tx.activeWindowsOption.update({
                        where: { id: activeWindowsOptionsId },
                        data: activeWindowsOptions,
                    });
                } else {
                    const created = await tx.activeWindowsOption.create({
                        data: activeWindowsOptions,
                    });
                    activeWindowsOptionsId = created.id;
                }
            }

            // Update policy
            const policy = await tx.policy.update({
                where: { id },
                data: {
                    title: policyData.title,
                    activeWindow: policyData.activeWindow,
                    screenshot: policyData.screenshot,
                    visitedSites: policyData.visitedSites,
                    screenshotOptionsId,
                    visitedSitesOptionsId,
                    activeWindowsOptionsId,
                    isActive: policyData.isActive,
                },
                include: {
                    screenshotOptions: true,
                    visitedSitesOptions: true,
                    activeWindowsOptions: true,
                    employees: {
                        include: {
                            department: {
                                select: {
                                    id: true,
                                    fullName: true,
                                },
                            },
                        },
                    },
                },
            });

            return policy;
        });
    }

    async checkDependencies(id: number): Promise<{ hasEmployees: boolean; employeeCount: number }> {
        const policy = await this.prisma.policy.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        employees: true,
                    },
                },
            },
        });

        return {
            hasEmployees: (policy?._count.employees || 0) > 0,
            employeeCount: policy?._count.employees || 0,
        };
    }

    async findByOrganization(organizationId: number): Promise<IPolicy[]> {
        const policies = await this.prisma.policy.findMany({
            where: {
                employees: {
                    some: {
                        department: {
                            organizationId,
                        },
                    },
                },
            },
            include: {
                screenshotOptions: true,
                visitedSitesOptions: true,
                activeWindowsOptions: true,
                employees: {
                    include: {
                        department: {
                            select: {
                                id: true,
                                fullName: true,
                            },
                        },
                    },
                },
            },
        });

        return policies;
    }

    private buildWhereClause(scope: IDataScope): Prisma.PolicyWhereInput {
        const where: Prisma.PolicyWhereInput = {};

        // Role-based scoping - show policies that apply to employees within scope
        if (scope.organizationId || scope.departmentId || scope.employeeIds) {
            where.employees = {
                some: this.buildEmployeeFilter(scope),
            };
        }

        return where;
    }

    private buildEmployeeFilter(scope: IDataScope): Prisma.EmployeeWhereInput {
        const employeeFilter: Prisma.EmployeeWhereInput = {};

        if (scope.organizationId) {
            employeeFilter.department = {
                organizationId: scope.organizationId,
            };
        }

        if (scope.departmentId) {
            employeeFilter.departmentId = scope.departmentId;
        }

        if (scope.employeeIds && scope.employeeIds.length > 0) {
            employeeFilter.id = {
                in: scope.employeeIds,
            };
        }

        return employeeFilter;
    }

    async count(scope: IDataScope): Promise<number> {
        const where = this.buildWhereClause(scope);

        return await this.prisma.policy.count({
            where,
        });
    }

    async countActive(scope: IDataScope): Promise<number> {
        const where = this.buildWhereClause(scope);
        where.isActive = true;

        return await this.prisma.policy.count({
            where,
        });
    }
}
