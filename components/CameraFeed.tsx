
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

interface CameraFeedProps {
  stream: MediaStream | null;
}

const CameraFeed = forwardRef<HTMLVideoElement, CameraFeedProps>(({ stream }, ref) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => localVideoRef.current as HTMLVideoElement);

  useEffect(() => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="absolute inset-0 w-full h-full bg-black">
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
    </div>
  );
});

CameraFeed.displayName = 'CameraFeed';

export default CameraFeed;
