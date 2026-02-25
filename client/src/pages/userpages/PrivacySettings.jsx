import React from "react";
// We only need the reusable component and the layout structure
import PrivacySettingsLogic from "../../components/settings/PrivacySettingsLogic"; 

const PrivacySettings = () => {
  return (
    <div className="max-w-6xl mx-auto space-y-10 p-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* HEADER REMAINS HERE FOR PAGE CONTEXT */}
      <header className="flex items-center gap-4">
        <div className="h-12 w-2 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--p),0.5)]" />
        <h2 className="text-4xl font-black uppercase italic tracking-tighter">
          Privacy <span className="text-primary">&</span> Security
        </h2>
      </header>

      {/* CALL THE REUSABLE COMPONENT 
          This now handles the grid, the password form, the danger zone, 
          the OTP logic, and the modals.
      */}
      <PrivacySettingsLogic />
    </div>
  );
};

export default PrivacySettings;