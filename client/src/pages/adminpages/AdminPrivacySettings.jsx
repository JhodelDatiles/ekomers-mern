import React from "react";
import PrivacySettingsLogic from "../../components/settings/PrivacySettingsLogic"; 

const AdminPrivacySettings = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-10 p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <header className="flex items-center gap-4 bg-base-200 p-8 rounded-[32px] border border-base-300 shadow-sm">
        <div className="h-12 w-2 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--p),0.5)]" />
        <div>
          <h2 className="text-3xl font-black uppercase italic tracking-tighter">
            Admin <span className="text-primary">Security</span>
          </h2>
          <p className="text-[10px] font-black opacity-50 uppercase tracking-widest mt-1">
            Credential Management
          </p>
        </div>
      </header>

      <PrivacySettingsLogic />
    </div>  
  );
};

export default AdminPrivacySettings;