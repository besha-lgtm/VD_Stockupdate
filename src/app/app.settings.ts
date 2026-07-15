export class AppSettings {
  public static readonly API_BASE_URL = 'http://localhost:3000/api';

  public static API = {
    users: AppSettings.API_BASE_URL + '/users',
    employees: AppSettings.API_BASE_URL + '/employees',
    departments: AppSettings.API_BASE_URL + '/departments',
    roles: AppSettings.API_BASE_URL + '/roles',

    projectStats: AppSettings.API_BASE_URL + '/project/project-stats',
    masterStats: AppSettings.API_BASE_URL + '/master/master-stats',
    customers: AppSettings.API_BASE_URL + '/master/customers',
    projects: AppSettings.API_BASE_URL + '/projects',

    dashboardStats: AppSettings.API_BASE_URL + '/admin/dashboard-stats'
  };
}

