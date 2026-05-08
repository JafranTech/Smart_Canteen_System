import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

// ─── Constants ────────────────────────────────────────────────
const CANTEEN_NAME   = 'Smart Canteen'
const BRAND_RGB      = [251, 54, 64]
const DARK_RGB       = [0, 15, 8]
const GRAY_RGB       = [100, 100, 100]
const LIGHT_GRAY_RGB = [245, 245, 245]

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
    'Total Amount':  `Rs. ${Number(order.total_amount).toFixed(2)}`,
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
      'Revenue':     `Rs. ${revenue.toFixed(2)}`,
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
    ['Total Revenue',    `Rs. ${totalRevenue.toFixed(2)}`],
    ['Exported At',      format(new Date(), 'dd MMM yyyy, hh:mm a')],
  ])
  XLSX.utils.book_append_sheet(wb, totalSheet, 'Summary')

  XLSX.writeFile(wb, `SmartCanteen_Orders_${fileDate}.xlsx`)
}

// ─── PDF Export ───────────────────────────────────────────────

/**
 * Generates and triggers download of a clean, structured A4 PDF report.
 * @param {Object[]} orders  - Array of orders with joined profiles + order_items
 * @param {string}   dateStr - Display date string e.g. "08 May 2026"
 * @param {string}   fileDate - File-safe date string e.g. "2026-05-08"
 */
export function exportToPDF(orders, dateStr, fileDate) {
  const doc   = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0)

  // ── Header: solid brand bar (logo row) ──────────────────────
  // Tall enough for branding only — keep it clean
  const HEADER_H = 28
  doc.setFillColor(...BRAND_RGB)
  doc.rect(0, 0, pageW, HEADER_H, 'F')

  // Left: canteen name
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(CANTEEN_NAME, 14, 13)

  // Left sub-label
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(255, 220, 220)
  doc.text('Sales Report', 14, 20)

  // Right: "OFFICIAL REPORT" badge label
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(255, 200, 200)
  doc.text('OFFICIAL REPORT', pageW - 14, 13, { align: 'right' })

  // Right sub: generated timestamp
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(255, 220, 220)
  doc.text(
    `Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`,
    pageW - 14, 20,
    { align: 'right' }
  )

  // ── Sub-header: info strip (white bg) ───────────────────────
  const STRIP_Y = HEADER_H
  const STRIP_H = 18
  doc.setFillColor(250, 250, 250)
  doc.rect(0, STRIP_Y, pageW, STRIP_H, 'F')
  doc.setDrawColor(230, 230, 230)
  doc.line(0, STRIP_Y + STRIP_H, pageW, STRIP_Y + STRIP_H)

  // Three info cells inside the strip
  const cells = [
    { label: 'PERIOD',         value: dateStr },
    { label: 'ORDERS',         value: `${orders.length} collected` },
    { label: 'TOTAL REVENUE',  value: `Rs. ${totalRevenue.toFixed(2)}` },
  ]
  const cellW = pageW / cells.length
  cells.forEach((cell, i) => {
    const cx = i * cellW + cellW / 2
    // Vertical divider (skip first)
    if (i > 0) {
      doc.setDrawColor(215, 215, 215)
      doc.line(i * cellW, STRIP_Y + 3, i * cellW, STRIP_Y + STRIP_H - 3)
    }
    // Label
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...GRAY_RGB)
    doc.text(cell.label, cx, STRIP_Y + 7, { align: 'center' })
    // Value
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...DARK_RGB)
    doc.text(cell.value, cx, STRIP_Y + 14, { align: 'center' })
  })

  // ── Section 1: Order Details ─────────────────────────────────
  const section1Y = STRIP_Y + STRIP_H + 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...DARK_RGB)
  doc.text('Order Details', 14, section1Y)

  // Thin accent line under section title
  doc.setDrawColor(...BRAND_RGB)
  doc.setLineWidth(0.5)
  doc.line(14, section1Y + 1.5, 50, section1Y + 1.5)
  doc.setLineWidth(0.2)

  const orderRows = orders.map((o) => [
    o.id.split('-')[0].toUpperCase(),
    o.profiles?.name ?? 'Unknown',
    o.profiles?.college_id ?? '—',
    o.order_items?.map((oi) => `${oi.quantity}x ${oi.menu_items?.name ?? 'Item'}`).join(', ') ?? '—',
    `Rs.${Number(o.total_amount).toFixed(2)}`,
    format(new Date(o.created_at), 'hh:mm a'),
  ])

  autoTable(doc, {
    startY: section1Y + 5,
    head: [['Order ID', 'Student', 'College ID', 'Items', 'Amount', 'Time']],
    body: orderRows,
    headStyles: {
      fillColor: DARK_RGB,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    bodyStyles:         { fontSize: 7.5, textColor: [40, 40, 40], cellPadding: 2.5 },
    alternateRowStyles: { fillColor: LIGHT_GRAY_RGB },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 32 },
      2: { cellWidth: 22 },
      3: { cellWidth: 55 },
      4: { cellWidth: 22 },
      5: { cellWidth: 18 },
    },
    margin:     { left: 14, right: 14 },
    tableWidth: 'auto',
  })

  // ── Section 2: Item-Wise Summary ─────────────────────────────
  const afterTable = doc.lastAutoTable.finalY + 12

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...DARK_RGB)
  doc.text('Item-Wise Sales Summary', 14, afterTable)

  doc.setDrawColor(...BRAND_RGB)
  doc.setLineWidth(0.5)
  doc.line(14, afterTable + 1.5, 70, afterTable + 1.5)
  doc.setLineWidth(0.2)

  const summaryRows = buildItemSummary(orders).map((r) => [
    r['Item Name'], r['Units Sold'], r['Revenue'],
  ])

  autoTable(doc, {
    startY: afterTable + 5,
    head: [['Item Name', 'Units Sold', 'Revenue']],
    body: summaryRows,
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    bodyStyles:         { fontSize: 8, textColor: [40, 40, 40], cellPadding: 2.5 },
    alternateRowStyles: { fillColor: LIGHT_GRAY_RGB },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
  })

  // ── Footer ────────────────────────────────────────────────────
  const footerY = doc.lastAutoTable.finalY + 10
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(14, footerY, pageW - 14, footerY)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(160, 160, 160)
  doc.text(
    `${CANTEEN_NAME} · Confidential · For internal use only`,
    pageW / 2, footerY + 5,
    { align: 'center' }
  )

  doc.save(`SmartCanteen_Report_${fileDate}.pdf`)
}
