

import React from 'react';

const Video = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', maxWidth: '1200px', margin: '32px auto', padding: '0 16px' }}>
      {/* Video container */}
      <div style={{ position: 'relative', paddingTop: '56.25%', width: '100%' }}>
        <video 
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)' }}
          controls
        >
          <source src="Vedios/trainingvedio.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
};

export default Video;






