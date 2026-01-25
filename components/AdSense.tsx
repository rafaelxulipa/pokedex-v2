import React, { useEffect } from 'react';

// Extend window interface to support adsbygoogle
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdSenseProps {
  className?: string;
  style?: React.CSSProperties;
  format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal';
  responsive?: string;
  slot?: string;
}

const AdSense: React.FC<AdSenseProps> = ({ 
  className = "", 
  style = { display: 'block' }, 
  format = 'auto',
  responsive = 'true',
  slot = '8207137273'
}) => {
  useEffect(() => {
    try {
      // Push the ad to the queue
      // This verifies if adsbygoogle exists to avoid crashes with AdBlockers
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  return (
    <div className={`adsense-container w-full overflow-hidden ${className}`}>
        {/* 
            IMPORTANTE: 
            Substitua 'data-ad-client' pelo seu Publisher ID (ex: ca-pub-123456789)
            Substitua 'data-ad-slot' pelo ID do seu bloco de anúncios.
        */}
        <ins
            className="adsbygoogle"
            style={style}
            data-ad-client="ca-pub-0079702856690089" 
            data-ad-slot={slot}
            data-ad-format={format}
            data-full-width-responsive={responsive}
        />
        
        {/* Placeholder visual para desenvolvimento (remove em produção se desejar) */}
        {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-200 dark:bg-gray-800 border-2 border-dashed border-gray-400 dark:border-gray-600 text-gray-500 text-xs font-mono p-4 text-center mt-2 rounded-lg">
                Google AdSense Space <br/> (Client/Slot ID required)
            </div>
        )}
    </div>
  );
};

export default AdSense;