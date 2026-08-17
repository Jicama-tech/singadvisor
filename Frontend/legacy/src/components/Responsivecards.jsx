

// import React from 'react';

// const cardData = [
//   {
//     title: "TRAININGS",
//     description: "Enhance your skills with our expert-led training programs.",
//     linkText: "Learn More",
//     linkUrl: "/",
//     imageUrl: "/Images/Trainingimgae/traing.jpg" 
//   },
//   {
//     title: "CONSULTANCY",
//     description: "Get professional advice to optimize your business processes.",
//     linkText: "Explore",
//     linkUrl: "https://docs.google.com/forms/d/1sI7UfO8WWRfazTRIHstGaX7mj-3KPnFxumyBaRguxt0/edit",
//     imageUrl: "/Images/Trainingimgae/consultancy.jpg" 
//   },
//   {
//     title: "CAREERS",
//     description: "Join our team and grow your career in a dynamic environment.",
//     linkText: "Get Started",
//     linkUrl: "https://docs.google.com/forms/d/1a0cxyGMmVW0P0K20M9dBKfu5hySIuO2nt0SE6k-xcxY/edit",
//     imageUrl: "/Images/Trainingimgae/career.jpg" 
//   },
// ];

// function ResponsiveCards() {
//   return (
//     <div style={{
//       display: 'grid',
//       gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
//       gap: '20px',
//       padding: '20px',
//     }}>
//       {cardData.map((card, index) => (
//         <div key={index} style={{
//           border: '1px solid #ddd',
//           borderRadius: '8px',
//           overflow: 'hidden',
//           display: 'flex',
//           flexDirection: 'column',
//           backgroundColor: '#ffffff',
//           boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
//         }}>
//           <img 
//             src={card.imageUrl} 
//             alt={card.title}
//             style={{
//               width: '100%',
//               height: '200px',
//               objectFit: 'cover',
//             }}
//           />
//           <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
//             <h2 style={{
//               fontSize: '1.5rem',
//               marginBottom: '10px',
//               color: '#333',
//             }}>{card.title}</h2>
//             <p style={{
//               fontSize: '1rem',
//               color: '#666',
//               marginBottom: '20px',
//               flex: 1,
//             }}>{card.description}</p>
//             <a 
//               href={card.linkUrl}
//               style={{
//                 display: 'inline-block',
//                 padding: '10px 15px',
//                 backgroundColor: '#90ee90',
//                 color: 'white',
//                 textDecoration: 'none',
//                 borderRadius: '5px',
//                 textAlign: 'center',
//                 transition: 'background-color 0.3s',
//                 alignSelf: 'flex-start',
//               }}
//               onMouseEnter={(e) => e.target.style.backgroundColor = '#90ee90'}
//               onMouseLeave={(e) => e.target.style.backgroundColor = '#90ee90'}
//             >
//               {card.linkText}
//             </a>
//           </div>
//         </div>
//       ))}
//     </div>
//   );
// }

// export default ResponsiveCards;

import React from 'react';
import { Link } from 'react-router-dom';

const cardData = [
  {
    title: "TRAININGS",
    description: "Enhance your skills with our expert-led training programs.",
    linkText: "Learn More",
    linkUrl: "/Trainings",
    imageUrl: "/Images/Trainingimgae/traing.jpg"
  },
  {
    title: "CONSULTANCY",
    description: "Get professional advice to optimize your business processes.",
    linkText: "Explore",
    linkUrl: "https://docs.google.com/forms/d/1sI7UfO8WWRfazTRIHstGaX7mj-3KPnFxumyBaRguxt0/edit",
    imageUrl: "/Images/Trainingimgae/consultancy.jpg"
  },
  {
    title: "CAREERS",
    description: "Join our team and grow your career in a dynamic environment.",
    linkText: "Get Started",
    linkUrl: "https://docs.google.com/forms/d/1a0cxyGMmVW0P0K20M9dBKfu5hySIuO2nt0SE6k-xcxY/edit",
    imageUrl: "/Images/Trainingimgae/career.jpg"
  },
];

function ResponsiveCards() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '20px',
      padding: '20px',
    }}>
      {cardData.map((card, index) => (
        <div key={index} style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <img 
            src={card.imageUrl} 
            alt={card.title}
            style={{
              width: '100%',
              height: '200px',
              objectFit: 'cover',
            }}
          />
          <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{
              fontSize: '1.5rem',
              marginBottom: '10px',
              color: '#333',
            }}>{card.title}</h2>
            <p style={{
              fontSize: '1rem',
              color: '#666',
              marginBottom: '20px',
              flex: 1,
            }}>{card.description}</p>
            <Link 
              to={card.linkUrl}
              style={{
                display: 'inline-block',
                padding: '10px 15px',
                backgroundColor: '#90ee90',
                color: '#333',
                textDecoration: 'none',
                borderRadius: '5px',
                textAlign: 'center',
                transition: 'background-color 0.3s',
                alignSelf: 'flex-start',
              }}
              onMouseEnter={(e) => {
    e.target.style.backgroundColor = '#006400'; // Darker green on hover
    e.target.style.color = 'white'; // Text color remains white on hover
  }}
  onMouseLeave={(e) => {
    e.target.style.backgroundColor = '#90ee90'; // Revert to original background color
    e.target.style.color = '#333'; // Revert to original text color
  }}
            >
              {card.linkText}
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ResponsiveCards;
