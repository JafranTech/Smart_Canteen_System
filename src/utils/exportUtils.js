import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

// ─── Constants ────────────────────────────────────────────────
const CANTEEN_NAME  = 'Smart Canteen'
const BRAND_COLOR   = '#FB3640'
const BRAND_RGB     = [251, 54, 64]
const DARK_RGB      = [0, 15, 8]

// ─── Private Helpers ──────────────────────────────────────────

/** Maps a single order row → flat export row object */
function mapOrderRow(order) {
  const items = order.order_items
    ?.map((oi) => `${oi.quantity}x ${oi.menu_items?.name ?? 'Item'}`)
    .join(', ') ?? '—'

  return {
    'Order ID':      order.id.split('-')[0].toUpperCase(),
    'Student Name':  order.profiles?.name ?? 'Unknown',
    'College ID':    order.profiles?.college_id ?? '—',
    'Items Ordered': items,
    'Total Amount':  `₹${Number(order.total_amount).toFixed(2)}`,
    'Status':        order.status.charAt(0).toUpperCase() + order.status.slice(1),
    'Order Time':    format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a'),
  }
}

/** Aggregates order_items across all orders → item-wise summary */
function buildItemSummary(orders) {
  const map = {}
  for (const order of orders) {
    for (const oi of order.order_items ?? []) {
      const name = oi.menu_items?.name ?? 'Unknown Item'
      if (!map[name]) map[name] = { units: 0, revenue: 0 }
      map[name].units   += oi.quantity
      map[name].revenue += oi.quantity * Number(oi.unit_price ?? 0)
    }
  }
  return Object.entries(map)
    .sort((a, b) => b[1].units - a[1].units)
    .map(([name, { units, revenue }]) => ({
      'Item Name':   name,
      'Units Sold':  units,
      'Revenue':     `₹${revenue.toFixed(2)}`,
    }))
}

// ─── Excel Export ─────────────────────────────────────────────

/**
 * Generates and triggers download of an Excel workbook.
 * @param {Object[]} orders  - Array of orders with joined profiles + order_items
 * @param {string}   dateStr - Display date string e.g. "08 May 2026"
 * @param {string}   fileDate - File-safe date string e.g. "2026-05-08"
 */
export function exportToExcel(orders, dateStr, fileDate) {
  const wb = XLSX.utils.book_new()

  // Sheet 1 — Order Details
  const orderRows  = orders.map(mapOrderRow)
  const wsOrders   = XLSX.utils.json_to_sheet(orderRows)
  wsOrders['!cols'] = [
    { wch: 12 }, { wch: 22 }, { wch: 14 },
    { wch: 40 }, { wch: 14 }, { wch: 12 }, { wch: 22 },
  ]
  XLSX.utils.book_append_sheet(wb, wsOrders, 'Order Details')

  // Sheet 2 — Item-Wise Summary
  const summaryRows = buildItemSummary(orders)
  const wsSummary   = XLSX.utils.json_to_sheet(summaryRows)
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Item Summary')

  // Sheet 3 — Totals
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0)
  const totalSheet   = XLSX.utils.aoa_to_sheet([
    ['Report Date',      dateStr],
    ['Total Orders',     orders.length],
    ['Total Revenue',    `₹${totalRevenue.toFixed(2)}`],
    ['Exported At',      format(new Date(), 'dd MMM yyyy, hh:mm a')],
  ])
  XLSX.utils.book_append_sheet(wb, totalSheet, 'Summary')

  XLSX.writeFile(wb, `SmartCanteen_Orders_${fileDate}.xlsx`)
}

// ─── PDF Export ───────────────────────────────────────────────

/**
 * Generates and triggers download of an A4 PDF invoice report.
 * @param {Object[]} orders  - Array of orders with joined profiles + order_items
 * @param {string}   dateStr - Display date string e.g. "08 May 2026"
 * @param {string}   fileDate - File-safe date string e.g. "2026-05-08"
 */
export function exportToPDF(orders, dateStr, fileDate) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  // ── Header block ──────────────────────────────────────────
  doc.setFillColor(...BRAND_RGB)
  doc.rect(0, 0, pageW, 38, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text(CANTEEN_NAME, 14, 16)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Daily Sales Report', 14, 24)
  doc.text(`Date: ${dateStr}`, 14, 31)

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`, pageW - 14, 24, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`${orders.length} collected orders`, pageW - 14, 31, { align: 'right' })

  // ── Section 1: Order Details ──────────────────────────────
  doc.setTextColor(...DARK_RGB)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Order Details', 14, 50)

  const orderRows = orders.map((o) => [
    o.id.split('-')[0].toUpperCase(),
    o.profiles?.name ?? 'Unknown',
    o.profiles?.college_id ?? '—',
    o.order_items?.map((oi) => `${oi.quantity}x ${oi.menu_items?.name ?? 'Item'}`).join(', ') ?? '—',
    `₹${Number(o.total_amount).toFixed(2)}`,
    format(new Date(o.created_at), 'hh:mm a'),
  ])

  autoTable(doc, {
    startY: 55,
    head: [['Order ID', 'Student', 'College ID', 'Items', 'Amount', 'Time']],
    body: orderRows,
    headStyles: {
      fillColor: BRAND_RGB,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles:        { fontSize: 8, textColor: DARK_RGB },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 30 },
      2: { cellWidth: 22 },
      3: { cellWidth: 60 },
      4: { cellWidth: 22 },
      5: { cellWidth: 18 },
    },
    margin: { left: 14, right: 14 },
  })

  // ── Section 2: Item-Wise Summary ──────────────────────────
  const afterTable = doc.lastAutoTable.finalY + 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...DARK_RGB)
  doc.text('Item-Wise Sales Summary', 14, afterTable)

  const summaryRows = buildItemSummary(orders).map((r) => [
    r['Item Name'], r['Units Sold'], r['Revenue'],
  ])

  autoTable(doc, {
    startY: afterTable + 5,
    head: [['Item Name', 'Units Sold', 'Revenue']],
    body: summaryRows,
    headStyles: {
      fillColor: DARK_RGB,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles:        { fontSize: 9, textColor: DARK_RGB },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 14, right: 14 },
  })

  // ── Footer ────────────────────────────────────────────────
  const footerY = doc.lastAutoTable.finalY + 10
  doc.setDrawColor(220, 220, 220)
  doc.line(14, footerY, pageW - 14, footerY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(
    `Generated by ${CANTEEN_NAME} · ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`,
    pageW / 2, footerY + 6, { align: 'center' }
  )

  doc.save(`SmartCanteen_Report_${fileDate}.pdf`)
}
