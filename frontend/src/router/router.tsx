import { createBrowserRouter, Navigate } from "react-router-dom";

import App from "../App";
import AddNewTripPage from "../pages/AddNewTripPage";
import TripListPage from "../pages/TripListPage";
import TripDetailPage from "../pages/TripDetailPage";
import EditTripPage from "../pages/EditTripPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/trips" replace />,
      },
      {
        path: "trips",
        element: <TripListPage />,
      },
      {
        path: "trips/new",
        element: <AddNewTripPage />,
      },
      {
        path: "trips/:id",
        element: <TripDetailPage />,
      },
      {
        path: "/trips/:id/edit",
        element: <EditTripPage />,
      },
    ],
  },
]);
