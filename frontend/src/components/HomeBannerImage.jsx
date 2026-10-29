import React, { useEffect, useState } from 'react';
import { bannerApi, bannerImageSource } from '../api/bannerApi.jsx';

function usePublicBannerImages() {
  const [slots, setSlots] = useState([]);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    bannerApi.list({ signal: controller.signal }).then(data => { if (active) setSlots(data); })
      .catch(() => { if (active) setSlots([]); });
    return () => { active = false; controller.abort(); };
  }, []);
  return slots;
}

export default function HomeBannerImage({ position }) {
  const slots = usePublicBannerImages();
  const [failedUrl, setFailedUrl] = useState('');
  const url = slots.find(slot => slot.position === position)?.url;
  const source = bannerImageSource(url);
  if (!source || source === failedUrl) return null;
  return <img key={source} src={source} alt="" aria-hidden="true" data-banner-position={position}
    decoding="async" loading="eager" onError={() => setFailedUrl(source)}
    className="absolute inset-0 z-0 w-full h-full object-cover object-center pointer-events-none" />;
}
