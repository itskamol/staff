import { SessionType, AgentDataType } from '../dto/computer-monitoring.dto';

// Core entity interfaces
export interface IComputerUser {
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
}

export interface IComputer {
  id: number;
  computerUid: string;
  os?: string;
  ipAddress?: string;
  macAddress?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUsersOnComputers {
  id: number;
  computerUserId: number;
  computerId: number;
  createdAt: Date;
  updatedAt: Date;
}

// Activity data interfaces
export interface IActiveWindow {
  id: number;
  usersOnComputersId: number;
  datetime: Date;
  title: string;
  processName: string;
  icon?: string;
  activeTime: number;
  createdAt: Date;
}

export interface IVisitedSite {
  id: number;
  usersOnComputersId: number;
  datetime: Date;
  title?: string;
  url: string;
  processName: string;
  icon?: string;
  activeTime: number;
  createdAt: Date;
}

export interface IScreenshot {
  id: number;
  usersOnComputersId: number;
  datetime: Date;
  title?: string;
  filePath: string;
  processName: string;
  icon?: string;
  createdAt: Date;
}

export interface IUserSession {
  id: number;
  usersOnComputersId: number;
  startTime: Date;
  endTime?: Date;
  sessionType: SessionType;
}

// Policy interfaces
export interface IScreenshotOption {
  id: number;
  interval: number;
  isGrayscale: boolean;
  captureAllWindow: boolean;
}

export interface IVisitedSitesOption {
  id: number;
  blockedDomains?: string[];
  allowedDomains?: string[];
  trackPrivateBrowsing: boolean;
}

export interface IActiveWindowsOption {
  id: number;
  excludedProcesses?: string[];
  trackIdleTime: boolean;
  idleThreshold: number;
}

export interface IPolicy {
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
}

// Agent data interfaces
export interface IAgentActiveWindowData {
  title: string;
  processName: string;
  icon?: string;
  activeTime: number;
}

export interface IAgentVisitedSiteData {
  title?: string;
  url: string;
  processName: string;
  icon?: string;
  activeTime: number;
}

export interface IAgentScreenshotData {
  title?: string;
  filePath: string;
  processName: string;
  icon?: string;
}

export interface IAgentSessionData {
  startTime: Date;
  endTime?: Date;
  sessionType: SessionType;
}

export interface IAgentData {
  computerUid: string;
  computerUserSid: string;
  dataType: AgentDataType;
  data: IAgentActiveWindowData | IAgentVisitedSiteData | IAgentScreenshotData | IAgentSessionData;
  timestamp: Date;
}

export interface IComputerUserRegistration {
  computerUid: string;
  sid: string;
  name: string;
  domain?: string;
  username: string;
  isAdmin: boolean;
  isInDomain: boolean;
  os?: string;
  ipAddress?: string;
  macAddress?: string;
}

// Service interfaces
export interface IComputerUserService {
  getComputerUsers(query: any, scope: any, user: any): Promise<IComputerUser[]>;
  getUnlinkedComputerUsers(scope: any, user: any): Promise<IComputerUser[]>;
  linkToEmployee(computerUserId: number, employeeId: number, scope: any, user: any): Promise<void>;
  unlinkFromEmployee(computerUserId: number, scope: any, user: any): Promise<void>;
  registerComputerUser(registrationData: IComputerUserRegistration): Promise<IComputerUser>;
}

export interface IComputerService {
  getComputers(query: any, scope: any, user: any): Promise<IComputer[]>;
  getComputerUsers(computerId: number, scope: any, user: any): Promise<IComputerUser[]>;
  registerComputer(computerData: Partial<IComputer>): Promise<IComputer>;
  updateComputerStatus(computerId: number, isActive: boolean): Promise<void>;
}

export interface IMonitoringService {
  getActiveWindows(query: any, scope: any, user: any): Promise<IActiveWindow[]>;
  getVisitedSites(query: any, scope: any, user: any): Promise<IVisitedSite[]>;
  getScreenshots(query: any, scope: any, user: any): Promise<IScreenshot[]>;
  getUserSessions(query: any, scope: any, user: any): Promise<IUserSession[]>;
  getEmployeeActivityReport(employeeId: number, query: any, scope: any, user: any): Promise<any>;
  getComputerUserActivityReport(computerUserId: number, query: any, scope: any, user: any): Promise<any>;
  processAgentData(data: IAgentData): Promise<void>;
}

export interface IPolicyService {
  getPolicies(query: any, scope: any, user: any): Promise<IPolicy[]>;
  createPolicy(dto: any, scope: any, user: any): Promise<IPolicy>;
  updatePolicy(id: number, dto: any, scope: any, user: any): Promise<IPolicy>;
  deletePolicy(id: number, scope: any, user: any): Promise<void>;
  validatePolicyConfiguration(config: any): Promise<boolean>;
  applyPolicyToEmployees(policyId: number, employeeIds: number[]): Promise<void>;
}

export interface IAgentService {
  processAgentData(data: IAgentData): Promise<void>;
  registerComputerUser(registrationData: IComputerUserRegistration): Promise<IComputerUser>;
  validateAgentData(data: any): Promise<boolean>;
}

// Repository interfaces
export interface IComputerUserRepository {
  findAll(query: any, scope: any): Promise<IComputerUser[]>;
  findById(id: number): Promise<IComputerUser | null>;
  findUnlinked(scope: any): Promise<IComputerUser[]>;
  findBySid(sid: string): Promise<IComputerUser | null>;
  create(data: Partial<IComputerUser>): Promise<IComputerUser>;
  update(id: number, data: Partial<IComputerUser>): Promise<IComputerUser>;
  linkToEmployee(computerUserId: number, employeeId: number): Promise<void>;
  unlinkFromEmployee(computerUserId: number): Promise<void>;
}

export interface IComputerRepository {
  findAll(query: any, scope: any): Promise<IComputer[]>;
  findById(id: number): Promise<IComputer | null>;
  findByUid(computerUid: string): Promise<IComputer | null>;
  create(data: Partial<IComputer>): Promise<IComputer>;
  update(id: number, data: Partial<IComputer>): Promise<IComputer>;
  findUsers(computerId: number, scope: any): Promise<IComputerUser[]>;
}

export interface IMonitoringRepository {
  findActiveWindows(query: any, scope: any): Promise<IActiveWindow[]>;
  findVisitedSites(query: any, scope: any): Promise<IVisitedSite[]>;
  findScreenshots(query: any, scope: any): Promise<IScreenshot[]>;
  findUserSessions(query: any, scope: any): Promise<IUserSession[]>;
  createActiveWindow(data: Partial<IActiveWindow>): Promise<IActiveWindow>;
  createVisitedSite(data: Partial<IVisitedSite>): Promise<IVisitedSite>;
  createScreenshot(data: Partial<IScreenshot>): Promise<IScreenshot>;
  createUserSession(data: Partial<IUserSession>): Promise<IUserSession>;
  updateUserSession(id: number, data: Partial<IUserSession>): Promise<IUserSession>;
}

export interface IPolicyRepository {
  findAll(query: any, scope: any): Promise<IPolicy[]>;
  findById(id: number): Promise<IPolicy | null>;
  create(data: Partial<IPolicy>): Promise<IPolicy>;
  update(id: number, data: Partial<IPolicy>): Promise<IPolicy>;
  delete(id: number): Promise<void>;
  findEmployeePolicies(employeeId: number): Promise<IPolicy[]>;
  assignToEmployees(policyId: number, employeeIds: number[]): Promise<void>;
  removeFromEmployees(policyId: number, employeeIds: number[]): Promise<void>;
}

// Utility interfaces
export interface IActivityMetrics {
  totalActiveTime: number;
  productivityScore: number;
  applicationUsage: IApplicationUsage[];
  websiteUsage: IWebsiteUsage[];
}

export interface IApplicationUsage {
  processName: string;
  totalTime: number;
  percentage: number;
  category: 'productive' | 'neutral' | 'unproductive';
}

export interface IWebsiteUsage {
  domain: string;
  totalTime: number;
  percentage: number;
  category: 'productive' | 'neutral' | 'unproductive';
  visitCount: number;
}

export interface IDataScope {
  organizationId?: number;
  departmentId?: number;
  employeeIds?: number[];
}

export interface IUserContext {
  id: number;
  role: string;
  organizationId?: number;
  departmentId?: number;
  permissions: string[];
}