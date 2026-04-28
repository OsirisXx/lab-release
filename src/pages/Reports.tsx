import { useState } from "react";
import { BarChart3, TrendingUp, Package, ArrowRightLeft, AlertTriangle, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { useInventory } from "@/hooks/useInventory";
import { useTransactions, isOverdue } from "@/hooks/useTransactions";
import { toast } from "sonner";
import * as XLSX from 'xlsx-js-style';

export default function Reports() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("weekly");
  const { items, loading: itemsLoading } = useInventory();
  const { transactions, loading: txLoading } = useTransactions();

  const handleExport = () => {
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      
      // Sort items by location alphabetically, then by name within each location
      const sortedItems = [...items].sort((a, b) => {
        const locationCompare = a.location.localeCompare(b.location);
        if (locationCompare !== 0) return locationCompare;
        return a.name.localeCompare(b.name);
      });

      // Calculate metrics
      const totalMaintainingStock = items.reduce((sum, item) => sum + item.maintaining_stock, 0);
      const totalAvailableStock = items.reduce((sum, item) => sum + item.stock_available, 0);
      const totalBorrowedItems = totalMaintainingStock - totalAvailableStock;

      // Sort transactions by date (most recent first)
      const sortedTransactions = [...transactions].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Filter low stock and out of stock items
      const lowStockItems = items.filter(item => item.stock_available > 0 && item.stock_available < 2);
      const outOfStockItems = items.filter(item => item.stock_available === 0);

      // Create workbook with single sheet containing all sections
      const wb = XLSX.utils.book_new();

      // Combine all data into one sheet with color-coded sections
      const allData = [
        // SUMMARY SECTION (Blue)
        ['SUMMARY REPORT', `Generated: ${new Date().toLocaleString()}`],
        [],
        ['Metric', 'Value'],
        ['Total Items', items.length],
        ['Maintaining Stock', totalMaintainingStock],
        ['Available Stock', totalAvailableStock],
        ['Borrowed Items', totalBorrowedItems],
        ['Active Borrows', transactions.filter(t => t.status === 'approved').length],
        ['Pending Requests', transactions.filter(t => t.status === 'pending').length],
        ['Completed Returns', transactions.filter(t => t.status === 'returned').length],
        ['Overdue Items', transactions.filter(isOverdue).length],
        ['Equipment Items', items.filter(i => i.category === 'non-consumable').length],
        ['Consumable Items', items.filter(i => i.category === 'consumable').length],
        [],
        [],
        // INVENTORY SECTION (Green)
        ['INVENTORY REPORT'],
        [],
        ['Item Code', 'Item Name', 'Category', 'Location', 'Maintaining Stock', 'Available', 'Borrowed', 'Active Borrow', 'Condition'],
        ...sortedItems.map(item => [
          item.item_code || 'N/A',
          item.name,
          item.category === 'consumable' ? 'Consumable' : 'Equipment',
          item.location,
          item.maintaining_stock,
          item.stock_available,
          item.maintaining_stock - item.stock_available,
          0,
          item.condition
        ]),
        [],
        [],
        // TRANSACTION SECTION (Orange)
        ['TRANSACTION REPORT'],
        [],
        ['Date', 'Time', 'User Name', 'CI ID', 'Item Name', 'Action', 'Quantity', 'Status'],
        ...sortedTransactions.map(tx => {
          const date = new Date(tx.created_at);
          return [
            date.toLocaleDateString(),
            date.toLocaleTimeString(),
            tx.user_profiles?.name || 'Unknown',
            tx.user_profiles?.ci_id || 'N/A',
            tx.inventory_items?.name || 'Unknown',
            tx.type === 'borrow' ? 'Borrow' : 'Return',
            tx.quantity,
            tx.status.charAt(0).toUpperCase() + tx.status.slice(1)
          ];
        }),
        [],
        [],
        // LOW STOCK SECTION (Yellow)
        ['LOW STOCK ITEMS (Available < 2)'],
        [],
        ['Item Code', 'Item Name', 'Location', 'Maintaining Stock', 'Available', 'Status'],
        ...lowStockItems.map(item => [
          item.item_code || 'N/A',
          item.name,
          item.location,
          item.maintaining_stock,
          item.stock_available,
          'Low Stock'
        ]),
        [],
        [],
        // OUT OF STOCK SECTION (Red)
        ['OUT OF STOCK ITEMS (Available = 0)'],
        [],
        ['Item Code', 'Item Name', 'Location', 'Maintaining Stock', 'Available', 'Status'],
        ...outOfStockItems.map(item => [
          item.item_code || 'N/A',
          item.name,
          item.location,
          item.maintaining_stock,
          item.stock_available,
          'Out of Stock'
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(allData);

      // Apply color highlights to section headers
      // Summary header (Blue) - Row 1
      ws['A1'].s = { fill: { fgColor: { rgb: "4472C4" } }, font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 } };
      ws['A3'].s = { fill: { fgColor: { rgb: "D9E1F2" } }, font: { bold: true } };
      ws['B3'].s = { fill: { fgColor: { rgb: "D9E1F2" } }, font: { bold: true } };

      // Inventory header (Green) - Calculate row number
      const inventoryHeaderRow = 16;
      ws[`A${inventoryHeaderRow}`].s = { fill: { fgColor: { rgb: "70AD47" } }, font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 } };
      const invHeaderCols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
      invHeaderCols.forEach(col => {
        const cell = `${col}${inventoryHeaderRow + 2}`;
        if (ws[cell]) ws[cell].s = { fill: { fgColor: { rgb: "E2EFDA" } }, font: { bold: true } };
      });

      // Transaction header (Orange)
      const transactionHeaderRow = inventoryHeaderRow + 3 + sortedItems.length + 2;
      ws[`A${transactionHeaderRow}`].s = { fill: { fgColor: { rgb: "FFC000" } }, font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 } };
      const txHeaderCols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      txHeaderCols.forEach(col => {
        const cell = `${col}${transactionHeaderRow + 2}`;
        if (ws[cell]) ws[cell].s = { fill: { fgColor: { rgb: "FFF2CC" } }, font: { bold: true } };
      });

      // Low Stock header (Yellow)
      const lowStockHeaderRow = transactionHeaderRow + 3 + sortedTransactions.length + 2;
      ws[`A${lowStockHeaderRow}`].s = { fill: { fgColor: { rgb: "FFC000" } }, font: { bold: true, color: { rgb: "000000" }, sz: 14 } };
      const lowStockCols = ['A', 'B', 'C', 'D', 'E', 'F'];
      lowStockCols.forEach(col => {
        const cell = `${col}${lowStockHeaderRow + 2}`;
        if (ws[cell]) ws[cell].s = { fill: { fgColor: { rgb: "FFF2CC" } }, font: { bold: true } };
      });

      // Out of Stock header (Red)
      const outOfStockHeaderRow = lowStockHeaderRow + 3 + lowStockItems.length + 2;
      ws[`A${outOfStockHeaderRow}`].s = { fill: { fgColor: { rgb: "C00000" } }, font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 } };
      const outOfStockCols = ['A', 'B', 'C', 'D', 'E', 'F'];
      outOfStockCols.forEach(col => {
        const cell = `${col}${outOfStockHeaderRow + 2}`;
        if (ws[cell]) ws[cell].s = { fill: { fgColor: { rgb: "FFE6E6" } }, font: { bold: true } };
      });

      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // Item Code
        { wch: 30 }, // Item Name / Metric
        { wch: 15 }, // Category / Value
        { wch: 20 }, // Location
        { wch: 18 }, // Maintaining Stock
        { wch: 12 }, // Available
        { wch: 12 }, // Borrowed
        { wch: 15 }, // Active Borrow
        { wch: 12 }  // Condition
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'NUF - CHS Inventory Report');

      // Write file
      XLSX.writeFile(wb, `NUF_CHS_Inventory_Report_${timestamp}.xlsx`);

      toast.success('Excel report exported with color-highlighted sections on single sheet!');
    } catch (error) {
      toast.error('Failed to export report');
      console.error('Export error:', error);
    }
  };

  if (itemsLoading || txLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalItems = items.length;
  const totalStock = items.reduce((sum, item) => sum + item.maintaining_stock, 0);
  const availableStock = items.reduce((sum, item) => sum + item.stock_available, 0);
  const borrowedItems = totalStock - availableStock;

  const activeBorrows = transactions.filter((t) => t.status === "approved").length;
  const completedReturns = transactions.filter((t) => t.status === "returned").length;
  const overdueItems = transactions.filter(isOverdue).length;
  const pendingRequests = transactions.filter((t) => t.status === "pending").length;

  const utilizationRate = totalStock > 0 ? ((borrowedItems / totalStock) * 100).toFixed(1) : "0";

  const topBorrowedItems = items
    .map((item) => ({
      ...item,
      borrowed: item.maintaining_stock - item.stock_available,
    }))
    .sort((a, b) => b.borrowed - a.borrowed)
    .slice(0, 5);

  const categoryBreakdown = {
    consumable: items.filter((i) => i.category === "consumable").length,
    nonConsumable: items.filter((i) => i.category === "non-consumable").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Inventory usage and transaction insights</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(["daily", "weekly", "monthly"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  period === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Items" value={totalItems} subtitle="Inventory count" icon={Package} variant="primary" delay={0} />
        <StatCard title="Active Borrows" value={activeBorrows} subtitle={`${utilizationRate}% utilization`} icon={ArrowRightLeft} delay={60} />
        <StatCard title="Completed Returns" value={completedReturns} icon={TrendingUp} delay={120} />
        <StatCard title="Overdue Items" value={overdueItems} icon={AlertTriangle} variant="destructive" delay={180} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-lg border animate-slide-up" style={{ animationDelay: "250ms", animationFillMode: "both" }}>
          <div className="p-5 border-b">
            <h2 className="font-semibold">Top Borrowed Items</h2>
            <p className="text-xs text-muted-foreground mt-1">Most frequently borrowed equipment</p>
          </div>
          <div className="p-5 space-y-4">
            {topBorrowedItems.map((item, idx) => {
              const pct = item.maintaining_stock > 0 ? (item.borrowed / item.maintaining_stock) * 100 : 0;
              return (
                <div key={item.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.location}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium tabular-nums">{item.borrowed}/{item.maintaining_stock}</p>
                      <p className="text-xs text-muted-foreground">{pct.toFixed(0)}% borrowed</p>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card rounded-lg border animate-slide-up" style={{ animationDelay: "320ms", animationFillMode: "both" }}>
            <div className="p-5 border-b">
              <h2 className="font-semibold">Inventory Summary</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Total Stock</span>
                  <span className="text-lg font-bold tabular-nums">{totalStock}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Available</span>
                  <span className="text-lg font-bold text-success tabular-nums">{availableStock}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Borrowed</span>
                  <span className="text-lg font-bold text-warning tabular-nums">{borrowedItems}</span>
                </div>
              </div>
              <div className="h-px bg-border" />
              <div>
                <p className="text-sm font-medium mb-3">Category Breakdown</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Equipment</span>
                    <span className="text-sm font-medium tabular-nums">{categoryBreakdown.nonConsumable}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Consumables</span>
                    <span className="text-sm font-medium tabular-nums">{categoryBreakdown.consumable}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border animate-slide-up" style={{ animationDelay: "380ms", animationFillMode: "both" }}>
            <div className="p-5 border-b">
              <h2 className="font-semibold">Transaction Status</h2>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="text-sm font-medium tabular-nums">{pendingRequests}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Active</span>
                <span className="text-sm font-medium tabular-nums">{activeBorrows}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Returned</span>
                <span className="text-sm font-medium tabular-nums">{completedReturns}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-destructive">Overdue</span>
                <span className="text-sm font-medium text-destructive tabular-nums">{overdueItems}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
