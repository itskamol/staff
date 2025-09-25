import { SessionType } from './computer-monitoring.dto';

// Response DTOs for Computer Users
export class ComputerUserResponseDto {
  id: number;
  employeeId?: number;
  sid: string;
  name: string;
  domain?: string;
  username: string;
  isAdmin: boolean;
  isInDomain: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  employee?: {
    id: number;
    name: string;
    department: {
      id: number;
      fullName: string;
    };
  };

  computers?: {
    id: number;
    computerUid: string;
    os?: string;
    ipAddress?: string;
  }[];
}

// Response DTOs for Computers
export class ComputerResponseDto {
  id: number;
  computerUid: string;
  os?: string;
  ipAddress?: string;
  macAddress?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  users?: {
    id: number;
    name: string;
    username: string;
    isAdmin: boolean;
    employee?: {
      id: number;
      name: string;
    };
  }[];
}

// Response DTOs for Activity Data
export class ActiveWindowResponseDto {
  id: number;
  usersOnComputersId: number;
  datetime: Date;
  title: string;
  processName: string;
  icon?: string;
  activeTime: number;
  createdAt: Date;

  computerUser?: {
    id: number;
    name: string;
    username: string;
    employee?: {
      id: number;
      name: string;
    };
  };
}

export class VisitedSiteResponseDto {
  id: number;
  usersOnComputersId: number;
  datetime: Date;
  title?: string;
  url: string;
  processName: string;
  icon?: string;
  activeTime: number;
  createdAt: Date;

  computerUser?: {
    id: number;
    name: string;
    username: string;
    employee?: {
      id: number;
      name: string;
    };
  };
}

export class ScreenshotResponseDto {
  id: number;
  usersOnComputersId: number;
  datetime: Date;
  title?: string;
  filePath: string;
  processName: string;
  icon?: string;
  createdAt: Date;

  computerUser?: {
    id: number;
    name: string;
    username: string;
    employee?: {
      id: number;
      name: string;
    };
  };
}

export class UserSessionResponseDto {
  id: number;
  usersOnComputersId: number;
  startTime: Date;
  endTime?: Date;
  sessionType: SessionType;
  duration?: number; // calculated in seconds

  computerUser?: {
    id: number;
    name: string;
    username: string;
    employee?: {
      id: number;
      name: string;
    };
  };
}

// Activity Report DTOs
export class ApplicationUsageDto {
  processName: string;
  totalTime: number; // seconds
  percentage: number;
  category: 'productive' | 'neutral' | 'unproductive';
}

export class WebsiteUsageDto {
  domain: string;
  totalTime: number; // seconds
  percentage: number;
  category: 'productive' | 'neutral' | 'unproductive';
  visitCount: number;
}

export class DailyActivityDto {
  date: Date;
  totalActiveTime: number; // seconds
  totalSessions: number;
  productivityScore: number; // 0-100
  topApplications: ApplicationUsageDto[];
  topWebsites: WebsiteUsageDto[];
  screenshotCount: number;
}

export class ScreenshotSummaryDto {
  datetime: Date;
  filePath: string;
  processName: string;
  title?: string;
}

export class ActivitySummaryDto {
  totalActiveTime: number; // seconds
  totalSessions: number;
  productivityScore: number; // 0-100
  topApplications: ApplicationUsageDto[];
  topWebsites: WebsiteUsageDto[];
}

export class ActivityReportDto {
  employeeId?: number;
  computerUserId?: number;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  summary: ActivitySummaryDto;
  dailyBreakdown: DailyActivityDto[];
  screenshots: ScreenshotSummaryDto[];
}

// Policy Response DTOs
export class ScreenshotOptionResponseDto {
  id: number;
  interval: number;
  isGrayscale: boolean;
  captureAllWindow: boolean;
}

export class VisitedSitesOptionResponseDto {
  id: number;
  blockedDomains?: string[];
  allowedDomains?: string[];
  trackPrivateBrowsing: boolean;
}

export class ActiveWindowsOptionResponseDto {
  id: number;
  excludedProcesses?: string[];
  trackIdleTime: boolean;
  idleThreshold: number;
}

export class PolicyResponseDto {
  id: number;
  title: string;
  activeWindow: boolean;
  screenshot: boolean;
  visitedSites: boolean;
  screenshotOptionsId?: number;
  visitedSitesOptionsId?: number;
  activeWindowsOptionsId?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  screenshotOptions?: ScreenshotOptionResponseDto;
  visitedSitesOptions?: VisitedSitesOptionResponseDto;
  activeWindowsOptions?: ActiveWindowsOptionResponseDto;
  
  employeeCount?: number;
  employees?: {
    id: number;
    name: string;
    department: {
      id: number;
      fullName: string;
    };
  }[];
}

// Agent Response DTOs
export class AgentDataResponseDto {
  success: boolean;
  message: string;
  processedAt: Date;
  dataId?: number;
}

export class ComputerUserRegistrationResponseDto {
  success: boolean;
  message: string;
  computerUserId: number;
  isNewUser: boolean;
  registeredAt: Date;
}