import { createBrowserRouter, Navigate } from "react-router-dom";

import App from "../App";
import AddNewTripPage from "../pages/AddNewTripPages";
import TripListPages from "../pages/TripListPages";

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
        element: <TripListPages />,
      },
      {
        path: "trips/new",
        element: <AddNewTripPage />,
      },
    ],
  },
]);
