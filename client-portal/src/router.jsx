import React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { ClientLoginPage } from './features/auth/ClientLoginPage'
import { ClientPortal } from './features/portal/ClientPortal'
import { ClientProjects } from './features/portal/ClientProjects'
import { ClientInvoices } from './features/portal/ClientInvoices'
import { ClientFiles } from './features/portal/ClientFiles'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <ClientLoginPage />,
  },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/portal" replace /> },
      { path: 'portal', element: <ClientPortal /> },
      { path: 'portal/projects', element: <ClientProjects /> },
      { path: 'portal/invoices', element: <ClientInvoices /> },
      { path: 'portal/files', element: <ClientFiles /> },
    ],
  },
  { path: '*', element: <Navigate to="/portal" replace /> },
])
