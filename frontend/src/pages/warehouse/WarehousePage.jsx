import React, { useState, useCallback, memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { orderService } from "../../services/order.service";
import GenericTable from "../../components/GenericTable";
import WarehouseDetailsDialog from "../orders/components/WarehouseDetailsDialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DateTime } from "luxon";
import { Pencil, Search, X } from "lucide-react";
import { getAuditColumn } from "../../utils/audit";
import { Input } from "@/components/ui/input";
import { useAuth } from "../../context/AuthContext";


export default function WarehousePage() {
  const [page, setPage] = useState(1);
  const { hasPermission } = useAuth();
  const [pageSize, setPageSize] = useState(10);

  const [tempSearch, setTempSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const handleSearch = useCallback((val) => {
    setPage(1);
    setAppliedSearch(val);
  }, []);

  const handleReset = useCallback(() => {
    setPage(1);
    setTempSearch("");
    setAppliedSearch("");
  }, []);


  const [openWarehouseDialog, setOpenWarehouseDialog] = useState(false);
  const [warehouseOrder, setWarehouseOrder] = useState(null);

  const { data: ordersData, isLoading, error } = useQuery({
    queryKey: ["orders", page, pageSize, appliedSearch],
    queryFn: () => orderService.getAll({ page, limit: pageSize, search: appliedSearch })
  });


  const orders = ordersData?.data || [];
  const totalItems = ordersData?.total || 0;

  const columns = [
    { id: "po_customer", label: "PO KH", className: "font-bold text-blue-600" },
    { id: "name", label: "Tên đơn hàng", className: "font-medium" },
    {
      id: "expected_material_date",
      label: <p className="text-center">Ngày NL về xưởng <br /> (Dự kiến)</p>,
      format: (value, row) => row.expected_material_date ? DateTime.fromISO(row.expected_material_date).toFormat("dd/MM/yyyy") : "-"
    },
    {
      id: "actual_material_date",
      label: <p className="text-center">ngày gửi BK</p>,
      format: (value, row) => row.actual_material_date ? DateTime.fromISO(row.actual_material_date).toFormat("dd/MM/yyyy") : "-"
    },
    { id: "net_weight_text", label: "Net W", format: (value, row) => row.net_weight_text || "-" },
    { id: "package_count_text", label: "Số kiện", format: (value, row) => row.package_count_text || "-" },
    { id: "container_volume_text", label: "Khối lượng cont/ lẻ", format: (value, row) => row.container_volume_text || "-" },
    getAuditColumn(),
  ];

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col overflow-hidden gap-4">
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex-shrink-0">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black text-zinc-950 tracking-tight">Thông tin Kho</h2>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-1">Quản lý nhập liệu kho cho thông tin đơn hàng</p>
        </div>
      </div>

      <div className="flex-shrink-0">
        <WarehouseFilterBar
          value={tempSearch}
          onChange={setTempSearch}
          onSearch={() => handleSearch(tempSearch)}
          onReset={handleReset}
        />
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
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
          maxHeight="100%"

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

const WarehouseFilterBar = memo(({ value, onChange, onSearch, onReset }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
      <form className="flex flex-wrap gap-4 items-end" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1.5 flex-1 min-w-[300px]">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Tìm kiếm chi tiết</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <Input
              placeholder="Mã đơn hàng, tên khách hàng..."
              value={value}
              onChange={e => onChange(e.target.value)}
              className="pl-9 h-9 text-xs font-bold border-zinc-200 rounded-xl"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            className="h-9 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-indigo-100 gap-2"
          >
            <Search className="w-3.5 h-3.5" /> Tìm kiếm
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-9 px-4 text-zinc-400 hover:text-red-500 font-bold gap-2 rounded-xl"
          >
            <X className="w-4 h-4" /> Reset
          </Button>
        </div>
      </form>
    </div>
  );
});

