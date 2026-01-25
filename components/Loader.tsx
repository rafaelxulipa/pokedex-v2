import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex justify-center items-center p-10">
      <div className="relative w-20 h-20 animate-spin">
        <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-gray-200 dark:border-gray-700 opacity-25"></div>
        <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-transparent border-t-red-500 border-r-red-500"></div>
      </div>
    </div>
  );
};

export default Loader;
