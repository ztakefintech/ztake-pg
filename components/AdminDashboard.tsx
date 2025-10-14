'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { FiWifi, FiWifiOff } from 'react-icons/fi';
import { useAdminWebSocket } from '@/hooks/use-websocket';
import { toast } from '@/hooks/use-toast';

interface Stats {
  totalUsers: number;
  totalPayments: number;
  totalReceivedOrdersAmount?: number;
  paymentStatusBreakdown: Array<{
    payment_status: string;
    count: number;
    total_amount: number;
  }>;
  recentPayments: Array<{
    utr: string;
    amount: number;
    payment_status: string;
    created_at: string;
    business_name: string;
  }>;
  topVendors: Array<{
    business_name: string;
    contact_name: string;
    email: string;
    payment_count: number;
    total_amount: number;
  }>;
  dailyTrends: Array<{
    date: string;
    payment_count: number;
    total_amount: number;
  }>;
}

interface User {
  id: number;
  email: string;
  business_name: string;
  contact_name: string;
  phone: string;
  upi_id: string;
  website?: string;
  payout_balance?: number;
  payout_recharge_bank_name?: string | null;
  payout_recharge_account_number?: string | null;
  payout_recharge_account_holder?: string | null;
  payout_recharge_ifsc?: string | null;
  is_approved?: boolean;
  kyc_status?: 'pending' | 'verified' | 'rejected';
  google_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: Record<string, boolean>;
  is_active: boolean;
  created_at: string;
  created_by?: number;
}

interface Permission {
  name: string;
  description: string;
  category: string;
}

interface Payment {
  id: number;
  utr: string;
  amount: number;
  payment_status: string;
  checked_status: boolean;
  checked_at: string | null;
  created_at: string;
  updated_at: string;
  business_name: string;
  contact_name: string;
  email: string;
  upi_id: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<Array<{
    id: number;
    vendor_id: number;
    business_name?: string;
    amount: number;
    currency: string;
    beneficiary_name?: string | null;
    beneficiary_account?: string | null;
    beneficiary_ifsc?: string | null;
    beneficiary_upi?: string | null;
    reference_id?: string | null;
    remarks?: string | null;
    status: string;
    cashfree_payout_id?: string | null;
    admin_notes?: string | null;
    created_at: string;
  }>>([]);
  const [settlements, setSettlements] = useState<Array<{
    id: number;
    vendor_id: number;
    business_name?: string;
    amount: number;
    status: string;
    admin_notes?: string | null;
    created_at: string;
  }>>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<Record<string, Permission>>({});
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // WebSocket connection for real-time updates
  const ws = useAdminWebSocket({
    onEvent: (event) => {
      console.log('Admin received WebSocket event:', event);
      
      // Show toast notification for important events
      if (event.type !== 'heartbeat') {
        const message = getEventMessage(event);
        const variant = getEventNotificationType(event.type);
        
        toast({
          title: "Live Update",
          description: message,
          variant: variant,
          duration: 5000,
        });
      }
      
      // Handle specific event types
      if (event.type === 'recharge_created' || event.type === 'recharge_status_changed') {
        // Refresh recharge requests
        window.dispatchEvent(new CustomEvent('rechargeEvent', { 
          detail: { type: event.type } 
        }));
      }
      
      if (event.type === 'payment_status_changed') {
        // Refresh payment data
        window.dispatchEvent(new CustomEvent('paymentEvent', { 
          detail: { type: event.type } 
        }));
      }
      
      if (event.type === 'settlement_status_changed') {
        // Refresh settlement data
        window.dispatchEvent(new CustomEvent('settlementEvent', { 
          detail: { type: event.type } 
        }));
      }
      
      if (event.type === 'payout_status_changed') {
        // Refresh payout data
        window.dispatchEvent(new CustomEvent('payoutEvent', { 
          detail: { type: event.type } 
        }));
      }
    },
    onConnect: () => {
      console.log('Admin WebSocket connected');
      toast({
        title: "Connection Established",
        description: "Live updates are now active",
        variant: "default",
        duration: 3000,
      });
    },
    onDisconnect: () => {
      console.log('Admin WebSocket disconnected');
    },
    onError: (error) => {
      console.error('Admin WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to maintain live connection",
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  // Helper functions for event handling
  const getEventMessage = (event: any) => {
    switch (event.type) {
      case 'recharge_created':
        return `New recharge request from ${event.payload.businessName} for ₹${event.payload.amount}`;
      case 'recharge_status_changed':
        return `Recharge request ${event.payload.id} status changed to ${getStatusText(event.payload.status)}`;
      case 'payment_status_changed':
        return `Payment ${event.payload.utr} status changed to ${getStatusText(event.payload.payment_status)}`;
      case 'settlement_status_changed':
        return `Settlement request ${event.payload.id} status changed to ${getStatusText(event.payload.status)}`;
      case 'payout_status_changed':
        return `Payout request ${event.payload.id} status changed to ${getStatusText(event.payload.status)}`;
      default:
        return `New ${event.type} event`;
    }
  };

  const getEventNotificationType = (eventType: string): 'default' | 'destructive' => {
    if (eventType.includes('rejected') || eventType.includes('failed') || eventType.includes('error')) {
      return 'destructive';
    }
    return 'default';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      // Recharge statuses
      case 'paid':
        return 'Success';
      case 'approved':
        return 'Success';
      case 'rejected':
        return 'Failed';
      case 'created':
        return 'Pending';
      
      // Payment statuses
      case 'Succeeded':
        return 'Success';
      case 'Failed':
        return 'Failed';
      case 'Pending':
        return 'Pending';
      
      // Settlement statuses
      case 'pending':
        return 'Pending';
      
      default:
        return 'Pending';
    }
  };

  // UTR approvals
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>('created');
  const [updatingPayoutId, setUpdatingPayoutId] = useState<number | null>(null);
  // Edit recharge details
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editBankName, setEditBankName] = useState('');
  const [editAccountHolder, setEditAccountHolder] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editIfsc, setEditIfsc] = useState('');
  const [savingUser, setSavingUser] = useState(false);
  // Admin management
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('view_only');
  const [newAdminPermissions, setNewAdminPermissions] = useState<Record<string, boolean>>({});
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  // Permission management
  const [editingPermissions, setEditingPermissions] = useState<number | null>(null);
  const [tempPermissions, setTempPermissions] = useState<Record<string, boolean>>({});
  // Vendor assignment management
  const [editingVendorAssignments, setEditingVendorAssignments] = useState<number | null>(null);
  const [allVendors, setAllVendors] = useState<Array<{id: number; business_name: string; contact_name: string; email: string}>>([]);
  const [assignedVendors, setAssignedVendors] = useState<number[]>([]);
  const [loadingVendorAssignments, setLoadingVendorAssignments] = useState(false);

  function PendingUtrList({ onApprove }: { onApprove: (p: { id?: number; utr: string; amount: number; vendor_code: string }) => Promise<void> }) {
    const [rows, setRows] = useState<Array<{ id?: number; utr: string; amount: number; vendor_id: number; vendor_code: string; business_name?: string; created_at: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const load = async () => {
      setLoading(true);
      setErr(null);
      try {
        const query = new URLSearchParams({ status: 'Pending', limit: '50', with_utr: '1' });
        const res = await fetch(`/api/admin/orders?${query.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed');
        const mapped = ((json.data && json.data.orders) || []).map((o: any) => ({
          utr: o.utr,
          amount: Number(o.amount),
          vendor_id: Number(o.vendor_id || 0),
          vendor_code: o.vendor_code || '',
          business_name: o.customer_name,
          created_at: o.created_at
        })).filter((r: any) => r.utr && r.vendor_code);
        setRows(mapped);
      } catch (e: any) {
        setErr(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => { load(); }, []);

    return (
      <div className="border rounded-md">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="font-medium">Pending ({rows.length})</div>
          <button onClick={load} className="text-sm text-indigo-600 hover:underline">Refresh</button>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Loading...</div>
        ) : err ? (
          <div className="p-4 text-sm text-red-600">{err}</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No pending UTRs</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">UTR</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor Code</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-sm font-mono">{r.utr}</td>
                    <td className="px-4 py-2 text-sm">{r.business_name}</td>
                    <td className="px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">₹</span>
                        <input
                          value={String(r.amount)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRows((prev) => prev.map((row) => row.utr === r.utr ? { ...row, amount: Number(val) || 0 } : row));
                          }}
                          className="w-28 border rounded-md px-2 py-1"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm font-mono">{r.vendor_code}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={async () => {
                          try {
                            await onApprove(r);
                            await load();
                            alert('Approved and resubmitted');
                          } catch (e: any) {
                            alert(e.message || 'Approve failed');
                          }
                        }}
                        className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md"
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  useEffect(() => {
    loadData();
    loadCurrentAdmin();
  }, []);

  const loadCurrentAdmin = async () => {
    try {
      const res = await fetch('/api/admin/me');
      if (res.ok) {
        const adminData = await res.json();
        setCurrentAdmin(adminData.admin);
      }
    } catch (error) {
      console.error('Failed to load current admin:', error);
    }
  };

  const refreshCurrentAdmin = async () => {
    await loadCurrentAdmin();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, paymentsRes, adminUsersRes, permissionsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/payments'),
        fetch('/api/admin/admins'),
        fetch('/api/admin/permissions')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      }

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData.payments);
      }

      if (adminUsersRes.ok) {
        const adminUsersData = await adminUsersRes.json();
        setAdminUsers(adminUsersData.admins);
      }

      if (permissionsRes.ok) {
        const permissionsData = await permissionsRes.json();
        setAvailablePermissions(permissionsData.permissions);
      }

      // Also load payouts with default filter
      await loadPayouts(payoutStatusFilter);
      // Load settlements
      await loadSettlements();
    } catch (error) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadPayouts = async (status?: string) => {
    try {
      const query = new URLSearchParams();
      if (status && status.trim()) query.set('status', status.trim());
      const res = await fetch(`/api/admin/payouts?${query.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch payouts');
      setPayouts((json.data && json.data.payouts) || []);
    } catch (e) {
      // best-effort error surface via alert in UI controls
    }
  };

  const loadSettlements = async () => {
    try {
      const res = await fetch('/api/admin/settlements');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch settlements');
      setSettlements(json.settlements || []);
    } catch (e) {
      // best-effort error surface via alert in UI controls
    }
  };

  const updatePayoutStatus = async (id: number, status: string, adminNotes?: string) => {
    setUpdatingPayoutId(id);
    // Guard against invalid transitions based on current local status
    setPayouts(prev => {
      const current = prev.find(p => p.id === id);
      if (current) {
        const canApprove = current.status === 'created';
        const canReject = current.status === 'created';
        const canMarkPaid = current.status === 'approved' || current.status === 'created';
        if ((status === 'approved' && !canApprove) ||
            (status === 'rejected' && !canReject) ||
            (status === 'paid' && !canMarkPaid)) {
          return prev; // ignore invalid click
        }
      }
      // Optimistically update UI to immediately disable buttons for this row
      return prev.map(p => (p.id === id ? { ...p, status, admin_notes: adminNotes } : p));
    });
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, admin_notes: adminNotes })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      // Sync local row with server response if present
      if (json?.data?.payout) {
        const srv = json.data.payout;
        setPayouts(prev => prev.map(p => (p.id === srv.id ? { ...p, status: srv.status, admin_notes: srv.admin_notes } : p)));
      }
      await loadPayouts(payoutStatusFilter);
    } catch (e: any) {
      alert(e.message || 'Failed to update payout');
      // Revert optimistic change on error
      await loadPayouts(payoutStatusFilter);
    } finally {
      setUpdatingPayoutId(null);
    }
  };

  const updateSettlementStatus = async (id: number, status: string, adminNotes?: string) => {
    try {
      const res = await fetch('/api/admin/settlements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, admin_notes: adminNotes })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      await loadSettlements();
      alert(`Settlement ${status} successfully`);
    } catch (e: any) {
      alert(e.message || 'Failed to update settlement');
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This will also delete all their payments.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUsers(users.filter(user => user.id !== userId));
        setPayments(payments.filter(payment => payment.id !== userId));
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete user');
      }
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  const approveUser = async (userId: number) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, is_approved: true })
      });

      if (response.ok) {
        // Update local state
        setUsers(users.map(user => 
          user.id === userId ? { ...user, is_approved: true } : user
        ));
        alert('User approved successfully!');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to approve user');
      }
    } catch (error) {
      alert('Failed to approve user');
    }
  };

  const rejectUser = async (userId: number) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, is_approved: false })
      });

      if (response.ok) {
        // Update local state
        setUsers(users.map(user => 
          user.id === userId ? { ...user, is_approved: false } : user
        ));
        alert('User rejected successfully!');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to reject user');
      }
    } catch (error) {
      alert('Failed to reject user');
    }
  };

  const openEditRecharge = (u: User) => {
    setEditUserId(u.id);
    setEditBankName(u.payout_recharge_bank_name || '');
    setEditAccountHolder(u.payout_recharge_account_holder || '');
    setEditAccountNumber(u.payout_recharge_account_number || '');
    setEditIfsc(u.payout_recharge_ifsc || '');
  };

  const saveRechargeDetails = async () => {
    if (!editUserId) return;
    setSavingUser(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editUserId,
          payout_recharge_bank_name: editBankName || null,
          payout_recharge_account_number: editAccountNumber || null,
          payout_recharge_account_holder: editAccountHolder || null,
          payout_recharge_ifsc: editIfsc || null,
        })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Failed to save');
      // reload users
      const usersRes = await fetch('/api/admin/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      }
      setEditUserId(null);
    } catch (e: any) {
      alert(e.message || 'Save failed');
    } finally {
      setSavingUser(false);
    }
  };

  const createAdminUser = async () => {
    if (!newAdminEmail || !newAdminPassword || !newAdminName) {
      alert('Please fill in all fields');
      return;
    }

    setCreatingAdmin(true);
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newAdminEmail,
          password: newAdminPassword,
          name: newAdminName,
          role: newAdminRole,
          permissions: newAdminRole === 'custom' ? newAdminPermissions : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create admin');

      // Reset form
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminName('');
      setNewAdminRole('view_only');
      setNewAdminPermissions({});
      setShowCreateAdmin(false);

      // Reload admin users
      const adminUsersRes = await fetch('/api/admin/admins');
      if (adminUsersRes.ok) {
        const adminUsersData = await adminUsersRes.json();
        setAdminUsers(adminUsersData.admins);
      }

      alert('Admin user created successfully');
    } catch (e: any) {
      alert(e.message || 'Failed to create admin');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const updateAdminUser = async (id: number, updates: Partial<AdminUser>) => {
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update admin');

      // Reload admin users
      const adminUsersRes = await fetch('/api/admin/admins');
      if (adminUsersRes.ok) {
        const adminUsersData = await adminUsersRes.json();
        setAdminUsers(adminUsersData.admins);
        
        // If we're updating the current admin, update currentAdmin state too
        if (currentAdmin && currentAdmin.id === id) {
          const updatedAdmin = adminUsersData.admins.find((admin: AdminUser) => admin.id === id);
          if (updatedAdmin) {
            setCurrentAdmin(updatedAdmin);
          }
        }
      }

      alert('Admin user updated successfully');
    } catch (e: any) {
      alert(e.message || 'Failed to update admin');
    }
  };

  const deleteAdminUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this admin user?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/admins?id=${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete admin');

      // Reload admin users
      const adminUsersRes = await fetch('/api/admin/admins');
      if (adminUsersRes.ok) {
        const adminUsersData = await adminUsersRes.json();
        setAdminUsers(adminUsersData.admins);
      }

      alert('Admin user deleted successfully');
    } catch (e: any) {
      alert(e.message || 'Failed to delete admin');
    }
  };

  const openPermissionEditor = (admin: AdminUser) => {
    setEditingPermissions(admin.id);
    
    // Wait for availablePermissions to be loaded if not already
    if (Object.keys(availablePermissions).length === 0) {
      // If permissions not loaded yet, load them first
      loadData().then(() => {
        // Retry opening the editor after permissions are loaded
        setTimeout(() => openPermissionEditor(admin), 100);
      });
      return;
    }
    
    // Ensure admin has permissions property, default to empty object if undefined
    const adminPermissions = admin.permissions || {};
    
    // For superuser, show all permissions as checked
    if (admin.role === 'superuser') {
      const allPermissions: Record<string, boolean> = {};
      Object.keys(availablePermissions).forEach(perm => {
        allPermissions[perm] = true;
      });
      setTempPermissions(allPermissions);
    } else {
      // Ensure we have all available permissions, with admin's current permissions as defaults
      const permissions: Record<string, boolean> = {};
      Object.keys(availablePermissions).forEach(perm => {
        permissions[perm] = adminPermissions[perm] === true;
      });
      setTempPermissions(permissions);
    }
  };

  const savePermissions = async () => {
    if (editingPermissions === null) return;

    try {
      await updateAdminUser(editingPermissions, { permissions: tempPermissions });
      
      // If we updated the current admin's permissions, refresh the current admin data
      if (currentAdmin && currentAdmin.id === editingPermissions) {
        await refreshCurrentAdmin();
      }
      
      setEditingPermissions(null);
      setTempPermissions({});
    } catch (e: any) {
      alert(e.message || 'Failed to update permissions');
    }
  };

  const togglePermission = (permission: string) => {
    setTempPermissions(prev => ({
      ...prev,
      [permission]: !prev[permission]
    }));
  };

  const getPermissionGroups = () => {
    const groups: Record<string, string[]> = {};
    Object.entries(availablePermissions).forEach(([key, perm]) => {
      if (!groups[perm.category]) {
        groups[perm.category] = [];
      }
      groups[perm.category].push(key);
    });
    return groups;
  };

  // Vendor assignment functions
  const openVendorAssignmentEditor = async (admin: AdminUser) => {
    setEditingVendorAssignments(admin.id);
    setLoadingVendorAssignments(true);
    
    try {
      const res = await fetch(`/api/admin/vendor-assignments?admin_id=${admin.id}`);
      const data = await res.json();
      
      if (res.ok) {
        setAllVendors(data.allVendors || []);
        setAssignedVendors(data.assignedVendors?.map((v: any) => v.vendor_id) || []);
      } else {
        alert(data.error || 'Failed to load vendor assignments');
      }
    } catch (error) {
      alert('Failed to load vendor assignments');
    } finally {
      setLoadingVendorAssignments(false);
    }
  };

  const saveVendorAssignments = async () => {
    if (editingVendorAssignments === null) return;

    try {
      const res = await fetch('/api/admin/vendor-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: editingVendorAssignments,
          vendor_ids: assignedVendors
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update vendor assignments');

      setEditingVendorAssignments(null);
      setAssignedVendors([]);
      setAllVendors([]);
      alert('Vendor assignments updated successfully');
    } catch (error: any) {
      alert(error.message || 'Failed to update vendor assignments');
    }
  };

  const toggleVendorAssignment = (vendorId: number) => {
    setAssignedVendors(prev => 
      prev.includes(vendorId) 
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  // Helper function to check if current admin has permission
  const hasPermission = (permission: string): boolean => {
    if (!currentAdmin) return false;
    if (currentAdmin.role === 'superuser') return true;
    return currentAdmin.permissions[permission] === true;
  };

  // Get available tabs based on permissions
  const getAvailableTabs = () => {
    return [
      ...(hasPermission('view_overview') ? [{ id: 'overview', name: 'Overview' }] : []),
      ...(hasPermission('view_users') ? [{ id: 'users', name: 'Users' }] : []),
      ...(hasPermission('view_payments') ? [{ id: 'payments', name: 'Payments' }] : []),
      ...(hasPermission('manage_payin') ? [{ id: 'utrSubmit', name: 'UTR Submit' }] : []),
      ...(hasPermission('view_payouts') ? [{ id: 'payouts', name: 'Payouts' }] : []),
      ...(hasPermission('view_settlements') ? [{ id: 'settlements', name: 'Settlements' }] : []),
      ...(hasPermission('manage_admins') ? [{ id: 'admins', name: 'Admin Users' }] : [])
    ];
  };

  // Redirect to first available tab if current tab is not accessible
  useEffect(() => {
    if (currentAdmin) {
      const availableTabs = getAvailableTabs();
      if (availableTabs.length > 0 && !availableTabs.some(tab => tab.id === activeTab)) {
        setActiveTab(availableTabs[0].id);
      }
    }
  }, [currentAdmin, activeTab]);

  // Check if user has any permissions
  const hasAnyPermissions = () => {
    if (!currentAdmin) return false;
    if (currentAdmin.role === 'superuser') return true;
    return Object.values(currentAdmin.permissions || {}).some(perm => perm === true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600">
        <p>{error}</p>
        <button
          onClick={loadData}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Check if user has no permissions at all
  if (currentAdmin && !hasAnyPermissions()) {
    return (
      <div className="space-y-6">
        {/* Current Admin Info */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {currentAdmin.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-indigo-900">
                  Welcome, {currentAdmin.name}
                </h3>
                <p className="text-xs text-indigo-600">
                  Role: {currentAdmin.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-indigo-600">
                0 permissions active
              </p>
            </div>
          </div>
        </div>

        {/* No Permissions Message */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6 text-center">
            <div className="text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Access Permissions</h3>
            <p className="text-gray-500 mb-4">
              You don't have any permissions assigned. Please contact your administrator to get access.
            </p>
            <p className="text-sm text-gray-400">
              Current permissions: {Object.entries(currentAdmin.permissions || {}).filter(([_, v]) => v).length} active
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Admin Info with Connection Status */}
      {currentAdmin && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {currentAdmin.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-indigo-900">
                  Welcome, {currentAdmin.name}
                </h3>
                <p className="text-xs text-indigo-600">
                  Role: {currentAdmin.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-xs text-indigo-600">
                  {Object.values(currentAdmin.permissions || {}).filter(p => p).length} permissions active
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Active: {Object.entries(currentAdmin.permissions || {}).filter(([_, v]) => v).map(([k, _]) => k).join(', ')}
                </p>
              </div>
              
              {/* WebSocket Connection Status */}
              <div className="flex items-center space-x-2">
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                  ws.isConnected 
                    ? 'bg-green-100 text-green-800' 
                    : ws.isConnecting 
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                }`}>
                  {ws.isConnected ? (
                    <>
                      <FiWifi className="w-3 h-3" />
                      <span>Live ({ws.connectionCount})</span>
                    </>
                  ) : ws.isConnecting ? (
                    <>
                      <div className="w-3 h-3 border border-yellow-600 border-t-transparent rounded-full animate-spin" />
                      <span>Connecting</span>
                    </>
                  ) : (
                    <>
                      <FiWifiOff className="w-3 h-3" />
                      <span>Offline</span>
                    </>
                  )}
                </div>
                
                {ws.error && (
                  <button 
                    onClick={() => ws.reconnect()}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Reconnect
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {getAvailableTabs().map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">U</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalUsers}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">P</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Payments</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalPayments}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">₹</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Payin Balance</dt>
                      <dd className="text-lg font-medium text-gray-900">₹{Number(stats.totalReceivedOrdersAmount || 0).toFixed(2)}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">S</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Succeeded</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.paymentStatusBreakdown.find(p => p.payment_status === 'Succeeded')?.count || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">F</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Failed</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.paymentStatusBreakdown.find(p => p.payment_status === 'Failed')?.count || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Payments</h3>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UTR</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.recentPayments.map((payment) => (
                      <tr key={payment.utr}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payment.utr}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.business_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ₹{payment.amount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            payment.payment_status === 'Succeeded' ? 'bg-green-100 text-green-800' :
                            payment.payment_status === 'Failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {getStatusText(payment.payment_status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">All Users</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business Name</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Website</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UPI ID</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approval</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KYC</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="max-w-36 truncate" title={user.business_name}>
                          {user.business_name}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="max-w-32 truncate" title={user.contact_name}>
                          {user.contact_name}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="max-w-40 truncate" title={user.email}>
                          {user.email}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-blue-600">
                        {user.website ? (
                          <a href={user.website} target="_blank" rel="noreferrer" className="underline truncate inline-block max-w-40" title={user.website}>
                            {user.website}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="max-w-32 truncate" title={user.upi_id}>
                          {user.upi_id}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.is_approved === true ? 'bg-green-100 text-green-800' :
                          user.is_approved === false ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.is_approved === true ? 'Approved' :
                           user.is_approved === false ? 'Rejected' :
                           'Pending'}
                        </span>
                        {user.google_id && (
                          <div className="text-xs text-gray-400 mt-1">
                            Google ID: {user.google_id.substring(0, 8)}...
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.kyc_status === 'verified' ? 'bg-green-100 text-green-800' :
                          user.kyc_status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.kyc_status ? user.kyc_status.charAt(0).toUpperCase() + user.kyc_status.slice(1) : 'Pending'}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{Number(user.payout_balance || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                        {hasPermission('manage_users') ? (
                          <div className="flex flex-col gap-1">
                            {user.is_approved !== true && (
                              <button
                                onClick={() => approveUser(user.id)}
                                className="text-green-600 hover:text-green-900 text-xs px-1 py-0.5 bg-green-50 hover:bg-green-100 rounded"
                              >
                                Approve
                              </button>
                            )}
                            {user.is_approved !== false && (
                              <button
                                onClick={() => rejectUser(user.id)}
                                className="text-red-600 hover:text-red-900 text-xs px-1 py-0.5 bg-red-50 hover:bg-red-100 rounded"
                              >
                                Reject
                              </button>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <label className="text-xs text-gray-500">KYC:</label>
                              <select
                                className="border rounded px-2 py-0.5 text-xs"
                                value={user.kyc_status || 'pending'}
                                onChange={(e) => {
                                  const val = e.target.value as 'pending'|'verified'|'rejected';
                                  fetch('/api/admin/users', {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ id: user.id, kyc_status: val })
                                  }).then(res => {
                                    if (res.ok) setUsers(users.map(u => u.id === user.id ? { ...u, kyc_status: val } : u));
                                  }).catch(() => {});
                                }}
                              >
                                <option value="pending">Pending</option>
                                <option value="verified">Verified</option>
                                <option value="rejected">Rejected</option>
                              </select>
                            </div>
                            <button
                              onClick={() => openEditRecharge(user)}
                              className="text-indigo-600 hover:text-indigo-900 text-xs px-1 py-0.5 bg-indigo-50 hover:bg-indigo-100 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteUser(user.id)}
                              className="text-red-600 hover:text-red-900 text-xs px-1 py-0.5 bg-red-50 hover:bg-red-100 rounded"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">View Only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">All Payments</h3>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UTR</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Checked</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.utr}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.business_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{payment.amount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          payment.payment_status === 'Succeeded' ? 'bg-green-100 text-green-800' :
                          payment.payment_status === 'Failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {getStatusText(payment.payment_status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.checked_status ? 'Yes' : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* UTR Submit Tab */}
      {activeTab === 'utrSubmit' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6 space-y-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Pending UTR Approvals</h3>

            {!hasPermission('manage_payin') ? (
              <div className="text-center py-8">
                <div className="text-gray-500 mb-2">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
                <p className="text-gray-500">You don't have permission to manage UTR approvals.</p>
              </div>
            ) : (
              <>
                {/* Pending UTR list */}
                <div className="mt-8">
                  <div className="mb-3">
                    <p className="text-sm text-gray-600">
                      Showing pending UTRs for your assigned vendors only. Superusers can see all vendors.
                    </p>
                  </div>
                  <PendingUtrList
                    onApprove={async (p) => {
                      const res = await fetch(`/api/admin/submit-utr`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ utr: p.utr, amount: p.amount, vendor_code: p.vendor_code })
                      });
                      if (!res.ok) {
                        const j = await res.json().catch(() => ({}));
                        throw new Error(j?.error || 'Approve failed');
                      }
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Payouts Tab */}
      {activeTab === 'payouts' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Payout Requests</h3>
                <p className="text-sm text-gray-500">
                  {hasPermission('manage_payout') 
                    ? 'Review beneficiary bank/UPI details, manually pay, then approve or reject.'
                    : 'View payout requests and their status.'
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={payoutStatusFilter}
                  onChange={async (e) => { setPayoutStatusFilter(e.target.value); await loadPayouts(e.target.value); }}
                  className="border rounded-md px-2 py-1 text-sm"
                >
                  <option value="">All</option>
                  <option value="created">Created</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button onClick={() => loadPayouts(payoutStatusFilter)} className="px-3 py-1.5 text-sm bg-gray-100 rounded-md">Refresh</button>
              </div>
            </div>

            {/* Recharge Requests */}
            <div className="border rounded-md">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <div className="font-medium">Recharge Requests</div>
                <button onClick={() => loadPayouts(payoutStatusFilter)} className="text-sm text-indigo-600 hover:underline">Refresh</button>
              </div>
              <AdminRechargeRequests />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Beneficiary</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bank / UPI</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ref</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Callback Message</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payouts.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2 text-sm font-mono">{p.id}</td>
                      <td className="px-4 py-2 text-sm">{p.business_name || `Vendor #${p.vendor_id}`}</td>
                      <td className="px-4 py-2 text-sm">{p.currency} {Number(p.amount).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm">
                        <div className="space-y-0.5">
                          <div className="font-medium">{p.beneficiary_name || '-'}</div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {p.beneficiary_account && p.beneficiary_ifsc ? (
                          <div className="space-y-0.5">
                            <div className="font-mono">A/C: {p.beneficiary_account}</div>
                            <div className="font-mono">IFSC: {p.beneficiary_ifsc}</div>
                          </div>
                        ) : p.beneficiary_upi ? (
                          <div className="font-mono">UPI: {p.beneficiary_upi}</div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm">{p.reference_id || '-'}</td>
                      <td className="px-4 py-2 text-sm">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  p.status === 'paid' || p.status === 'approved' ? 'bg-green-100 text-green-800' :
                  p.status === 'rejected' || p.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {getStatusText(p.status)}
                </span>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {p.admin_notes ? (
                          <div className="max-w-xs">
                            <div className="text-gray-900 text-sm">{p.admin_notes}</div>
                          </div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {hasPermission('manage_payout') ? (
                          p.status === 'created' ? (
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => {
                                  const message = prompt('Enter callback message (optional):');
                                  updatePayoutStatus(p.id, 'approved', message || undefined);
                                }}
                                disabled={updatingPayoutId === p.id}
                                className="px-3 py-1 bg-indigo-600 text-white rounded disabled:opacity-50"
                              >Approve</button>
                              <button
                                onClick={() => {
                                  const message = prompt('Enter callback message (optional):');
                                  updatePayoutStatus(p.id, 'paid', message || undefined);
                                }}
                                disabled={updatingPayoutId === p.id}
                                className="px-3 py-1 bg-emerald-600 text-white rounded disabled:opacity-50"
                              >Mark Paid</button>
                              <button
                                onClick={() => {
                                  const message = prompt('Enter callback message (optional):');
                                  updatePayoutStatus(p.id, 'rejected', message || undefined);
                                }}
                                disabled={updatingPayoutId === p.id}
                                className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50"
                              >Reject</button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">No actions for {p.status}</span>
                          )
                        ) : (
                          <span className="text-sm text-gray-400">View Only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payouts.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-500">No payouts found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settlements Tab */}
      {activeTab === 'settlements' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Settlement Requests</h3>
                <p className="text-sm text-gray-500">
                  {hasPermission('manage_settlements') 
                    ? 'Review and approve vendor settlement requests.'
                    : 'View settlement requests and their status.'
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => loadSettlements()} className="px-3 py-1.5 text-sm bg-gray-100 rounded-md">Refresh</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Admin Notes</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {settlements.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2 text-sm font-mono">{s.id}</td>
                      <td className="px-4 py-2 text-sm">
                        <div>
                          <div className="font-medium">{s.business_name}</div>
                          <div className="text-gray-500 font-mono">ID: {s.vendor_id}</div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm font-medium">₹{Number(s.amount).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          s.status === 'approved' ? 'bg-green-100 text-green-800' :
                          s.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {getStatusText(s.status)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">{new Date(s.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2 text-sm">
                        <input
                          type="text"
                          placeholder="Add notes..."
                          className="w-full border rounded px-2 py-1 text-xs"
                          defaultValue={s.admin_notes || ''}
                          onChange={(e) => {
                            // Update local state for admin notes
                            setSettlements(prev => prev.map(settlement => 
                              settlement.id === s.id ? { ...settlement, admin_notes: e.target.value } : settlement
                            ));
                          }}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        {hasPermission('manage_settlements') ? (
                          <div className="inline-flex gap-2">
                            {s.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => {
                                    const notes = settlements.find(settlement => settlement.id === s.id)?.admin_notes || '';
                                    updateSettlementStatus(s.id, 'approved', notes);
                                  }}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                                >Approve</button>
                                <button
                                  onClick={() => {
                                    const notes = settlements.find(settlement => settlement.id === s.id)?.admin_notes || '';
                                    updateSettlementStatus(s.id, 'rejected', notes);
                                  }}
                                  className="px-3 py-1 bg-red-600 text-white rounded text-xs"
                                >Reject</button>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">View Only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {settlements.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-500">No settlement requests found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Users Tab */}
      {activeTab === 'admins' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Admin Users</h3>
              {hasPermission('manage_admins') && (
                <button
                  onClick={() => setShowCreateAdmin(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Create Admin
                </button>
              )}
            </div>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {adminUsers.map((admin) => (
                    <tr key={admin.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {admin.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {admin.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          admin.role === 'superuser' ? 'bg-purple-100 text-purple-800' :
                          admin.role === 'view_only' ? 'bg-gray-100 text-gray-800' :
                          admin.role === 'manage_users' ? 'bg-blue-100 text-blue-800' :
                          admin.role === 'manage_payin' ? 'bg-green-100 text-green-800' :
                          admin.role === 'manage_payout' ? 'bg-yellow-100 text-yellow-800' :
                          admin.role === 'manage_settlements' ? 'bg-orange-100 text-orange-800' :
                          admin.role === 'custom' ? 'bg-indigo-100 text-indigo-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {admin.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(admin.permissions || {}).map(([perm, enabled]) => 
                            enabled ? (
                              <span key={perm} className="inline-flex px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                                {availablePermissions[perm]?.name || perm}
                              </span>
                            ) : null
                          )}
                          {Object.values(admin.permissions || {}).every(p => !p) && (
                            <span className="text-gray-400 text-xs">No permissions</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          admin.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {hasPermission('manage_admins') ? (
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => openPermissionEditor(admin)}
                              className="text-sm px-3 py-1 rounded text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100"
                            >
                              Permissions
                            </button>
                            <button
                              onClick={() => openVendorAssignmentEditor(admin)}
                              className="text-sm px-3 py-1 rounded text-purple-600 hover:text-purple-900 bg-purple-50 hover:bg-purple-100"
                            >
                              Vendors
                            </button>
                            <button
                              onClick={() => updateAdminUser(admin.id, { is_active: !admin.is_active })}
                              className={`text-sm px-3 py-1 rounded ${
                                admin.is_active 
                                  ? 'text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100' 
                                  : 'text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100'
                              }`}
                            >
                              {admin.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => deleteAdminUser(admin.id)}
                              className="text-red-600 hover:text-red-900 text-sm px-3 py-1 rounded bg-red-50 hover:bg-red-100"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">View Only</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {adminUsers.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-500">No admin users found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {editUserId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Edit Recharge Bank Details</h3>
              <button onClick={() => setEditUserId(null)} className="text-gray-500">✕</button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <input value={editBankName} onChange={(e) => setEditBankName(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="e.g. HDFC Bank" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder</label>
                <input value={editAccountHolder} onChange={(e) => setEditAccountHolder(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="e.g. Jane Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input value={editAccountNumber} onChange={(e) => setEditAccountNumber(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="e.g. 1234567890" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IFSC</label>
                <input value={editIfsc} onChange={(e) => setEditIfsc(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="e.g. HDFC0001234" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditUserId(null)} className="px-3 py-1.5 text-sm border rounded">Cancel</button>
              <button onClick={saveRechargeDetails} disabled={savingUser} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded disabled:opacity-50">Save</button>
            </div>
            <p className="text-xs text-gray-500 mt-3">These details are shown to the vendor in the Recharge popup.</p>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showCreateAdmin && hasPermission('manage_admins') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Create Admin User</h3>
              <button onClick={() => setShowCreateAdmin(false)} className="text-gray-500">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Enter admin name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Enter admin email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Enter admin password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newAdminRole}
                  onChange={(e) => {
                    setNewAdminRole(e.target.value);
                    if (e.target.value !== 'custom') {
                      // Reset custom permissions when changing to predefined role
                      setNewAdminPermissions({});
                    }
                  }}
                  className="w-full border rounded-md px-3 py-2"
                >
                  <option value="view_only">View Only</option>
                  <option value="manage_users">Manage Users</option>
                  <option value="manage_payin">Manage Payin</option>
                  <option value="manage_payout">Manage Payout</option>
                  <option value="manage_settlements">Manage Settlements</option>
                  <option value="custom">Custom</option>
                  <option value="superuser">Superuser</option>
                </select>
              </div>
              {newAdminRole === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Custom Permissions</label>
                  <div className="space-y-3 max-h-48 overflow-y-auto border rounded-md p-3">
                    {Object.entries(getPermissionGroups()).map(([category, permissions]) => (
                      <div key={category}>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">{category} Permissions</h4>
                        <div className="space-y-2">
                          {permissions.map(perm => (
                            <label key={perm} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={newAdminPermissions[perm] || false}
                                onChange={(e) => setNewAdminPermissions(prev => ({
                                  ...prev,
                                  [perm]: e.target.checked
                                }))}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {availablePermissions[perm]?.name || perm}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {availablePermissions[perm]?.description || ''}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowCreateAdmin(false)}
                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createAdminUser}
                disabled={creatingAdmin}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {creatingAdmin ? 'Creating...' : 'Create Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Editor Modal */}
      {editingPermissions !== null && hasPermission('manage_admins') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Permissions
                {adminUsers.find(a => a.id === editingPermissions)?.role === 'superuser' && (
                  <span className="ml-2 text-sm text-purple-600 font-normal">
                    (Superuser - All permissions enabled)
                  </span>
                )}
              </h3>
              <button 
                onClick={() => {
                  setEditingPermissions(null);
                  setTempPermissions({});
                }} 
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              {Object.entries(getPermissionGroups()).map(([category, permissions]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 border-b pb-1">{category} Permissions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissions.map(perm => {
                      const isSuperuser = adminUsers.find(a => a.id === editingPermissions)?.role === 'superuser';
                      const isChecked = tempPermissions[perm] || false;
                      return (
                        <label key={perm} className={`flex items-start space-x-3 p-3 border rounded-lg ${isSuperuser ? 'bg-purple-50' : 'hover:bg-gray-50'}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(perm)}
                            disabled={isSuperuser}
                            className={`mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${isSuperuser ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {availablePermissions[perm]?.name || perm}
                              {isSuperuser && <span className="ml-2 text-xs text-purple-600">(Superuser)</span>}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {availablePermissions[perm]?.description || ''}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingPermissions(null);
                  setTempPermissions({});
                }}
                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              {adminUsers.find(a => a.id === editingPermissions)?.role !== 'superuser' && (
                <button
                  onClick={savePermissions}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Save Permissions
                </button>
              )}
              {adminUsers.find(a => a.id === editingPermissions)?.role === 'superuser' && (
                <button
                  onClick={() => {
                    setEditingPermissions(null);
                    setTempPermissions({});
                  }}
                  className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vendor Assignment Modal */}
      {editingVendorAssignments !== null && hasPermission('manage_admins') && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Manage Vendor Assignments
                <span className="ml-2 text-sm text-gray-600 font-normal">
                  for {adminUsers.find(a => a.id === editingVendorAssignments)?.name}
                </span>
              </h3>
              <button 
                onClick={() => {
                  setEditingVendorAssignments(null);
                  setAssignedVendors([]);
                  setAllVendors([]);
                }} 
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {loadingVendorAssignments ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-2 text-gray-600">Loading vendors...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Instructions</h4>
                  <p className="text-sm text-blue-700">
                    Select which vendors this admin can manage. Admins will only see data related to their assigned vendors.
                    Superusers automatically have access to all vendors.
                  </p>
                </div>
                
                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  <div className="divide-y divide-gray-200">
                    {allVendors.map((vendor) => {
                      const isAssigned = assignedVendors.includes(vendor.id);
                      return (
                        <label key={vendor.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => toggleVendorAssignment(vendor.id)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {vendor.business_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {vendor.contact_name} • {vendor.email}
                            </div>
                          </div>
                          <div className="text-xs text-gray-400">
                            ID: {vendor.id}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    {assignedVendors.length} of {allVendors.length} vendors selected
                  </span>
                  <button
                    onClick={() => {
                      setAssignedVendors(allVendors.map(v => v.id));
                    }}
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Select All
                  </button>
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingVendorAssignments(null);
                  setAssignedVendors([]);
                  setAllVendors([]);
                }}
                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveVendorAssignments}
                disabled={loadingVendorAssignments}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                Save Assignments
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminRechargeRequests() {
  const [rows, setRows] = React.useState<Array<{ id:number; vendor_id:number; business_name:string; amount:number; utr?: string | null; status:string; created_at:string }>>([])
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const [updatingId, setUpdatingId] = React.useState<number | null>(null)
  const [edits, setEdits] = React.useState<Record<number, { amount: string; utr: string }>>({})

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Success';
      case 'approved':
        return 'Success';
      case 'rejected':
        return 'Failed';
      case 'created':
        return 'Pending';
      default:
        return 'Pending';
    }
  };

  const load = async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/recharges')
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Failed')
      setRows((j.data && j.data.recharges) || [])
    } catch (e:any) {
      setErr(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { load() }, [])

  // Listen for WebSocket events to refresh data
  React.useEffect(() => {
    const handleCustomEvent = (event: CustomEvent) => {
      if (event.detail.type === 'recharge_created' || event.detail.type === 'recharge_status_changed') {
        load();
      }
    };

    window.addEventListener('rechargeEvent' as any, handleCustomEvent);
    
    return () => {
      window.removeEventListener('rechargeEvent' as any, handleCustomEvent);
    };
  }, []);

  const update = async (id:number, status:string) => {
    setUpdatingId(id)
    try {
      const payload:any = { id, status }
      
      // Get the original recharge data
      const originalRecharge = rows.find(r => r.id === id);
      if (!originalRecharge) {
        throw new Error('Recharge request not found');
      }
      
      // Use edited values if available, otherwise use original values
      const finalAmount = edits[id]?.amount ? Number(edits[id].amount) : originalRecharge.amount;
      const finalUtr = edits[id]?.utr || originalRecharge.utr;
      
      // Add to payload if they were edited
      if (edits[id]?.amount) payload.amount = finalAmount;
      if (edits[id]?.utr) payload.utr = finalUtr;
      
      // Validate required fields for approval/paid status
      if ((status === 'approved' || status === 'paid') && (!finalUtr || !finalAmount || finalAmount <= 0)) {
        const missingFields = [];
        if (!finalUtr) missingFields.push('UTR');
        if (!finalAmount || finalAmount <= 0) missingFields.push('valid amount');
        throw new Error(`${missingFields.join(' and ')} ${missingFields.length > 1 ? 'are' : 'is'} required for approval`)
      }
      
      const res = await fetch('/api/admin/recharges', { method:'PATCH', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
      let j:any = null; try { j = await res.json() } catch {}
      if (!res.ok) throw new Error((j && j.error) || 'Update failed')
      await load()
    } catch (e:any) {
      alert(e.message || 'Failed')
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading...</div>
  if (err) return <div className="p-4 text-sm text-red-600">{err}</div>
  if (rows.length === 0) return <div className="p-4 text-sm text-gray-500">No recharge requests</div>

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">UTR</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-2 text-sm font-mono">{r.id}</td>
              <td className="px-4 py-2 text-sm">{r.business_name || `Vendor #${r.vendor_id}`}</td>
              <td className="px-4 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">₹</span>
                  <input
                    value={edits[r.id]?.amount ?? String(r.amount)}
                    onChange={(e) => setEdits((prev) => ({ ...prev, [r.id]: { ...(prev[r.id]||{ utr: r.utr || '' }), amount: e.target.value } }))}
                    className="w-28 border rounded-md px-2 py-1"
                  />
                </div>
              </td>
              <td className="px-4 py-2 text-sm">
                <input
                  value={edits[r.id]?.utr ?? (r.utr || '')}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [r.id]: { ...(prev[r.id]||{ amount: String(r.amount) }), utr: e.target.value } }))}
                  className="w-40 border rounded-md px-2 py-1 font-mono"
                  placeholder="UTR"
                />
              </td>
              <td className="px-4 py-2 text-sm">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  r.status === 'paid' || r.status === 'approved' ? 'bg-green-100 text-green-800' :
                  r.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {getStatusText(r.status)}
                </span>
              </td>
              <td className="px-4 py-2 text-right">
                {r.status === 'created' ? (
                  <div className="inline-flex gap-2">
                    <button onClick={() => update(r.id, 'approved')} disabled={updatingId===r.id} className="px-3 py-1 bg-indigo-600 text-white rounded disabled:opacity-50">Approve</button>
                    <button onClick={() => update(r.id, 'paid')} disabled={updatingId===r.id} className="px-3 py-1 bg-emerald-600 text-white rounded disabled:opacity-50">Mark Paid</button>
                    <button onClick={() => update(r.id, 'rejected')} disabled={updatingId===r.id} className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50">Reject</button>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">No actions for {r.status}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
