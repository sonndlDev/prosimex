import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "../../services/order.service";
import GenericTable from "../../components/GenericTable";
import WarehouseDetailsDialog from "../orders/components/WarehouseDetailsDialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DateTime } from "luxon";
import { Pencil } from "lucide-react";
import { getAuditColumn } from "../../utils/audit";

export default function WarehousePage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  
  const [openWarehouseDialog, setOpenWarehouseDialog] = useState(false);
  const [warehouseOrder, setWarehouseOrder] = useState(null);

  const { data: ordersData, isLoading, error } = useQuery({
    queryKey: ["orders", page, pageSize, search],
    queryFn: () => orderService.getAll({ page, limit: pageSize, search })
  });

  const orders = ordersData?.data || [];
  const totalItems = ordersData?.total || 0;

  const columns = [
    { id: "po_auto_code", label: "Mã đơn hàng", className: "font-bold text-blue-600" },
    { id: "customer_name", label: "Tên khách", className: "font-medium" },
    {
      id: "expected_material_date",
      label: <p className="text-center">Ngày NL về xưởng <br /> (Dự kiến)</p>,
      format: (value, row) => row.expected_material_date ? DateTime.fromISO(row.expected_material_date).toFormat("dd/MM/yyyy") : "-"
    },
    {
      id: "actual_material_date",
      label: <p className="text-center">Ngày NL về xưởng <br /> (Thực tế)</p>,
      format: (value, row) => row.actual_material_date ? DateTime.fromISO(row.actual_material_date).toFormat("dd/MM/yyyy") : "-"
    },
    { id: "net_weight_text", label: "Net W", format: (value, row) => row.net_weight_text || "-" },
    { id: "package_count_text", label: "Số kiện", format: (value, row) => row.package_count_text || "-" },
    { id: "container_volume_text", label: "Khối lượng cont/ lẻ", format: (value, row) => row.container_volume_text || "-" },
    getAuditColumn(),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-zinc-950 tracking-tight">Thông tin Kho</h2>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Quản lý nhập liệu kho cho thông tin đơn hàng</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <GenericTable
          data={orders}
          columns={columns}
          isLoading={isLoading}
          error={error}
          isServerSide={true}
          totalItems={totalItems}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSearchChange={setSearch}
          renderActions={(row) => (
            <div className="flex items-center justify-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                      onClick={(e) => {
                        e.stopPropagation();
                        setWarehouseOrder(row);
                        setOpenWarehouseDialog(true);
                      }}
                      className="p-2 rounded-xl text-zinc-400 hover:text-indigo-600 hover:bg-white hover:shadow-md transition-all active:scale-95 border border-transparent hover:border-indigo-100"
                    >
                      <Pencil className="w-4 h-4" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-zinc-900 text-white border-none font-bold text-[10px]">Cập nhật thông tin kho</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        />
      </div>

      <WarehouseDetailsDialog 
        open={openWarehouseDialog} 
        onClose={() => setOpenWarehouseDialog(false)} 
        order={warehouseOrder} 
      />
    </div>
  );
}
