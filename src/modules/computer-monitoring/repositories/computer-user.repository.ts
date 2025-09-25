import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../../shared/repositories/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { 
  IComputerUserRepository, 
  IComputerUser, 
  IDataScope, 
  IUserContext 
} from '../../../shared/interfaces';
import { QueryDto } from '../../../shared/dto';

@Injectable()
export class ComputerUserRepository extends BaseRepository implements IComputerUserRepository {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  async findAll(query: QueryDto, scope: IDataScope): Promise<IComputerUser[]> {
    const where = this.buildWhereClause(scope);
    
    // Add search functionality
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { username: { contains: query.search, mode: 'insensitive' } },
        { domain: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const computerUsers = await this.prisma.computerUser.findMany({
      where,
      include: {
        employee: {
          include: {
            department: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        usersOnComputers: {
          include: {
            computer: {
              select: {
                id: true,
                computerUid: true,
                os: true,
                ipAddress: true,
              },
            },
          },
        },
      },
      orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder || 'asc' } : { createdAt: 'desc' },
      skip: query.skip,
      take: query.limit,
    });

    return computerUsers;
  }

  async findById(id: number): Promise<IComputerUser | null> {
    const computerUser = await this.prisma.computerUser.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            department: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
        usersOnComputers: {
          include: {
            computer: {
              select: {
                id: true,
                computerUid: true,
                os: true,
                ipAddress: true,
              },
            },
          },
        },
      },
    });

    return computerUser;
  }

  async findUnlinked(scope: IDataScope): Promise<IComputerUser[]> {
    const where = this.buildWhereClause(scope);
    where.employeeId = null;

    const unlinkedUsers = await this.prisma.computerUser.findMany({
      where,
      include: {
        usersOnComputers: {
          include: {
            computer: {
              select: {
                id: true,
                computerUid: true,
                os: true,
                ipAddress: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return unlinkedUsers;
  }

  async findBySid(sid: string): Promise<IComputerUser | null> {
    const computerUser = await this.prisma.computerUser.findUnique({
      where: { sid },
      include: {
        employee: true,
        usersOnComputers: {
          include: {
            computer: true,
          },
        },
      },
    });

    return computerUser;
  }

  async create(data: Partial<IComputerUser>): Promise<IComputerUser> {
    const computerUser = await this.prisma.computerUser.create({
      data: {
        sid: data.sid!,
        name: data.name!,
        domain: data.domain,
        username: data.username!,
        isAdmin: data.isAdmin!,
        isInDomain: data.isInDomain!,
        isActive: data.isActive ?? true,
        employeeId: data.employeeId,
      },
      include: {
        employee: {
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

    return computerUser;
  }

  async update(id: number, data: Partial<IComputerUser>): Promise<IComputerUser> {
    const computerUser = await this.prisma.computerUser.update({
      where: { id },
      data: {
        name: data.name,
        domain: data.domain,
        username: data.username,
        isAdmin: data.isAdmin,
        isInDomain: data.isInDomain,
        isActive: data.isActive,
        employeeId: data.employeeId,
      },
      include: {
        employee: {
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

    return computerUser;
  }

  async linkToEmployee(computerUserId: number, employeeId: number): Promise<void> {
    await this.prisma.computerUser.update({
      where: { id: computerUserId },
      data: { employeeId },
    });
  }

  async unlinkFromEmployee(computerUserId: number): Promise<void> {
    await this.prisma.computerUser.update({
      where: { id: computerUserId },
      data: { employeeId: null },
    });
  }

  async findByEmployeeId(employeeId: number): Promise<IComputerUser[]> {
    const computerUsers = await this.prisma.computerUser.findMany({
      where: { employeeId },
      include: {
        usersOnComputers: {
          include: {
            computer: {
              select: {
                id: true,
                computerUid: true,
                os: true,
                ipAddress: true,
              },
            },
          },
        },
      },
    });

    return computerUsers;
  }

  async findWithActivityInDateRange(startDate: Date, endDate: Date, scope: IDataScope): Promise<IComputerUser[]> {
    const where = this.buildWhereClause(scope);

    const computerUsers = await this.prisma.computerUser.findMany({
      where: {
        ...where,
        usersOnComputers: {
          some: {
            OR: [
              {
                activeWindows: {
                  some: {
                    datetime: {
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                },
              },
              {
                visitedSites: {
                  some: {
                    datetime: {
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                },
              },
              {
                screenshots: {
                  some: {
                    datetime: {
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                },
              },
            ],
          },
        },
      },
      include: {
        employee: {
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

    return computerUsers;
  }

  private buildWhereClause(scope: IDataScope): Prisma.ComputerUserWhereInput {
    const where: Prisma.ComputerUserWhereInput = {};

    // Role-based scoping
    if (scope.organizationId) {
      where.employee = {
        department: {
          organizationId: scope.organizationId,
        },
      };
    }

    if (scope.departmentId) {
      where.employee = {
        ...where.employee,
        departmentId: scope.departmentId,
      };
    }

    if (scope.employeeIds && scope.employeeIds.length > 0) {
      where.employeeId = {
        in: scope.employeeIds,
      };
    }

    return where;
  }

  async count(scope: IDataScope): Promise<number> {
    const where = this.buildWhereClause(scope);
    
    return await this.prisma.computerUser.count({
      where,
    });
  }

  async countUnlinked(scope: IDataScope): Promise<number> {
    const where = this.buildWhereClause(scope);
    where.employeeId = null;

    return await this.prisma.computerUser.count({
      where,
    });
  }
}