import React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { EmployeeLoginPage } from './features/auth/EmployeeLoginPage'
import { EmployeeDashboard } from './features/dashboard/EmployeeDashboard'
import { ProjectList } from './features/projects/ProjectList'
import { TaskBoard } from './features/projects/TaskBoard'
import { TimeTracker } from './features/projects/TimeTracker'
import { EmployeeList } from './features/team/EmployeeList'
import { AttendancePage } from './features/team/AttendancePage'
import { LeaveManagement } from './features/team/LeaveManagement'
import { KnowledgeBase } from './features/knowledge/KnowledgeBase'
import { EmployeeProfile } from './features/profile/EmployeeProfile'
import { WellnessSettings } from './features/wellness/WellnessSettings'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <EmployeeLoginPage />,
  },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <EmployeeDashboard /> },

      // Projects Sub-routes & Aliases
      { path: 'projects', element: <Navigate to="/projects/list" replace /> },
      { path: 'projects/list', element: <ProjectList /> },
      { path: 'projects/tasks', element: <TaskBoard /> },
      { path: 'projects/time', element: <TimeTracker /> },
      { path: 'tasks', element: <TaskBoard /> },
      { path: 'time', element: <TimeTracker /> },

      // Team Sub-routes & Aliases
      { path: 'team', element: <Navigate to="/team/employees" replace /> },
      { path: 'team/employees', element: <EmployeeList /> },
      { path: 'team/attendance', element: <AttendancePage /> },
      { path: 'team/leave', element: <LeaveManagement /> },
      { path: 'directory', element: <EmployeeList /> },
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'leave', element: <LeaveManagement /> },

      // Knowledge Base
      { path: 'knowledge/*', element: <KnowledgeBase /> },

      // Wellness
      { path: 'wellness', element: <WellnessSettings /> },

      // Profile
      { path: 'profile', element: <EmployeeProfile /> },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])

