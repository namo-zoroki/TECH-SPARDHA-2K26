import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { apiService } from '@/src/services/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Search, Filter, Download, ExternalLink, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/src/lib/utils';

export const AdminDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('All');

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const response = await apiService.getRegistrations(password);
      if (response.success) {
        setRegistrations(response.data);
        setIsAuthenticated(true);
        setError('');
      } else {
        setError(response.message || 'Authentication failed');
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (regId: string, field: string, value: string) => {
    try {
      const response = await apiService.updateStatus(regId, field, value, password);
      if (response.success) {
        fetchRegistrations(); // Refresh data
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const filteredData = registrations.filter(reg => {
    const matchesSearch = 
      reg.FullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.RegistrationID.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.StudentID.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEvent = eventFilter === 'All' || reg.EventName === eventFilter;
    
    return matchesSearch && matchesEvent;
  });

  const exportCSV = () => {
    const headers = Object.keys(registrations[0]).join(',');
    const rows = registrations.map(reg => Object.values(reg).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `techspardha_registrations_${new Date().toLocaleDateString()}.csv`;
    a.click();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-6">
        <div className="w-full max-w-md p-8 bg-neutral-900 border border-white/10">
          <h2 className="text-2xl font-bold uppercase mb-8">Admin Access</h2>
          <form onSubmit={(e) => { e.preventDefault(); fetchRegistrations(); }} className="space-y-6">
            <Input 
              type="password" 
              label="Admin Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Enter password"
            />
            {error && <p className="text-xs text-red-500 font-mono">{error}</p>}
            <Button variant="secondary" className="w-full" isLoading={loading}>Login to Dashboard</Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-bold uppercase tracking-tight mb-2">Registration <span className="text-cyan-500">Vault</span></h1>
            <p className="text-white/40 text-sm font-mono uppercase tracking-widest">TechSpardha 2K26 Administrative Control</p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <Button variant="outline" size="sm" onClick={fetchRegistrations}>
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsAuthenticated(false)}>Logout</Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: 'Total Registrations', value: registrations.length },
            { label: 'Gamer Fiesta', value: registrations.filter(r => r.EventID === '08').length },
            { label: 'Pending Payments', value: registrations.filter(r => r.PaymentStatus === 'Pending Verification').length },
            { label: 'Verified', value: registrations.filter(r => r.PaymentStatus === 'Verified').length },
          ].map((stat) => (
            <div key={stat.label} className="p-6 bg-white/5 border border-white/10">
              <p className="text-[10px] uppercase tracking-widest text-white/40 mb-2">{stat.label}</p>
              <p className="text-3xl font-display font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input 
              className="w-full h-12 bg-white/5 border border-white/10 pl-12 pr-4 text-sm focus:border-cyan-500/50 outline-none"
              placeholder="Search by Name, Reg ID, or Roll No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="md:w-64">
            <select 
              className="w-full h-12 bg-white/5 border border-white/10 px-4 text-sm focus:border-cyan-500/50 outline-none appearance-none"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
            >
              <option value="All">All Events</option>
              {Array.from(new Set(registrations.map(r => r.EventName))).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-white/10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 text-[10px] uppercase tracking-widest text-white/60">
                <th className="px-6 py-4 font-bold border-b border-white/10">ID</th>
                <th className="px-6 py-4 font-bold border-b border-white/10">Participant</th>
                <th className="px-6 py-4 font-bold border-b border-white/10">Event</th>
                <th className="px-6 py-4 font-bold border-b border-white/10">Team</th>
                <th className="px-6 py-4 font-bold border-b border-white/10">Payment</th>
                <th className="px-6 py-4 font-bold border-b border-white/10">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredData.map((reg) => (
                <tr key={reg.RegistrationID} className="hover:bg-white/[0.02] transition-colors text-sm">
                  <td className="px-6 py-4 font-mono text-cyan-500">{reg.RegistrationID}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold">{reg.FullName}</div>
                    <div className="text-xs text-white/40">{reg.StudentID} · {reg.Branch}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-mono uppercase tracking-wider text-cyan-500/60 mb-1">{reg.Category}</div>
                    <div className="font-medium">{reg.EventName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-white/60">{reg.TeamName === 'N/A' ? 'Solo' : reg.TeamName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] px-2 py-1 uppercase font-bold",
                      reg.PaymentStatus === 'Verified' ? "bg-green-500/10 text-green-500" :
                      reg.PaymentStatus === 'Rejected' ? "bg-red-500/10 text-red-500" :
                      "bg-yellow-500/10 text-yellow-500"
                    )}>
                      {reg.PaymentStatus}
                    </span>
                    {reg.PaymentScreenshotURL && (
                      <a href={reg.PaymentScreenshotURL} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center text-cyan-500 hover:underline">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {reg.PaymentStatus !== 'Verified' && (
                        <button 
                          onClick={() => handleUpdateStatus(reg.RegistrationID, 'PaymentStatus', 'Verified')}
                          className="p-1 hover:bg-green-500/20 text-green-500/60 hover:text-green-500 transition-colors"
                          title="Verify Payment"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                      {reg.PaymentStatus !== 'Rejected' && (
                        <button 
                          onClick={() => handleUpdateStatus(reg.RegistrationID, 'PaymentStatus', 'Rejected')}
                          className="p-1 hover:bg-red-500/20 text-red-500/60 hover:text-red-500 transition-colors"
                          title="Reject Payment"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredData.length === 0 && (
            <div className="py-20 text-center text-white/20 uppercase tracking-widest text-sm">
              No matching records found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
