import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom"
import { AppLayout } from "@/components/layout/app-layout"
import { CalendarPage } from "@/pages/calendar-page"
import { ReservationsPage } from "@/pages/reservations-page"
import { PropertiesPage } from "@/pages/properties-page"
import { PropertyDetailPage } from "@/pages/property-detail-page"
import { ReservationDetailPage } from "@/pages/reservation-detail-page"
import { ReportsPage } from "@/pages/reports-page"
import { MaintenanceReportPage } from "@/pages/maintenance-report-page"

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
      { path: "relatorios", element: <ReportsPage /> },
      { path: "relatorios/manutencoes", element: <MaintenanceReportPage /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
