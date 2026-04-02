import React from "react";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "../../../services/order.service";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CompletionPercentageCell({ orderId, onClick }) {
  const { data: response, isLoading } = useQuery({
    queryKey: ["order-completion", orderId],
    queryFn: () => orderService.getCompletionReport(orderId),
  });

  if (isLoading) {
    return <Loader2 className="w-4 h-4 animate-spin text-zinc-400 mx-auto" />;
  }

  const rows = response?.data || [];
  
  if (rows.length === 0) {
    return <span className="text-zinc-400 font-medium">-</span>;
  }

  // Calculate overall completion
  const totalRequired = rows.reduce((sum, r) => sum + (parseFloat(r.required_quantity) || 0), 0);
  const totalDone = rows.reduce((sum, r) => {
      const sx = parseFloat(r.sx_quantity) || 0;
      const platingOut = parseFloat(r.plating_out_quantity) || 0;
      const packagingOut = parseFloat(r.packaging_out_quantity) || 0;
      return sum + (sx + platingOut + packagingOut);
  }, 0);

  let overallPercentage = 0;
  if (totalRequired > 0) {
      overallPercentage = (totalDone / totalRequired) * 100;
  }

  return (
    <div 
        className="flex justify-center items-center h-full w-full cursor-pointer hover:opacity-80 transition-opacity" 
        onClick={(e) => {
            e.stopPropagation();
            onClick();
        }}
    >
      <Badge variant={overallPercentage >= 100 ? "success" : overallPercentage > 0 ? "warning" : "outline"} className="font-black tabular-nums border-zinc-200 shadow-sm cursor-pointer hover:bg-zinc-100">
        {overallPercentage.toFixed(0)}%
      </Badge>
    </div>
  );
}
