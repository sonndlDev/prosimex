import React from "react";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "../../../services/order.service";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function CompletionPercentageCell({ orderId, onClick }) {
  const { data: response, isLoading } = useQuery({
    queryKey: ["order-completion", orderId],
    queryFn: () => orderService.getCompletionReport(orderId),
  });

  if (isLoading) {
    return <Loader2 className="w-4 h-4 animate-spin text-zinc-400 mx-auto" />;
  }

  const rows = response?.data || [];
  const overallPercentage = response?.overall_completion_percentage || 0;

  if (rows.length === 0) {
    return <span className="text-zinc-400 font-medium">-</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
              className="flex justify-center items-center h-full w-full cursor-pointer hover:opacity-80 transition-opacity" 
              onClick={(e) => {
                  e.stopPropagation();
                  onClick();
              }}
          >
            <Badge variant={overallPercentage >= 100 ? "success" : overallPercentage > 0 ? "warning" : "outline"} className="font-black tabular-nums border-zinc-200 shadow-sm cursor-pointer hover:bg-zinc-100">
              {overallPercentage.toFixed(2)}%
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-zinc-900 text-white border-none font-bold text-[10px]">
          <p>Xem báo cáo chi tiết</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
