import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
  Max,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QueryDto } from './query.dto';

// Enums
export enum SessionType {
  UNLOCKED = 'UNLOCKED',
  LOCKED = 'LOCKED',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
}

export enum ActivityType {
  ACTIVE_WINDOWS = 'active-windows',
  VISITED_SITES = 'visited-sites',
  SCREENSHOTS = 'screenshots',
  SESSIONS = 'sessions',
}

export enum AgentDataType {
  ACTIVE_WINDOW = 'active-window',
  VISITED_SITE = 'visited-site',
  SCREENSHOT = 'screenshot',
  SESSION = 'session',
}

// Base monitoring data DTOs
export class ActiveWindowDataDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  processName: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsNumber()
  @Min(0)
  activeTime: number; // seconds
}

export class VisitedSiteDataDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @IsString()
  @IsNotEmpty()
  processName: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsNumber()
  @Min(0)
  activeTime: number; // seconds
}

export class ScreenshotDataDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @IsNotEmpty()
  filePath: string;

  @IsString()
  @IsNotEmpty()
  processName: string;

  @IsOptional()
  @IsString()
  icon?: string;
}

export class SessionDataDto {
  @IsDateString()
  startTime: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsEnum(SessionType)
  sessionType: SessionType;
}

// Agent data submission DTOs
export class AgentDataDto {
  @IsString()
  @IsNotEmpty()
  computerUid: string;

  @IsString()
  @IsNotEmpty()
  computerUserSid: string;

  @IsEnum(AgentDataType)
  dataType: AgentDataType;

  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  data: ActiveWindowDataDto | VisitedSiteDataDto | ScreenshotDataDto | SessionDataDto;

  @IsDateString()
  timestamp: string;
}

export class RegisterComputerUserDto {
  @IsString()
  @IsNotEmpty()
  computerUid: string;

  @IsString()
  @IsNotEmpty()
  sid: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsBoolean()
  isAdmin: boolean;

  @IsBoolean()
  isInDomain: boolean;

  @IsOptional()
  @IsString()
  os?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  macAddress?: string;
}

// Query DTOs
export class MonitoringQueryDto extends QueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  employeeId?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  computerUserId?: number;

  @IsOptional()
  @IsEnum(ActivityType)
  activityType?: ActivityType;
}

export class ActivityQueryDto extends QueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeScreenshots?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeProductivityMetrics?: boolean;
}

// Computer User DTOs
export class LinkEmployeeDto {
  @IsNumber()
  employeeId: number;
}

// Policy configuration DTOs
export class CreateScreenshotOptionDto {
  @IsNumber()
  @Min(30)
  @Max(3600)
  interval: number; // seconds

  @IsBoolean()
  isGrayscale: boolean;

  @IsBoolean()
  captureAllWindow: boolean;
}

export class CreateVisitedSitesOptionDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedDomains?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDomains?: string[];

  @IsBoolean()
  trackPrivateBrowsing: boolean;
}

export class CreateActiveWindowsOptionDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludedProcesses?: string[];

  @IsBoolean()
  trackIdleTime: boolean;

  @IsNumber()
  @Min(1)
  @Max(300)
  idleThreshold: number; // seconds
}

export class CreatePolicyDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsBoolean()
  activeWindow: boolean;

  @IsBoolean()
  screenshot: boolean;

  @IsBoolean()
  visitedSites: boolean;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateScreenshotOptionDto)
  screenshotOptions?: CreateScreenshotOptionDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateVisitedSitesOptionDto)
  visitedSitesOptions?: CreateVisitedSitesOptionDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CreateActiveWindowsOptionDto)
  activeWindowsOptions?: CreateActiveWindowsOptionDto;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  employeeIds?: number[];
}

export class UpdatePolicyDto extends CreatePolicyDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}