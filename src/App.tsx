import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom"
import { AppLayout } from "@/components/layout/app-layout"
import { CalendarPage } from "@/pages/calendar-page"
import { ReservationsPage } from "@/pages/reservations-page"
import { PropertiesPage } from "@/pages/properties-page"
import { PropertyDetailPage } from "@/pages/property-detail-page"
import { ReservationDetailPage } from "@/pages/reservation-detail-page"
import { ReportsPage } from "@/pages/reports-page"
import { MaintenanceReportPage } from "@/pages/maintenance-report-page"
import { ExpensesReportPage } from "@/pages/expenses-report-page"
import { ProprietariosPage } from "@/pages/proprietarios-page"
import { ProprietarioDetailPage } from "@/pages/proprietario-detail-page"
import { FaxinaTerceirizadaPage } from "@/pages/faxina-terceirizada-page"
import { FaxinaPagamentosPage } from "@/pages/faxina-pagamentos-page"

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/calendario" replace /> },
      { path: "calendario", element: <CalendarPage /> },
      { path: "reservas", element: <ReservationsPage /> },
      { path: "reservas/:id", element: <ReservationDetailPage /> },
      { path: "propriedades", element: <PropertiesPage /> },
      { path: "propriedades/:id", element: <PropertyDetailPage /> },
      { path: "proprietarios", element: <ProprietariosPage /> },
      { path: "proprietarios/:id", element: <ProprietarioDetailPage /> },
      { path: "relatorios", element: <ReportsPage /> },
      { path: "relatorios/manutencoes", element: <MaintenanceReportPage /> },
      { path: "relatorios/despesas", element: <ExpensesReportPage /> },
      { path: "faxina-terceirizada", element: <FaxinaTerceirizadaPage /> },
      { path: "faxina-terceirizada/pagamentos", element: <FaxinaPagamentosPage /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
