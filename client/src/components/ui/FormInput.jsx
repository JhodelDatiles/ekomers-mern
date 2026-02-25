import React from "react";

const FormInput = ({ 
  label, 
  value = "", 
  onChange, 
  maxLength, 
  icon: Icon, 
  type = "text", 
  placeholder = "",
  disabled = false,
  isNumeric = false,
  name 
}) => {
  const isLimitReached = maxLength ? value.length > maxLength : false;

  const handleChange = (e) => {
    const val = e.target.value;
    if (isNumeric) {
      const onlyNums = val.replace(/[^0-9]/g, '');
      onChange({ target: { name, value: onlyNums } });
    } else {
      onChange(e);
    }
  };

  return (
    <div className="form-control w-full">
      <div className="flex justify-between items-end mb-1 px-1">
        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 text-white">
          {label}
        </label>
        {maxLength && (
          <span className={`text-[10px] font-bold transition-all duration-300 ${
            isLimitReached ? 'text-error animate-pulse scale-110' : 'opacity-20 text-white'
          }`}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      
      <div className="relative">
        {Icon && (
          <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 z-10 ${
            isLimitReached ? 'text-error' : 'text-white opacity-30'
          }`}>
            <Icon size={16} />
          </div>
        )}
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={`input input-bordered w-full bg-[#1a1c23] font-bold rounded-2xl transition-all duration-300 disabled:opacity-50 text-white
            ${Icon ? 'pl-12' : 'pl-4'}
            ${isLimitReached 
              ? 'border-error focus:border-error ring-2 ring-error/10 bg-error/5' 
              : 'border-white/10 focus:ring-2 focus:ring-primary/50 focus:border-primary'
            }`}
        />
      </div>

      {/* Error Section: Right Aligned & Adaptable */}
      <div className="h-4 mt-1 px-1 flex justify-end"> 
        {isLimitReached && (
          <p className="text-[10px] font-black text-error animate-in slide-in-from-top-1 duration-300 uppercase italic tracking-tight">
            Once Exceeded {maxLength} characters
          </p>
        )}
      </div>
    </div>
  );
};

export default FormInput;