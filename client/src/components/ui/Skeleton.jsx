import React from 'react';

const Skeleton = ({ className }) => {
  return (
    <div className={`relative overflow-hidden bg-white/5 rounded-xl ${className}`}>
      {/* Moving Shimmer Effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] 
                      bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
    </div>
  );
};

// Add this to your tailwind.config.js or index.css for the animation
// @keyframes shimmer {
//   100% { transform: translateX(100%); }
// }

export default Skeleton;