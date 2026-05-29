import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { routes } from "./App";
import { ConfirmProvider } from "./components/ConfirmDialog";
import "./styles.css";

const qc = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });

const router = createBrowserRouter(routes, {
  basename: import.meta.env.BASE_URL.replace(/\/$/, "") || "/",
  future: { v7_relativeSplatPath: true },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <ConfirmProvider>
        <Toaster position="top-right" />
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </ConfirmProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
