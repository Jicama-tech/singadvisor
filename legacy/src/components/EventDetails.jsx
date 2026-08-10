// import React from 'react';
// import { useParams } from 'react-router-dom';
// import Navbar from '../components/Navbar';

// function EventDetails() {
//   const { id } = useParams();

//   const eventDetails = {
//     1: {
//       title: 'Client Appreciation Event 1',
//       image: '/Images/Events/Aug-25 (1).jpeg',
//       description: `The Client Appreciation Event hosted by SP-VK Vision Financial focuses on health and financial security. 
//         Mr. S G Sivakumar discusses updates on osteoarthritis knee treatments. Venkat Kumar explores how CPF and SRS can be 
//         leveraged for a secure retirement. Akila Manikandan talks about strategies for a worry-free retirement.`,
//     },
//     2: {
//       title: 'Client Appreciation Event 2',
//       image: '/Images/Events/Sep-29 (1).jpeg',
//       description: `This Client Appreciation Event invites families and friends to learn about nasal allergies and sinus issues. 
//         Dr. Ravi Seshadri, an ENT surgeon, presents valuable insights on managing these conditions. Venkat Kumar covers CPF and SRS 
//         options for securing a comfortable retirement. Akila Manikandan discusses financial planning for a worry-free future.`,
//     },
//   };

//   const event = eventDetails[id];

//   if (!event) {
//     return (
//       <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }}>
//         <p style={{ textAlign: 'center', fontSize: '18px', color: '#4a5568' }}>Event not found.</p>
//       </div>
//     );
//   }

//   return (
//     <>
//       <div style={{ marginTop: '80px' }}></div>
//       <Navbar />

//       <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
//         {/* Page Heading */}
//         <h1 style={{ fontSize: '32px', textAlign: 'center', fontWeight: 'bold', marginBottom: '24px' }}>
//           {event.title}
//         </h1>

//         {/* Card Layout */}
//         <div
//           style={{
//             display: 'flex',
//             flexDirection: 'row', // Use row direction for left-right layout
//             border: '1px solid #e2e8f0',
//             borderRadius: '8px',
//             overflow: 'hidden',
//             boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
//             flexWrap: 'wrap', // Wrap on smaller screens
            
//           }}
          
//         >
          
//           {/* Left side: Image */}
//           <div style={{ flex: '1', minWidth: '300px', maxWidth: '50%', margin: 0 }}>
//             <div style={{ display: 'flex', justifyContent: 'center' }}> {/* Center image on mobile */}
//               <img
//                 src={event.image}
//                 alt={event.title}
//                 style={{
//                   width: '100%',
//                   height: 'auto',
//                   objectFit: 'cover',
//                 }}
//               />
//             </div>
//           </div>

//           {/* Right side: Description */}
//           <div style={{ flex: '1', padding: '24px', textAlign: 'center', margin: 0 }}>
//             <p style={{ fontSize: '18px', lineHeight: '1.6', color: '#4a5568' }}>
//               {event.description}
//             </p>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// export default EventDetails;

import React from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';

function EventDetails() {
  const { id } = useParams();

  const eventDetails = {
    1: {
      title: 'Client Appreciation Event 1',
      image: '/Images/Events/Aug-25 (1).jpeg',
      description: `The Client Appreciation Event hosted by SP-VK Vision Financial focuses on health and financial security. 
        Mr. S G Sivakumar discusses updates on osteoarthritis knee treatments. Venkat Kumar explores how CPF and SRS can be 
        leveraged for a secure retirement. Akila Manikandan talks about strategies for a worry-free retirement.`,
    },
    2: {
      title: 'Client Appreciation Event 2',
      image: '/Images/Events/Sep-29 (1).jpeg',
      description: `This Client Appreciation Event invites families and friends to learn about nasal allergies and sinus issues. 
        Dr. Ravi Seshadri, an ENT surgeon, presents valuable insights on managing these conditions. Venkat Kumar covers CPF and SRS 
        options for securing a comfortable retirement. Akila Manikandan discusses financial planning for a worry-free future.`,
    },
  };

  const event = eventDetails[id];

  if (!event) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }}>
        <p style={{ textAlign: 'center', fontSize: '18px', color: '#4a5568' }}>Event not found.</p>
      </div>
    );
  }

  return (
    <>
      <div style={{ marginTop: '80px' }}></div>
      <Navbar />

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Page Heading */}
        <h1 style={{ fontSize: '32px', textAlign: 'center', fontWeight: 'bold', marginBottom: '24px' }}>
          {event.title}
        </h1>

        {/* Card Layout */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row', // Use row direction for left-right layout
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            flexWrap: 'wrap', // Wrap on smaller screens
            justifyContent: 'center', // Center content in the card
          }}
        >
          {/* Left side: Image */}
          <div style={{ flex: '1', minWidth: '390px', maxWidth: '50%', margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}> {/* Center image on mobile */}
              <img
                src={event.image}
                alt={event.title}
                style={{
                  width: '100%',
                  height: 'auto',
                  objectFit: 'cover',
                }}
              />
            </div>
          </div>

          {/* Right side: Description */}
          <div style={{ flex: '1', padding: '24px', textAlign: 'center', margin: 0 }}>
            <p style={{ fontSize: '18px', lineHeight: '1.6', color: '#4a5568', margin: '0 auto', maxWidth: '600px' }}>
              {event.description}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default EventDetails;
