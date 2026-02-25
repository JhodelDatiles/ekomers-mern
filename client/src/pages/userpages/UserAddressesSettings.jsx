import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Home, Briefcase, Loader2, Signal } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api"; 
import { useAuth } from "../../context/AuthContext"; 
import OrderDetailsModal from "../../components/modals/OrderDetailsModal";
import ConfirmDeleteModal from "../../components/modals/ConfirmationModals";
import AddressSkeletonList from "../../components/skeletons/AddressSkeletonList";

const UserAddressesSettings = () => {
  const { setUser } = useAuth(); 
  const [addresses, setAddresses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nodeToPurge, setNodeToPurge] = useState(null); // Modal state for delete
  const [loading, setLoading] = useState(false);
  const [initialFetch, setInitialFetch] = useState(true);

  const initialFormState = {
    fullName: "", contactNumber: "", street: "", barangay: "",
    city: "", postalCode: "", label: "Home", isDefault: false,
  };

  const [currentAddress, setCurrentAddress] = useState(initialFormState);

  const fetchAddresses = async () => {
    try {
      setInitialFetch(true);
      const { data } = await api.get("/users/profile");
      setAddresses(data.address || []);
    } catch (err) { toast.error("Logistics sync failed"); } 
    finally { setInitialFetch(false); }
  };

  useEffect(() => { fetchAddresses(); }, []);

  const broadcastUpdate = (updatedUser) => {
    if (setUser) setUser(updatedUser);
    window.dispatchEvent(new CustomEvent('profileUpdated', { detail: updatedUser }));
  };

  const handleDelete = async () => {
    if (!nodeToPurge) return;
    setLoading(true);
    try {
      const updatedList = addresses.filter(a => a._id !== nodeToPurge._id);
      const { data } = await api.put("/users/profile", { address: updatedList });
      const freshUser = data.user || data;
      setAddresses(freshUser.address || []);
      broadcastUpdate(freshUser);
      toast.success("Node Terminated Successfully");
      setNodeToPurge(null);
    } catch (err) { 
      toast.error("Termination Failed"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleSaveAddress = async (formData) => {
    setLoading(true);
    try {
      const fullAddr = `${formData.street}, ${formData.barangay}, ${formData.city}, ${formData.postalCode}`;
      const newEntry = { ...formData, address: fullAddr };
      const prepareList = (list) => formData.isDefault ? list.map(a => ({ ...a, isDefault: false })) : list;

      let updatedAddresses = formData._id 
        ? prepareList(addresses).map(a => a._id === formData._id ? { ...newEntry, _id: formData._id } : a)
        : [...prepareList(addresses), newEntry];

      const { data } = await api.put("/users/profile", { address: updatedAddresses });
      const freshUser = data.user || data;
      setAddresses(freshUser.address || []);
      broadcastUpdate(freshUser);
      toast.success("Node Synchronized");
      setIsModalOpen(false);
    } catch (err) { toast.error("Sync Failed"); } 
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 mb-10 relative">
      <header className="flex justify-between items-end border-b border-white/5 pb-8">
        <div>
          <h2 className="text-4xl font-black uppercase italic tracking-tighter text-white">Shipping <span className="text-primary">Nodes</span></h2>
          <p className="text-[10px] font-black opacity-40 uppercase tracking-widest text-white italic">Manage delivery endpoints</p>
        </div>
        <button onClick={() => { setCurrentAddress(initialFormState); setIsModalOpen(true); }} className="btn btn-primary rounded-2xl font-black italic text-white">
          <Plus size={18} /> Add New Node
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {initialFetch ? (
          <AddressSkeletonList />
        ) : addresses.length === 0 ? (
          <div className="p-20 text-center bg-base-200/20 rounded-[40px] border border-dashed border-white/10">
            <Signal size={48} className="mx-auto opacity-10 mb-4 text-white" />
            <p className="font-black uppercase italic opacity-20 text-white">No active nodes detected</p>
          </div>
        ) : (
          addresses.map((addr) => (
            <div key={addr._id} className="group p-6 bg-base-200/50 backdrop-blur-sm rounded-[32px] border border-white/5 flex justify-between items-center hover:border-primary/30 transition-all shadow-xl">
              <div className="flex gap-6 items-center">
                <div className="p-5 bg-white/5 rounded-2xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  {addr.label === 'Work' ? <Briefcase size={20}/> : <Home size={20}/>}
                </div>
                <div>
                  <h3 className="font-black text-xl italic uppercase text-white">
                    {addr.fullName} 
                    {addr.isDefault && <span className="ml-3 badge badge-primary badge-outline text-[8px] italic font-black">DEFAULT</span>}
                  </h3>
                  <p className="text-sm text-white/60 mt-1 max-w-md italic leading-tight">{addr.address}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => { setCurrentAddress(addr); setIsModalOpen(true); }} className="btn btn-square btn-ghost text-white/20 hover:text-white"><Edit2 size={18}/></button>
                <button onClick={() => setNodeToPurge(addr)} className="btn btn-square btn-ghost text-white/20 hover:text-error"><Trash2 size={18}/></button>
              </div>
            </div>
          ))
        )}
      </div>

      <OrderDetailsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveAddress} initialData={currentAddress} loading={loading} />
      
      <ConfirmDeleteModal 
        isOpen={!!nodeToPurge} 
        onClose={() => setNodeToPurge(null)} 
        onConfirm={handleDelete} 
        orderId={nodeToPurge?._id} 
        mode="delete" 
        loading={loading} 
      />
    </div>
  );
};

export default UserAddressesSettings;