import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import AppRouter from "./AppRouter";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      // Không retry khi bị 401/403 vì retry không giải quyết được lỗi auth/permission
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        if (status === 403 || status === 401) return false;
        return failureCount < 1;
      },
      staleTime: 0,          // Data luôn stale → refetch mỗi lần mount
      gcTime: 5 * 60 * 1000, // Cache 5 phút trong memory để render nhanh trong khi fetch
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppRouter />
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
