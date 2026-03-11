import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom"
import { AppLayout } from "@/components/layout/app-layout"
import { CalendarPage } from "@/pages/calendar-page"
import { ReservationsPage } from "@/pages/reservations-page"
import { PropertiesPage } from "@/pages/properties-page"
import { PropertyDetailPage } from "@/pages/property-detail-page"
import { ReportsPage } from "@/pages/reports-page"

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/calendario" replace /> },
      { path: "calendario", element: <CalendarPage /> },
      { path: "reservas", element: <ReservationsPage /> },
      { path: "propriedades", element: <PropertiesPage /> },
      { path: "propriedades/:id", element: <PropertyDetailPage /> },
      { path: "relatorios", element: <ReportsPage /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
