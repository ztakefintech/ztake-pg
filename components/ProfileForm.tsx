'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { FiUser, FiPhone, FiCreditCard, FiSave, FiMessageCircle, FiCopy, FiRefreshCw, FiGlobe, FiMail, FiShield, FiEdit2, FiTrash2, FiPlus, FiX } from 'react-icons/fi';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface PaymentInfo {
  qr_code_url: string;
  upi_id: string;
  upi_url: string;
  vendor_id: number;
  bank_name?: string | null;
  bank_account_holder?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bot_token_present?: boolean;
  chat_id_present?: boolean;
  is_bot_live?: boolean;
}

export default function ProfileForm() {
  const { vendor, token, updateVendor } = useAuth();
  const [formData, setFormData] = useState({
    business_name: '',
    contact_name: '',
    phone: '',
    website: '',
    upi_id: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
    bank_ifsc: '',
    bot_token: '',
    chat_id: '',
    cashfree_app_id: '',
    cashfree_secret_key: '',
    cashfree_payout_client_id: '',
    cashfree_payout_client_secret: '',
    cashfree_env: 'sandbox'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [kycStatus, setKycStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [qrError, setQrError] = useState('');
  // Credentials Manager state
  const [webhooks, setWebhooks] = useState<{ payin_url: string; payout_url: string }>({ payin_url: '', payout_url: '' });
  const [isSavingWebhooks, setIsSavingWebhooks] = useState(false);
  const [ips, setIps] = useState<Array<{ id?: number; ip: string; enabled: boolean }>>([]);
  const [newIp, setNewIp] = useState('');
  const [isSavingIp, setIsSavingIp] = useState(false);
  // Bank Accounts state
  const [bankAccounts, setBankAccounts] = useState<Array<{
    id: number;
    bank_name: string;
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    is_active: boolean;
  }>>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [accountFormData, setAccountFormData] = useState({
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    ifsc_code: ''
  });

  useEffect(() => {
    if (token) {
      fetchProfile();
      fetchPaymentInfo();
      fetchCredentialsConfig();
      fetchBankAccounts();
      // Refresh vendor data from API to get latest vendor_code
      refreshVendorData();
    }
  }, [token]);

  // Refresh payment info when UPI ID changes
  useEffect(() => {
    if (formData.upi_id && paymentInfo) {
      if (formData.upi_id !== paymentInfo.upi_id) {
        fetchPaymentInfo(true);
      }
    }
  }, [formData.upi_id]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/vendor/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFormData({
          business_name: data.vendor.business_name || '',
          contact_name: data.vendor.contact_name || '',
          phone: data.vendor.phone || '',
          website: data.vendor.website || '',
          upi_id: data.vendor.upi_id || '',
          bank_name: data.vendor.bank_name || '',
          bank_account_number: data.vendor.bank_account_number || '',
          bank_account_holder: data.vendor.bank_account_holder || '',
          bank_ifsc: data.vendor.bank_ifsc || '',
          bot_token: data.vendor.bot_token || '',
          chat_id: data.vendor.chat_id || '',
          cashfree_app_id: data.vendor.cashfree_app_id || '',
          cashfree_secret_key: data.vendor.cashfree_secret_key || '',
          cashfree_payout_client_id: data.vendor.cashfree_payout_client_id || '',
          cashfree_payout_client_secret: data.vendor.cashfree_payout_client_secret || '',
          cashfree_env: data.vendor.cashfree_env || 'sandbox'
        });
        setKycStatus((data.vendor.kyc_status || 'pending').toLowerCase());
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentInfo = async (isRefresh = false) => {
    if (!token) {
      return;
    }
    
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      }
      setQrError('');
      
      const response = await fetch('/api/vendor/payment-info', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentInfo(data);
      } else {
        setQrError('Failed to load payment information');
      }
    } catch (err) {
      setQrError('Network error. Please try again.');
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Copied to clipboard!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleRefresh = () => {
    fetchPaymentInfo(true);
  };

  // Fetch existing webhook/IP settings (placeholder endpoints)
  const refreshVendorData = async () => {
    try {
      const response = await fetch('/api/vendor/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Update the vendor data in auth context with latest vendor_code
        updateVendor({
          id: data.vendor.id,
          vendor_code: data.vendor.vendor_code,
          email: data.vendor.email,
          business_name: data.vendor.business_name,
          contact_name: data.vendor.contact_name,
          phone: data.vendor.phone,
          upi_id: data.vendor.upi_id
        });
      }
    } catch (err) {
      console.error('Failed to refresh vendor data:', err);
    }
  };

  const fetchCredentialsConfig = async () => {
    try {
      const [whRes, ipRes] = await Promise.all([
        fetch('/api/vendor/webhooks', { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null),
        fetch('/api/vendor/ips', { headers: { 'Authorization': `Bearer ${token}` } }).catch(() => null)
      ]);

      if (whRes && whRes.ok) {
        const data = await whRes.json();
        setWebhooks({
          payin_url: data?.payin_url || '',
          payout_url: data?.payout_url || ''
        });
      }

      if (ipRes && ipRes.ok) {
        const data = await ipRes.json();
        setIps((data?.ips || []).map((x: any) => ({ id: x.id, ip: x.ip, enabled: !!x.enabled })));
      }
    } catch (_) {
      // Silent: endpoints may not exist yet
    }
  };

  const saveWebhooks = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWebhooks(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/vendor/webhooks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(webhooks)
      }).catch(() => null);
      if (res && res.ok) {
        setSuccess('Webhook URLs saved');
      } else {
        setSuccess('Saved locally');
      }
    } catch (_) {
      setSuccess('Saved locally');
    } finally {
      setIsSavingWebhooks(false);
      setTimeout(() => setSuccess(''), 2500);
    }
  };

  const addIp = async () => {
    if (!newIp.trim()) return;
    const ipv4Regex = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
    if (!ipv4Regex.test(newIp.trim())) {
      setError('Enter a valid IPv4 address');
      setTimeout(() => setError(''), 2500);
      return;
    }
    setIsSavingIp(true);
    try {
      const res = await fetch('/api/vendor/ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ip: newIp.trim() })
      }).catch(() => null);
      let created = { id: undefined as number | undefined, ip: newIp.trim(), enabled: true };
      if (res && res.ok) {
        const data = await res.json();
        created.id = data?.id;
      }
      setIps(prev => [...prev, created]);
      setNewIp('');
    } catch (_) {
      // local append already done
    } finally {
      setIsSavingIp(false);
    }
  };

  const toggleIp = async (idx: number) => {
    setIps(prev => prev.map((x, i) => i === idx ? { ...x, enabled: !x.enabled } : x));
    try {
      const item = ips[idx];
      await fetch(`/api/vendor/ips${item.id ? `/${item.id}` : ''}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ enabled: !item.enabled })
      }).catch(() => null);
    } catch (_) {}
  };

  const removeIp = async (idx: number) => {
    const item = ips[idx];
    setIps(prev => prev.filter((_, i) => i !== idx));
    try {
      await fetch(`/api/vendor/ips${item.id ? `/${item.id}` : ''}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => null);
    } catch (_) {}
  };

  // Bank Accounts functions
  const fetchBankAccounts = async () => {
    if (!token) return;
    try {
      setIsLoadingAccounts(true);
      const response = await fetch('/api/vendor/bank-accounts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBankAccounts(data.accounts || []);
      }
    } catch (err) {
      console.error('Failed to fetch bank accounts:', err);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handleAddAccount = () => {
    setAccountFormData({
      bank_name: '',
      account_holder_name: '',
      account_number: '',
      ifsc_code: ''
    });
    setEditingAccountId(null);
    setShowAddAccountForm(true);
  };

  const handleEditAccount = (account: any) => {
    setAccountFormData({
      bank_name: account.bank_name,
      account_holder_name: account.account_holder_name,
      account_number: account.account_number,
      ifsc_code: account.ifsc_code
    });
    setEditingAccountId(account.id);
    setShowAddAccountForm(true);
  };

  const handleSaveAccount = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const url = editingAccountId 
        ? `/api/vendor/bank-accounts/${editingAccountId}`
        : '/api/vendor/bank-accounts';
      const method = editingAccountId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(accountFormData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(editingAccountId ? 'Bank account updated successfully' : 'Bank account added successfully');
        setShowAddAccountForm(false);
        fetchBankAccounts();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to save bank account');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (!confirm('Are you sure you want to delete this bank account?')) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/vendor/bank-accounts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setSuccess('Bank account deleted successfully');
        fetchBankAccounts();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to delete bank account');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/vendor/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Profile updated successfully');
        // Update the vendor data in auth context
        updateVendor({
          id: vendor?.id || 0,
          email: vendor?.email || '',
          business_name: formData.business_name,
          contact_name: formData.contact_name,
          phone: formData.phone,
          upi_id: formData.upi_id
        });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your account information and payment details</p>
      </div>

      {/* Summary header */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <FiUser className="w-7 h-7 text-gray-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Vendor Code</p>
              <p className="font-mono font-semibold">{vendor?.vendor_code || '—'}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300"><FiGlobe className="text-gray-400 dark:text-gray-500" /><span className="truncate">{formData.website || '—'}</span></div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300"><FiMail className="text-gray-400 dark:text-gray-500" /><span className="truncate">{vendor?.email}</span></div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300"><FiPhone className="text-gray-400 dark:text-gray-500" /><span>{formData.phone || '—'}</span></div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300"><FiShield className="text-gray-400 dark:text-gray-500" /><span>{formData.business_name || 'Business'}</span></div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <span className={`text-xs px-2 py-1 rounded ${
                kycStatus === 'verified' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                kycStatus === 'rejected' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
                'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
              }`}>
                KYC {kycStatus.charAt(0).toUpperCase() + kycStatus.slice(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details" className="card">
        <TabsList className="mb-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 text-gray-700 dark:text-gray-300">
          <TabsTrigger className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white" value="details">Personal / Business Details</TabsTrigger>
          <TabsTrigger className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white" value="credentials">Credentials Manager</TabsTrigger>
          <TabsTrigger className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white" value="accounts">Recharge Account</TabsTrigger>
          <TabsTrigger className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white" value="bank-accounts">Bank Accounts</TabsTrigger>
          <TabsTrigger className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white" value="upi">UPI Credentials</TabsTrigger>
        </TabsList>

        {/* Details */}
        <TabsContent value="details" className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label htmlFor="business_name" className="form-label">Business Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="h-5 w-5 text-gray-400" />
                  </div>
                  <input id="business_name" name="business_name" type="text" required className="input-field pl-10" placeholder="Enter your business name" value={formData.business_name} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="website" className="form-label">Website (for verification)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiGlobe className="h-5 w-5 text-gray-400" />
                  </div>
                  <input id="website" name="website" type="url" className="input-field pl-10" placeholder="https://your-business.com" value={formData.website} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="contact_name" className="form-label">Contact Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="h-5 w-5 text-gray-400" />
                  </div>
                  <input id="contact_name" name="contact_name" type="text" required className="input-field pl-10" placeholder="Enter your contact name" value={formData.contact_name} onChange={handleChange} />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="phone" className="form-label">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiPhone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input id="phone" name="phone" type="tel" className="input-field pl-10" placeholder="Enter your phone number" value={formData.phone} onChange={handleChange} />
                </div>
              </div>
            </div>
            {error && (<div className="error-message text-center">{error}</div>)}
            {success && (<div className="success-message text-center">{success}</div>)}
            <div className="flex justify-end"><button type="submit" disabled={isSaving} className="btn-primary flex items-center space-x-2"><FiSave /><span>{isSaving ? 'Saving...' : 'Save Changes'}</span></button></div>
          </form>
        </TabsContent>

        {/* Credentials */}
        <TabsContent value="credentials" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* IP Manager */}
            <div className="card">
              <h3 className="text-sm font-semibold mb-3">IP Manager</h3>
              <div className="flex gap-2 mb-3">
                <input value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="e.g., 13.42.117.92" className="input-field flex-1" />
                <button type="button" onClick={addIp} disabled={isSavingIp || !newIp} className="btn-primary">Add IP</button>
              </div>
              <div className="divide-y border rounded-md">
                {ips.length === 0 && (
                  <div className="p-3 text-sm text-gray-500">No IPs added yet.</div>
                )}
                {ips.map((item, idx) => (
                  <div key={(item.id ?? idx) + '-' + item.ip} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${item.enabled ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                      <span className="font-mono text-sm">{item.ip}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only" checked={item.enabled} onChange={() => toggleIp(idx)} />
                        <div className={`w-10 h-5 rounded-full transition-colors ${item.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                          <div className={`h-5 w-5 bg-white rounded-full shadow transform transition-transform ${item.enabled ? 'translate-x-5' : ''}`}></div>
                        </div>
                      </label>
                      <button type="button" onClick={() => removeIp(idx)} className="text-red-600 text-sm">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Webhook Manager */}
            <div className="card">
              <h3 className="text-sm font-semibold mb-3">Webhook Manager</h3>
              <form onSubmit={saveWebhooks} className="space-y-4">
                <div className="form-group">
                  <label className="form-label">Payin Webhook URL</label>
                  <input value={webhooks.payin_url} onChange={e => setWebhooks(v => ({ ...v, payin_url: e.target.value }))} placeholder="https://your-api.com/api/payin/webhook" className="input-field" />
                </div>
                <div className="form-group">
                  <label className="form-label">Payout Webhook URL</label>
                  <input value={webhooks.payout_url} onChange={e => setWebhooks(v => ({ ...v, payout_url: e.target.value }))} placeholder="https://your-api.com/api/payout/webhook" className="input-field" />
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={isSavingWebhooks} className="btn-primary">
                    {isSavingWebhooks ? 'Saving...' : 'Save Webhooks'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </TabsContent>

        {/* Accounts */}
        <TabsContent value="accounts" className="space-y-6">
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="form-group">
                <label htmlFor="bank_name" className="form-label">Bank Name</label>
                <input id="bank_name" name="bank_name" type="text" className="input-field" placeholder="e.g., HDFC Bank" value={formData.bank_name} onChange={handleChange} disabled readOnly />
              </div>
              <div className="form-group">
                <label htmlFor="bank_account_holder" className="form-label">Account Holder Name</label>
                <input id="bank_account_holder" name="bank_account_holder" type="text" className="input-field" placeholder="e.g., Rahul Sharma" value={formData.bank_account_holder} onChange={handleChange} disabled readOnly />
              </div>
              <div className="form-group">
                <label htmlFor="bank_account_number" className="form-label">Account Number</label>
                <input id="bank_account_number" name="bank_account_number" type="text" className="input-field" placeholder="e.g., 123456789012" value={formData.bank_account_number} onChange={handleChange} disabled readOnly />
              </div>
              <div className="form-group">
                <label htmlFor="bank_ifsc" className="form-label">IFSC Code</label>
                <input id="bank_ifsc" name="bank_ifsc" type="text" className="input-field uppercase" placeholder="e.g., HDFC0001234" value={formData.bank_ifsc} onChange={handleChange} disabled readOnly />
              </div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 text-sm text-yellow-800 dark:text-yellow-200">These bank account details are managed by the admin team. Contact support to update.</div>
          </form>
        </TabsContent>

        {/* Bank Accounts */}
        <TabsContent value="bank-accounts" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Your Bank Accounts</h3>
            <button
              onClick={handleAddAccount}
              className="btn-primary flex items-center gap-2"
              disabled={showAddAccountForm}
            >
              <FiPlus /> Add Bank Account
            </button>
          </div>

          {error && <div className="error-message text-center">{error}</div>}
          {success && <div className="success-message text-center">{success}</div>}

          {showAddAccountForm && (
            <div className="card mb-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold">{editingAccountId ? 'Edit Bank Account' : 'Add New Bank Account'}</h4>
                <button
                  onClick={() => setShowAddAccountForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Bank Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g., HDFC Bank"
                    value={accountFormData.bank_name}
                    onChange={(e) => setAccountFormData({ ...accountFormData, bank_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Holder Name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g., Rahul Sharma"
                    value={accountFormData.account_holder_name}
                    onChange={(e) => setAccountFormData({ ...accountFormData, account_holder_name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Number</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g., 123456789012"
                    value={accountFormData.account_number}
                    onChange={(e) => setAccountFormData({ ...accountFormData, account_number: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">IFSC Code</label>
                  <input
                    type="text"
                    className="input-field uppercase"
                    placeholder="e.g., HDFC0001234"
                    value={accountFormData.ifsc_code}
                    onChange={(e) => setAccountFormData({ ...accountFormData, ifsc_code: e.target.value.toUpperCase() })}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleSaveAccount}
                  disabled={isSaving}
                  className="btn-primary"
                >
                  {isSaving ? 'Saving...' : 'Save Account'}
                </button>
                <button
                  onClick={() => setShowAddAccountForm(false)}
                  className="btn-secondary"
                  disabled={isSaving}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isLoadingAccounts ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading bank accounts...</p>
            </div>
          ) : bankAccounts.length === 0 ? (
            <div className="card text-center py-12">
              <FiCreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500">No bank accounts added yet. Click "Add Bank Account" to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bankAccounts.map((account) => (
                <div key={account.id} className="card">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FiCreditCard className="text-gray-400" />
                        <h4 className="font-semibold">{account.bank_name}</h4>
                        {account.is_active && (
                          <span className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Account Holder:</span>
                          <p className="font-medium">{account.account_holder_name}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Account Number:</span>
                          <p className="font-mono font-medium">{account.account_number}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">IFSC Code:</span>
                          <p className="font-mono font-medium">{account.ifsc_code}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditAccount(account)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit Account"
                      >
                        <FiEdit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete Account"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* UPI */}
        <TabsContent value="upi" className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
              <label htmlFor="upi_id" className="form-label">UPI ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiCreditCard className="h-5 w-5 text-gray-400" />
                </div>
                <input id="upi_id" name="upi_id" type="text" required className="input-field pl-10" placeholder="yourname@paytm" value={formData.upi_id} onChange={handleChange} />
              </div>
              <p className="text-xs text-gray-500 mt-1">Enter your UPI ID (e.g., yourname@paytm, yourname@phonepe)</p>
            </div>

            {qrError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-600">{qrError}</p>
                <button onClick={handleRefresh} className="mt-2 text-sm text-red-600 hover:text-red-800 underline">Try again</button>
              </div>
            ) : paymentInfo ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-2">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">UPI ID</h3>
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-mono bg-gray-100 p-3 rounded flex-1">{paymentInfo.upi_id}</p>
                    <button onClick={() => copyToClipboard(paymentInfo.upi_id || '')} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-300" title="Copy UPI ID"><FiCopy className="h-4 w-4" /></button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Click the copy icon to copy UPI ID</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">QR Code</h3>
                  <div className="flex justify-center">
                    <div className="relative">
                      <img src={paymentInfo.qr_code_url} alt="Payment QR Code" className="w-40 h-40 border-2 border-gray-200 rounded-lg shadow-sm" onError={() => setQrError('Failed to load QR code image')} />
                      {isRefreshing && (
                        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                          <FiRefreshCw className="h-6 w-6 animate-spin text-primary-600" />
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">Scan with any UPI app to pay</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <FiRefreshCw className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Loading payment info...</h3>
                <p className="mt-1 text-sm text-gray-500">Please wait while we fetch your UPI details.</p>
              </div>
            )}

            {error && (<div className="error-message text-center">{error}</div>)}
            {success && (<div className="success-message text-center">{success}</div>)}
            <div className="flex justify-end"><button type="submit" disabled={isSaving} className="btn-primary flex items-center space-x-2"><FiSave /><span>{isSaving ? 'Saving...' : 'Save Changes'}</span></button></div>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
