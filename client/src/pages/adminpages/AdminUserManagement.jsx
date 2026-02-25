import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Users, Search, Shield, ShieldCheck, Mail, 
  Calendar, Trash2, Crown, RefreshCw, Smartphone,
  UserRoundSearch, Cake, UserCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { adminUserAPI } from "../../services/api.js";
import UserManagementSkeleton from "../../components/skeletons/adminskeletons/UserManagementSkeleton.jsx"

// ============================================================================
// SUB-COMPONENT: UserRow
// ============================================================================
const UserRow = React.memo(({ user, onRoleChange, onDelete, formatDate, getRoleBadgeClass }) => (
  <tr className="hover:bg-base-200/40 transition-all border-b border-base-200/50">
    <td className="py-4 pl-6">
      <div className="flex items-center gap-3">
        <div className={`avatar rounded-xl w-10 h-10 flex items-center justify-center font-black shadow-inner overflow-hidden border border-base-300 ${
          user.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-base-300 text-base-content/50'
        }`}>
          {user.profilePic?.url ? (
            <img src={user.profilePic.url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs">{user.username?.[0].toUpperCase()}</span>
          )}
        </div>
        <div>
          <div className="font-black text-sm uppercase flex items-center gap-2 tracking-tighter">
            {user.username}
            {user.role === 'admin' && <Crown className="w-3 h-3 text-primary" />}
          </div>
          <div className="text-[10px] opacity-60 font-black uppercase italic text-primary/70">
            {user.fullName || "Name Not Provided"}
          </div>
        </div>
      </div>
    </td>

    <td>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[11px] font-bold opacity-80">
          <Mail className="w-3 h-3 opacity-40" /> {user.email}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black italic opacity-40">
          <Smartphone className="w-3 h-3" /> {user.phone || "No Phone"}
        </div>
      </div>
    </td>

    <td>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase opacity-60">
          <UserRoundSearch className="w-3 h-3 text-primary" /> {user.gender || "Undefined"}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase opacity-40">
          <Cake className="w-3 h-3" /> {user.dob ? formatDate(user.dob) : "N/A"}
        </div>
      </div>
    </td>

    <td>
      <div className="dropdown dropdown-left lg:dropdown-bottom lg:dropdown-end"> 
        <label 
          tabIndex={0} 
          className={`badge badge-sm font-black uppercase px-3 py-2 cursor-pointer transition-all active:scale-95 hover:scale-105 border-none shadow-sm ${getRoleBadgeClass(user.role)}`}
        >
          {user.role === 'admin' ? <ShieldCheck className="w-3 h-3 mr-1" /> : <Shield className="w-3 h-3 mr-1" />}
          {user.role}
        </label>
        <ul 
          tabIndex={0} 
          className="dropdown-content z-[100] menu p-2 shadow-2xl bg-base-100 rounded-xl w-44 border border-base-300"
        >
          <li className="menu-title text-[9px] opacity-40 uppercase font-black px-2 mb-1">Access Level</li>
          <li>
            <button onClick={() => onRoleChange(user._id, 'user')} className="text-[10px] font-bold py-2 hover:bg-base-200 rounded-lg">
              <Shield className="w-3 h-3" /> DEMOTE TO USER
            </button>
          </li>
          <li>
            <button onClick={() => onRoleChange(user._id, 'admin')} className="text-[10px] font-bold py-2 hover:bg-primary/10 rounded-lg">
              <ShieldCheck className="w-3 h-3 text-primary" /> PROMOTE TO ADMIN
            </button>
          </li>
        </ul>
      </div>
    </td>

    <td className="text-right pr-6">
      <div className="flex flex-col items-end gap-1">
        <span className="text-[10px] font-black uppercase opacity-40 tracking-widest">{formatDate(user.createdAt)}</span>
        <button 
          onClick={() => onDelete(user._id)} 
          className="btn btn-ghost btn-xs text-error hover:bg-error/10 transition-colors rounded-lg"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </td>
  </tr>
));

// ============================================================================
// MAIN COMPONENT: UserManagement
// ============================================================================
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(inputValue), 400);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const fetchUsers = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      else setIsRefreshing(true);
      const data = await adminUserAPI.getAllUsers();
      setUsers(Array.isArray(data) ? data : (data.users || []));
    } catch (err) {
      toast.error("Database sync failed");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchUsers(true); }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        user.username?.toLowerCase().includes(query) || 
        user.email?.toLowerCase().includes(query) ||
        user.fullName?.toLowerCase().includes(query);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    users: users.length - users.filter(u => u.role === 'admin').length
  }), [users]);

  const handleRoleChange = async (userId, newRole) => {
    const toastId = toast.loading("Updating role...");
    try {
      await adminUserAPI.updateUser(userId, { role: newRole });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
      toast.success(`User role updated to ${newRole}`, { id: toastId });
    } catch (err) {
      toast.error("Access change failed", { id: toastId });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("This action is permanent. Delete account?")) return;
    try {
      await adminUserAPI.deleteUser(userId);
      setUsers(prev => prev.filter(u => u._id !== userId));
      toast.success("Account purged from database");
    } catch (err) {
      toast.error("Wipe failed");
    }
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric' 
  });
  
  const getRoleBadgeClass = (r) => r === 'admin' 
    ? 'bg-primary text-primary-content' 
    : 'bg-base-300 text-base-content/70';

    if (loading) return <UserManagementSkeleton />;
  return (
    <div className="h-[calc(100vh-120px)] overflow-y-auto pr-2 custom-scrollbar">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic flex items-center gap-3">
            <UserCircle className="w-10 h-10 text-primary" /> User Database
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">{stats.total} Active Nodes</span>
            {isRefreshing && <RefreshCw className="w-3 h-3 animate-spin text-primary" />}
          </div>
        </div>

        <div className="flex gap-4 w-full lg:w-auto">
          <div className="bg-base-200/50 px-6 py-4 rounded-[2rem] border border-base-300 shadow-sm backdrop-blur-md text-center min-w-[120px]">
            <p className="text-[9px] font-black opacity-40 uppercase tracking-widest">Admins</p>
            <p className="text-2xl font-black text-primary">{stats.admins}</p>
          </div>
          <div className="bg-base-200/50 px-6 py-4 rounded-[2rem] border border-base-300 shadow-sm backdrop-blur-md text-center min-w-[120px]">
            <p className="text-[9px] font-black opacity-40 uppercase tracking-widest">Members</p>
            <p className="text-2xl font-black">{stats.users}</p>
          </div>
        </div>
      </div>

      {/* SEARCH/FILTER */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
          <input 
            type="text" placeholder="Scan by username, email or full name..."
            className="input input-bordered w-full pl-12 bg-base-200/50 border-none focus:ring-2 ring-primary transition-all rounded-2xl font-bold"
            value={inputValue} onChange={(e) => setInputValue(e.target.value)}
          />
        </div>
        <select 
          className="select select-bordered bg-base-200/50 border-none font-black uppercase text-[10px] rounded-2xl tracking-widest"
          value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">Display All</option>
          <option value="admin">Admins Only</option>
          <option value="user">Users Only</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-base-100 border border-base-300 rounded-[2.5rem] shadow-sm mb-20 overflow-visible relative">
        <div className="overflow-visible"> 
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <span className="loading loading-infinity loading-lg text-primary"></span>
              <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em]">Establishing secure connection...</p>
            </div>
          ) : (
            <table className="table w-full border-separate border-spacing-0">
              <thead className="bg-base-200/40">
                <tr className="text-[10px] uppercase font-black opacity-40 border-none">
                  <th className="py-5 pl-6 rounded-tl-[2.5rem]">Identity</th>
                  <th>Communication</th>
                  <th>Bio Data</th>
                  <th>Privileges</th>
                  <th className="text-right pr-6 rounded-tr-[2.5rem]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base-200/50">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map(user => (
                    <UserRow 
                      key={user._id} 
                      user={user} 
                      onRoleChange={handleRoleChange} 
                      onDelete={handleDeleteUser}
                      formatDate={formatDate}
                      getRoleBadgeClass={getRoleBadgeClass}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-20 text-center opacity-30 font-black uppercase italic text-xs tracking-widest">
                      Zero results match your query
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;