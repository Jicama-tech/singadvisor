

// import React from 'react';
// import { Link } from 'react-router-dom';
// import Navbar from '../components/Navbar';
// import WhatsAppButton from '../components/WhatsAppButton';
// import Footer from '../components/Footer';


// function Events() {
//   const events = [
//     { 
//       id: 1, 
//       title: 'Client Appreciation Event', 
//       date: 'Jul-25-2024 ', 
//       location: '3 Tampines Grande, Singapore - 528733', 
//       speakers: ['MR. SG.SivaKumar', 'Venkat Kumar', 'Akila Manikandan'],
//       image: '/Images/Events/Aug-25 (1).jpeg', // Add image path for each event
//       formLink: 'https://drive.google.com/file/d/1dZFpeIkmQ1e-4g8cwcbXjw067dRzjrPT/view?usp=drive_link' 
//     },
//     { 
//       id: 2, 
//       title: 'Client Appreciation Event', 
//       date: 'Sep-29-2024', 
//       location: '3 Tampines Grande, Singapore - 528733', 
//       speakers: ['Venkat Kumar', 'Akila Manikandan', 'Dakshaini'],
//       image: '/Images/Events/Sep-29 (1).jpeg', // Add image path for each event
//       formLink: 'https://drive.google.com/file/d/1_-CCQWgVRR6lLTq1lfNFIRNzSwPoD-uA/view?usp=drive_link' 
//     },
//   ];

//   return (
//     <>
//       <div style={{ marginTop: '80px' }}><Navbar/></div>

//       <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
//         <h1 style={{ fontSize: '28px', fontWeight: 'bold', textAlign: 'center', marginBottom: '24px' }}>Events</h1>

//         {/* Flexbox container for horizontal cards
//         <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
//           {events.map((event) => (
//             <div 
//               key={event.id} 
//               style={{ 
//                 display: 'flex', 
//                 backgroundColor: '#ffffff', 
//                 boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', 
//                 borderRadius: '8px', 
//                 overflow: 'hidden',
//                 border: '1px solid #e2e8f0'
//               }}
//             > */}
//             {/* Responsive Grid container */}
//         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
//           {events.map((event) => (
//             <div 
//               key={event.id} 
//               style={{ 
//                 display: 'flex', 
//                 flexDirection: 'column',
//                 backgroundColor: '#ffffff', 
//                 boxShadow: '0 6px 12px rgba(0, 0, 0, 0.1)', 
//                 borderRadius: '12px', 
//                 overflow: 'hidden',
//                 border: '1px solid #e5e7eb',
//                 transition: 'transform 0.3s ease-in-out',
//                 cursor: 'pointer',
//                 hover: {
//                   transform: 'scale(1.03)',
//                   boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)'
//                 }
//               }}
//             >
             
//               {/* Event details section */}
//               <div style={{ flex: '1', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
//                 <div>
//                   <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#2d3748', marginBottom: '8px' }}>{event.title}</h2>
//                   <p style={{ fontSize: '14px', color: '#718096' }}>Date: {event.date}</p>
//                   <p style={{ fontSize: '14px', color: '#718096' }}>Location: {event.location}</p>
//                   <p style={{ fontSize: '14px', color: '#718096' }}>Speakers: {event.speakers.join(', ')}</p>
//                 </div>

//                 {/* Link to navigate to Event Details page */}
//                 <Link 
//                   to={`/events/${event.id}`} 
//                   style={{ color: '#3182ce', textDecoration: 'underline', marginTop: '8px' }}
//                 >
//                   View Event Details
//                 </Link>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//       <WhatsAppButton/>
//       <Footer/>
//     </>
//   );
// }

// export default Events;

// import React from 'react';
// import { Link } from 'react-router-dom';
// import Navbar from '../components/Navbar';
// import WhatsAppButton from '../components/WhatsAppButton';
// import Footer from '../components/Footer';

// function Events() {
//   const events = [
//     { 
//       id: 1, 
//       title: 'Client Appreciation Event', 
//       date: 'Jul-25-2024', 
//       location: '3 Tampines Grande, Singapore - 528733', 
//       speakers: ['MR. SG.SivaKumar', 'Venkat Kumar', 'Akila Manikandan'],
//       image: '/Images/Events/Aug-25 (1).jpeg', 
//       formLink: 'https://drive.google.com/file/d/1dZFpeIkmQ1e-4g8cwcbXjw067dRzjrPT/view?usp=drive_link' 
//     },
//     { 
//       id: 2, 
//       title: 'Client Appreciation Event', 
//       date: 'Sep-29-2024', 
//       location: '3 Tampines Grande, Singapore - 528733', 
//       speakers: ['Venkat Kumar', 'Akila Manikandan', 'Dakshaini'],
//       image: '/Images/Events/Sep-29 (1).jpeg', 
//       formLink: 'https://drive.google.com/file/d/1_-CCQWgVRR6lLTq1lfNFIRNzSwPoD-uA/view?usp=drive_link' 
//     },
//     {
//       id: 3,
//       title: 'Client Appreciation Event',
//       date: 'Yet to be Conducted', // Clearly indicating the event has not yet occurred
//       location: '3 Tampines Grande, Singapore - 528733',
//       speakers: ['Venkat Kumar', 'Akila Manikandan', 'Dakshaini'],
//       image: '/Images/Events/Sep-29 (1).jpeg',
//       formLink: 'https://drive.google.com/file/d/1_-CCQWgVRR6lLTq1lfNFIRNzSwPoD-uA/view?usp=drive_link'
//     }
    
//   ];

//   return (
//     <>
//       <div style={{ marginTop: '80px' }}><Navbar/></div>

//       <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
//         <h1 style={{ fontSize: '28px', fontWeight: 'bold', textAlign: 'center', marginBottom: '24px' }}>Events</h1>

//         {/* Responsive Grid layout */}
//         <div style={{
//           display: 'grid', 
//           gridTemplateColumns: '1fr 1fr', 
//           gap: '24px', 
//           maxWidth: '1200px',
//           margin: '0 auto',
//           padding: '24px',
//         }}>
//           {events.map((event) => (
//             <div 
//               key={event.id} 
//               style={{ 
//                 display: 'flex', 
//                 flexDirection: 'column',
//                 backgroundColor: '#ffffff', 
//                 boxShadow: '0 6px 12px rgba(0, 0, 0, 0.1)', 
//                 borderRadius: '12px', 
//                 overflow: 'hidden',
//                 border: '1px solid #e5e7eb',
//                 transition: 'transform 0.3s ease-in-out',
//               }}
//             >
//               {/* <img 
//                 src={event.image} 
//                 alt={event.title} 
//                 style={{ 
//                   width: '100%', 
//                   height: '200px', 
//                   objectFit: 'contain', 
//                   borderBottom: '1px solid #e5e7eb' 
//                 }} 
//               /> */}
              
//               {/* Event details section */}
//               <div style={{ flex: '1', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
//                 <div>
//                   <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#2d3748', marginBottom: '8px' }}>{event.title}</h2>
//                   <p style={{ fontSize: '14px', color: '#718096' }}>Date: {event.date}</p>
//                   <p style={{ fontSize: '14px', color: '#718096' }}>Location: {event.location}</p>
//                   <p style={{ fontSize: '14px', color: '#718096' }}>Speakers: {event.speakers.join(', ')}</p>
//                 </div>

//                 {/* Link to navigate to Event Details page */}
//                 <Link 
//   to={`/events/${event.id}`} 
//   style={{
//     color: '#333', 
//     backgroundColor: '#90ee90', 
//     padding: '10px 20px', 
//     borderRadius: '5px', 
//     textDecoration: 'none', 
//     display: 'inline-block', 
//     fontSize: '16px', 
//     fontWeight: 'bold', 
//     transition: 'background-color 0.3s ease, transform 0.3s ease',
   
//   }}
//   onMouseEnter={(e) => {
//     e.target.style.backgroundColor = '#90ee90'; 
//     e.target.style.transform = 'scale(1.05)';
//   }}
 
// >
//   View Event Details
// </Link>

//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
      
//       <WhatsAppButton/>
//       <Footer/>

//       {/* Responsive design for smaller screens */}
//       <style>
//         {`
//           @media (max-width: 768px) {
//             div[style*="gridTemplateColumns"] {
//               grid-template-columns: 1fr;
//               padding: 16px;
//             }
//             img {
//               height: 150px;
//             }
//             h1 {
//               font-size: 24px;
//             }
//             h2 {
//               font-size: 18px;
//             }
//             p {
//               font-size: 12px;
//             }
//           }
//         `}
//       </style>
//     </>
//   );
// }

// export default Events;

import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import WhatsAppButton from '../components/WhatsAppButton';
import Footer from '../components/Footer';

function Events() {
  const events = [
    { 
      id: 1, 
      title: 'Client Appreciation Event', 
      date: 'Jul-25-2024', 
      location: '3 Tampines Grande, Singapore - 528733', 
      speakers: ['MR. SG.SivaKumar', 'Venkat Kumar', 'Akila Manikandan'],
      image: '/Images/Events/Aug-25 (1).jpeg', 
      formLink: 'https://drive.google.com/file/d/1dZFpeIkmQ1e-4g8cwcbXjw067dRzjrPT/view?usp=drive_link' 
    },
    { 
      id: 2, 
      title: 'Client Appreciation Event', 
      date: 'Sep-29-2024', 
      location: '3 Tampines Grande, Singapore - 528733', 
      speakers: ['Venkat Kumar', 'Akila Manikandan', 'Dakshaini'],
      image: '/Images/Events/Sep-29 (1).jpeg', 
      formLink: 'https://drive.google.com/file/d/1_-CCQWgVRR6lLTq1lfNFIRNzSwPoD-uA/view?usp=drive_link' 
    },
    // {
    //   id: 3,
    //   title: 'Client Appreciation Event',
    //   date: 'Yet to be Conducted',
    //   location: '3 Tampines Grande, Singapore - 528733',
    //   speakers: ['Venkat Kumar', 'Akila Manikandan', 'Dakshaini'],
    //   image: '/Images/Events/Sep-29 (1).jpeg',
    //   formLink: 'https://drive.google.com/file/d/1_-CCQWgVRR6lLTq1lfNFIRNzSwPoD-uA/view?usp=drive_link'
    // }
  ];

  return (
    <>
      <div style={{ marginTop: '80px' }}><Navbar/></div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', textAlign: 'center', marginBottom: '24px' }}>Events</h1>

        {/* Responsive Grid layout */}
        <div style={{
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: '24px', 
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '24px',
        }}>
          {events.map((event) => (
            <div 
              key={event.id} 
              style={{ 
                display: 'flex', 
                flexDirection: 'column',
                backgroundColor: '#ffffff', 
                boxShadow: '0 6px 12px rgba(0, 0, 0, 0.1)', 
                borderRadius: '12px', 
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
                transition: 'transform 0.3s ease-in-out',
              }}
            >
              <img 
                src={event.image} 
                alt={event.title} 
                style={{ 
                  width: '100%', 
                  height: '200px', 
                  objectFit: 'scale-down', 
                  borderBottom: '1px solid #e5e7eb' 
                }} 
              />
              
              {/* Event details section */}
              <div style={{ flex: '1', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#2d3748', marginBottom: '8px' }}>{event.title}</h2>
                  <p style={{ fontSize: '14px', color: '#718096' }}>Date: {event.date}</p>
                  <p style={{ fontSize: '14px', color: '#718096' }}>Location: {event.location}</p>
                  <p style={{ fontSize: '14px', color: '#718096' }}>Speakers: {event.speakers.join(', ')}</p>
                </div>

                <Link 
                  to={`/events/${event.id}`} 
                  style={{
                    color: '#333', 
                    backgroundColor: '#90ee90', 
                    padding: '10px 20px', 
                    borderRadius: '5px', 
                    textDecoration: 'none', 
                    display: 'inline-block', 
                    fontSize: '16px', 
                    fontWeight: 'bold', 
                    transition: 'background-color 0.3s ease, transform 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#76c776'; 
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#90ee90';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  View Event Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <WhatsAppButton/>
      <Footer/>

      {/* Responsive design for smaller screens */}
      <style>
        {`
          @media (max-width: 768px) {
            div[style*="gridTemplateColumns"] {
              grid-template-columns: 1fr;
              padding: 16px;
            }
            img {
              height: 150px;
            }
            h1 {
              font-size: 24px;
            }
            h2 {
              font-size: 18px;
            }
            p {
              font-size: 12px;
            }
          }
        `}
      </style>
    </>
  );
}

export default Events;
