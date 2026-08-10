// import React from 'react'

// function WhatsAppButton() {
//   return (
//     <div>
      
//     </div>
//   )
// }

// export default WhatsAppButton


import React from 'react';

function WhatsAppButton() {
  return (
    <div>
      <a
        href="https://wa.me/6592377656" // Replace with your WhatsApp number
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#25D366',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0px 2px 10px rgba(0, 0, 0, 0.3)',
        }}
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/5/5e/WhatsApp_icon.png" // You can replace this URL with your icon link
          alt="WhatsApp"
          style={{ width: '35px', height: '35px' }}
        />
      </a>
    </div>
  );
}

export default WhatsAppButton;
