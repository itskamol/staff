import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../../shared/repositories/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { 
  IComputerRepository, 
  IComputer, 
  IComputerUser,
  IDataScope 
} from '../../../shared/interfaces';
import { QueryDto } from '../../../shared/dto';

@Injectable()
export class ComputerRepository extends BaseRepository implements IComputerRepository {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  async findAll(query: QueryDto, scope: IDataScope): Promise<IComputer[]> {
    const where = this.buildWhereClause(scope);
    
    // Add search functionality
    if (query.search) {
      where.OR = [
        { computerUid: { contains: query.search, mode: 'insensitive' } },
        { os: { contains: query.search, mode: 'insensitive' } },
        { ipAddress: { contains: query.search, mode: 'insensitive' } },
        { macAddress: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const computers = await this.prisma.computer.findMany({
      where,
      include: {
        usersOnComputers: {
          include: {
            computerUser: {
              include: {
                employee: {
                  select: {
                    id: true,
                    name: true,
                    department: {
                      select: {
                        id: true,
                        fullName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: query.sortBy ? { [query.sortBy]: query.sortOrder || 'asc' } : { createdAt: 'desc' },
      skip: query.skip,
      take: query.limit,
    });

    return computers;
  }

  async findById(id: number): Promise<IComputer | null> {
    const computer = await this.prisma.computer.findUnique({
      where: { id },
      include: {
        usersOnComputers: {
          include: {
            computerUser: {
              include: {
                employee: {
                  select: {
                    id: true,
                    name: true,
                    department: {
                      select: {
                        id: true,
                        fullName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return computer;
  }

  async findByUid(computerUid: string): Promise<IComputer | null> {
    const computer = await this.prisma.computer.findUnique({
      where: { computerUid },
      include: {
        usersOnComputers: {
          include: {
            computerUser: {
              include: {
                employee: true,
              },
            },
          },
        },
      },
    });

    return computer;
  }

  async create(data: Partial<IComputer>): Promise<IComputer> {
    const computer = await this.prisma.computer.create({
      data: {
        computerUid: data.computerUid!,
        os: data.os,
        ipAddress: data.ipAddress,
        macAddress: data.macAddress,
        isActive: data.isActive ?? true,
      },
      include: {
        usersOnComputers: {
          include: {
            computerUser: {
              include: {
                employee: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return computer;
  }

  async update(id: number, data: Partial<IComputer>): Promise<IComputer> {
    const computer = await this.prisma.computer.update({
      where: { id },
      data: {
        os: data.os,
        ipAddress: data.ipAddress,
        macAddress: data.macAddress,
        isActive: data.isActive,
      },
      include: {
        usersOnComputers: {
          include: {
            computerUser: {
              include: {
                employee: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return computer;
  }

  async findUsers(computerId: number, scope: IDataScope): Promise<IComputerUser[]> {
    const userWhere = this.buildUserWhereClause(scope);

    const usersOnComputers = await this.prisma.usersOnComputers.findMany({
      where: {
        computerId,
        computerUser: userWhere,
      },
      include: {
        computerUser: {
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
        },
      },
    });

    return usersOnComputers.map(uoc => uoc.computerUser);
  }

  async findByOrganization(organizationId: number): Promise<IComputer[]> {
    const computers = await this.prisma.computer.findMany({
      where: {
        usersOnComputers: {
          some: {
            computerUser: {
              employee: {
                department: {
                  organizationId,
                },
              },
            },
          },
        },
      },
      include: {
        usersOnComputers: {
          include: {
            computerUser: {
              include: {
                employee: {
                  select: {
                    id: true,
                    name: true,
                    department: {
                      select: {
                        id: true,
                        fullName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return computers;
  }

  async findByDepartment(departmentId: number): Promise<IComputer[]> {
    const computers = await this.prisma.computer.findMany({
      where: {
        usersOnComputers: {
          some: {
            computerUser: {
              employee: {
                departmentId,
              },
            },
          },
        },
      },
      include: {
        usersOnComputers: {
          include: {
            computerUser: {
              include: {
                employee: {
                  select: {
                    id: true,
                    name: true,
                    department: {
                      select: {
                        id: true,
                        fullName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return computers;
  }

  async associateUser(computerId: number, computerUserId: number): Promise<void> {
    await this.prisma.usersOnComputers.upsert({
      where: {
        computerUserId_computerId: {
          computerUserId,
          computerId,
        },
      },
      update: {},
      create: {
        computerUserId,
        computerId,
      },
    });
  }

  async dissociateUser(computerId: number, computerUserId: number): Promise<void> {
    await this.prisma.usersOnComputers.delete({
      where: {
        computerUserId_computerId: {
          computerUserId,
          computerId,
        },
      },
    });
  }

  async findWithActivityInDateRange(startDate: Date, endDate: Date, scope: IDataScope): Promise<IComputer[]> {
    const where = this.buildWhereClause(scope);

    const computers = await this.prisma.computer.findMany({
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
        usersOnComputers: {
          include: {
            computerUser: {
              include: {
                employee: {
                  select: {
                    id: true,
                    name: true,
                    department: {
                      select: {
                        id: true,
                        fullName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return computers;
  }

  private buildWhereClause(scope: IDataScope): Prisma.ComputerWhereInput {
    const where: Prisma.ComputerWhereInput = {};

    // Role-based filtering - only show computers used by employees within scope
    if (scope.organizationId || scope.departmentId || scope.employeeIds) {
      where.usersOnComputers = {
        some: {
          computerUser: this.buildUserWhereClause(scope),
        },
      };
    }

    return where;
  }

  private buildUserWhereClause(scope: IDataScope): Prisma.ComputerUserWhereInput {
    const userWhere: Prisma.ComputerUserWhereInput = {};

    if (scope.organizationId) {
      userWhere.employee = {
        department: {
          organizationId: scope.organizationId,
        },
      };
    }

    if (scope.departmentId) {
      userWhere.employee = {
        ...userWhere.employee,
        departmentId: scope.departmentId,
      };
    }

    if (scope.employeeIds && scope.employeeIds.length > 0) {
      userWhere.employeeId = {
        in: scope.employeeIds,
      };
    }

    return userWhere;
  }

  async count(scope: IDataScope): Promise<number> {
    const where = this.buildWhereClause(scope);
    
    return await this.prisma.computer.count({
      where,
    });
  }

  async countActive(scope: IDataScope): Promise<number> {
    const where = this.buildWhereClause(scope);
    where.isActive = true;

    return await this.prisma.computer.count({
      where,
    });
  }
}