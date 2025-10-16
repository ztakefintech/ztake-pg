import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { requirePermission } from '@/lib/admin-middleware'
import { eventStore } from '@/lib/event-store'
import { demoCallbackStore } from '@/lib/callback-store'
import { sendTelegramAdminAlert } from '@/lib/telegram'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const POST = requirePermission('manage_payin')(async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => ({}))
    const utr = (body?.utr || '').toString().trim()
    const vendorCode = (body?.vendor_code || '').toString().trim()
    const action = ((body?.action || 'approve') as string).toLowerCase()
    const amountNum = body?.amount != null ? Number(body.amount) : undefined

    if (!utr || !vendorCode) {
      return NextResponse.json({ error: 'utr and vendor_code are required' }, { status: 400 })
    }

    // Find vendor
    const vendor = await db.get(
      `SELECT id, vendor_code, business_name, contact_name, email FROM vendors WHERE vendor_code = ?`,
      [vendorCode]
    )
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Find order by UTR + vendor
    const order = await db.get(
      `SELECT ztake_order_id, merchant_order_id, amount, status, callback_url
       FROM orders WHERE utr = ? AND vendor_id = ?`,
      [utr, vendor.id]
    )
    if (!order) {
      return NextResponse.json({ error: 'Order not found for this vendor and UTR' }, { status: 404 })
    }

    if (action === 'reject') {
      await db.run(
        `UPDATE orders SET status = 'Failed', updated_at = CURRENT_TIMESTAMP WHERE ztake_order_id = ?`,
        [order.ztake_order_id]
      )

      // Emit event (websocket) and store demo callback
      const event = {
        id: `payment_status_changed_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        type: 'payment_status_changed',
        payload: {
          id: order.ztake_order_id,
          vendorId: vendor.id,
          businessName: vendor.business_name || `Vendor #${vendor.id}`,
          contactName: vendor.contact_name,
          email: vendor.email,
          utr,
          amount: order.amount,
          status: 'Failed',
          payment_status: 'Failed',
          timestamp: new Date().toISOString()
        },
        timestamp: new Date()
      }
      eventStore.emit(event)

      // Telegram alert (HTML)
      const rejectAlert = [
        '<b>🔔 Pay-in UTR Rejected</b>',
        `• Vendor: ${vendor.business_name || `Vendor #${vendor.id}`} (${vendor.vendor_code || '-'})`,
        `• Amount: ₹${order.amount}`,
        `• UTR: ${utr}`,
        `• Status: Failed`
      ].join('\n')
      sendTelegramAdminAlert(rejectAlert, vendor.id).catch(() => {})
      demoCallbackStore.append(`vendor-${vendor.vendor_code}`, {
        type: 'payment_status_changed',
        utr,
        amount: order.amount,
        status: 'Failed',
        timestamp: new Date().toISOString()
      })

      return NextResponse.json({ success: true, action: 'reject', orderId: order.ztake_order_id })
    }

    // Default: approve -> mark succeeded, optionally update amount
    if (amountNum != null && !Number.isNaN(amountNum) && amountNum > 0) {
      await db.run(
        `UPDATE orders SET amount = ?, updated_at = CURRENT_TIMESTAMP WHERE ztake_order_id = ?`,
        [amountNum, order.ztake_order_id]
      )
    }

    await db.run(
      `UPDATE orders SET status = 'Succeeded', payment_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE ztake_order_id = ?`,
      [order.ztake_order_id]
    )

    const finalOrder = await db.get(
      `SELECT ztake_order_id, amount, status FROM orders WHERE ztake_order_id = ?`,
      [order.ztake_order_id]
    )

    const event = {
      id: `payment_status_changed_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: 'payment_status_changed',
      payload: {
        id: order.ztake_order_id,
        vendorId: vendor.id,
        businessName: vendor.business_name || `Vendor #${vendor.id}`,
        contactName: vendor.contact_name,
        email: vendor.email,
        utr,
        amount: finalOrder?.amount ?? order.amount,
        status: 'Succeeded',
        payment_status: 'Succeeded',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    }
    eventStore.emit(event)

    // Telegram alert (HTML)
    const approveAlert = [
      '<b>🔔 Pay-in UTR Approved</b>',
      `• Vendor: ${vendor.business_name || `Vendor #${vendor.id}`} (${vendor.vendor_code || '-'})`,
      `• Amount: ₹${finalOrder?.amount ?? order.amount}`,
      `• UTR: ${utr}`,
      `• Status: Succeeded`
    ].join('\n')
    sendTelegramAdminAlert(approveAlert, vendor.id).catch(() => {})
    demoCallbackStore.append(`vendor-${vendor.vendor_code}`, {
      type: 'payment_status_changed',
      utr,
      amount: finalOrder?.amount ?? order.amount,
      status: 'Succeeded',
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({ success: true, action: 'approve', orderId: order.ztake_order_id })
  } catch (error) {
    console.error('Admin submit-utr error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
})

