import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '../../../shared/repositories/base.repository';
import { PrismaService } from '../../../core/database/prisma.service';
import { 
  IMonitoringRepository,
  IActiveWindow,
  IVisitedSite,
  IScreenshot,
  IUserSession,
  IDataScope 
} from '../../../shared/interfaces';
import { MonitoringQueryDto } from '../../../shared/dto';

@Injectable()
export class MonitoringRepository extends BaseRepository implements IMonitoringRepository {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  async findActiveWindows(query: MonitoringQueryDto, scope: IDataScope): Promise<IActiveWindow[]> {
    const where = this.buildActiveWindowWhereClause(query, scope);

    const activeWindows = await this.prisma.activeWindow.findMany({
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
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { datetime: 'desc' },
      skip: query.skip,
      take: query.limit,
    });

    return activeWindows;
  }

  async findVisitedSites(query: MonitoringQueryDto, scope: IDataScope): Promise<IVisitedSite[]> {
    const where = this.buildVisitedSiteWhereClause(query, scope);

    const visitedSites = await this.prisma.visitedSite.findMany({
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
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { datetime: 'desc' },
      skip: query.skip,
      take: query.limit,
    });

    return visitedSites;
  }

  async findScreenshots(query: MonitoringQueryDto, scope: IDataScope): Promise<IScreenshot[]> {
    const where = this.buildScreenshotWhereClause(query, scope);

    const screenshots = await this.prisma.screenshot.findMany({
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
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { datetime: 'desc' },
      skip: query.skip,
      take: query.limit,
    });

    return screenshots;
  }

  async findUserSessions(query: MonitoringQueryDto, scope: IDataScope): Promise<IUserSession[]> {
    const where = this.buildUserSessionWhereClause(query, scope);

    const userSessions = await this.prisma.userSession.findMany({
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
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { startTime: 'desc' },
      skip: query.skip,
      take: query.limit,
    });

    return userSessions;
  }

  async createActiveWindow(data: Partial<IActiveWindow>): Promise<IActiveWindow> {
    const activeWindow = await this.prisma.activeWindow.create({
      data: {
        usersOnComputersId: data.usersOnComputersId!,
        datetime: data.datetime!,
        title: data.title!,
        processName: data.processName!,
        icon: data.icon,
        activeTime: data.activeTime!,
      },
    });

    return activeWindow;
  }

  async createVisitedSite(data: Partial<IVisitedSite>): Promise<IVisitedSite> {
    const visitedSite = await this.prisma.visitedSite.create({
      data: {
        usersOnComputersId: data.usersOnComputersId!,
        datetime: data.datetime!,
        title: data.title,
        url: data.url!,
        processName: data.processName!,
        icon: data.icon,
        activeTime: data.activeTime!,
      },
    });

    return visitedSite;
  }

  async createScreenshot(data: Partial<IScreenshot>): Promise<IScreenshot> {
    const screenshot = await this.prisma.screenshot.create({
      data: {
        usersOnComputersId: data.usersOnComputersId!,
        datetime: data.datetime!,
        title: data.title,
        filePath: data.filePath!,
        processName: data.processName!,
        icon: data.icon,
      },
    });

    return screenshot;
  }

  async createUserSession(data: Partial<IUserSession>): Promise<IUserSession> {
    const userSession = await this.prisma.userSession.create({
      data: {
        usersOnComputersId: data.usersOnComputersId!,
        startTime: data.startTime!,
        endTime: data.endTime,
        sessionType: data.sessionType!,
      },
    });

    return userSession;
  }

  async updateUserSession(id: number, data: Partial<IUserSession>): Promise<IUserSession> {
    const userSession = await this.prisma.userSession.update({
      where: { id },
      data: {
        endTime: data.endTime,
        sessionType: data.sessionType,
      },
    });

    return userSession;
  }

  // Aggregation methods for activity summaries
  async getActiveWindowSummary(
    usersOnComputersIds: number[],
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    const summary = await this.prisma.activeWindow.groupBy({
      by: ['processName'],
      where: {
        usersOnComputersId: { in: usersOnComputersIds },
        datetime: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        activeTime: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          activeTime: 'desc',
        },
      },
    });

    return summary;
  }

  async getVisitedSiteSummary(
    usersOnComputersIds: number[],
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    const summary = await this.prisma.visitedSite.groupBy({
      by: ['url'],
      where: {
        usersOnComputersId: { in: usersOnComputersIds },
        datetime: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        activeTime: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          activeTime: 'desc',
        },
      },
    });

    return summary;
  }

  async getDailyActivitySummary(
    usersOnComputersIds: number[],
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    // This would typically be done with a more complex query or raw SQL
    // For now, we'll use a simplified approach
    const dailySummary = await this.prisma.$queryRaw`
      SELECT 
        DATE(datetime) as date,
        COUNT(DISTINCT CASE WHEN active_time > 0 THEN id END) as activity_count,
        SUM(active_time) as total_active_time
      FROM (
        SELECT id, datetime, active_time FROM active_window 
        WHERE users_on_computers_id IN (${Prisma.join(usersOnComputersIds)})
        AND datetime >= ${startDate} AND datetime <= ${endDate}
        UNION ALL
        SELECT id, datetime, active_time FROM visited_site 
        WHERE users_on_computers_id IN (${Prisma.join(usersOnComputersIds)})
        AND datetime >= ${startDate} AND datetime <= ${endDate}
      ) combined_activity
      GROUP BY DATE(datetime)
      ORDER BY date DESC
    `;

    return dailySummary as any[];
  }

  async getSessionDurations(
    usersOnComputersIds: number[],
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    const sessions = await this.prisma.userSession.findMany({
      where: {
        usersOnComputersId: { in: usersOnComputersIds },
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        endTime: { not: null },
      },
      select: {
        startTime: true,
        endTime: true,
        sessionType: true,
      },
    });

    return sessions;
  }

  private buildActiveWindowWhereClause(
    query: MonitoringQueryDto,
    scope: IDataScope
  ): Prisma.ActiveWindowWhereInput {
    const where: Prisma.ActiveWindowWhereInput = {};

    // Date range filtering
    if (query.startDate || query.endDate) {
      where.datetime = {};
      if (query.startDate) {
        where.datetime.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.datetime.lte = new Date(query.endDate);
      }
    }

    // Scope-based filtering
    where.usersOnComputers = this.buildUsersOnComputersFilter(query, scope);

    return where;
  }

  private buildVisitedSiteWhereClause(
    query: MonitoringQueryDto,
    scope: IDataScope
  ): Prisma.VisitedSiteWhereInput {
    const where: Prisma.VisitedSiteWhereInput = {};

    // Date range filtering
    if (query.startDate || query.endDate) {
      where.datetime = {};
      if (query.startDate) {
        where.datetime.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.datetime.lte = new Date(query.endDate);
      }
    }

    // Scope-based filtering
    where.usersOnComputers = this.buildUsersOnComputersFilter(query, scope);

    return where;
  }

  private buildScreenshotWhereClause(
    query: MonitoringQueryDto,
    scope: IDataScope
  ): Prisma.ScreenshotWhereInput {
    const where: Prisma.ScreenshotWhereInput = {};

    // Date range filtering
    if (query.startDate || query.endDate) {
      where.datetime = {};
      if (query.startDate) {
        where.datetime.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.datetime.lte = new Date(query.endDate);
      }
    }

    // Scope-based filtering
    where.usersOnComputers = this.buildUsersOnComputersFilter(query, scope);

    return where;
  }

  private buildUserSessionWhereClause(
    query: MonitoringQueryDto,
    scope: IDataScope
  ): Prisma.UserSessionWhereInput {
    const where: Prisma.UserSessionWhereInput = {};

    // Date range filtering
    if (query.startDate || query.endDate) {
      where.startTime = {};
      if (query.startDate) {
        where.startTime.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.startTime.lte = new Date(query.endDate);
      }
    }

    // Scope-based filtering
    where.usersOnComputers = this.buildUsersOnComputersFilter(query, scope);

    return where;
  }

  private buildUsersOnComputersFilter(
    query: MonitoringQueryDto,
    scope: IDataScope
  ): Prisma.UsersOnComputersWhereInput {
    const filter: Prisma.UsersOnComputersWhereInput = {};

    // Specific computer user filtering
    if (query.computerUserId) {
      filter.computerUserId = query.computerUserId;
    }

    // Employee-based filtering
    if (query.employeeId) {
      filter.computerUser = {
        employeeId: query.employeeId,
      };
    }

    // Role-based scope filtering
    if (scope.organizationId || scope.departmentId || scope.employeeIds) {
      filter.computerUser = {
        ...filter.computerUser,
        employee: this.buildEmployeeFilter(scope),
      };
    }

    return filter;
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
}