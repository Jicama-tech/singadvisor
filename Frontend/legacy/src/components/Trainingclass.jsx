

// import React, { useState, useRef, useEffect } from 'react';

// const TrainingClass = () => {
//   const [scrollPosition, setScrollPosition] = useState(0);
//   const [isHovering, setIsHovering] = useState(null);
//   const [showControls, setShowControls] = useState(false);
//   const sliderRef = useRef(null);

//   const trainings = [
//     {
//       id: 1,
//       title: 'Manage Time',
//       description: 'Learn techniques to manage your time effectively and increase productivity. Master the art of balancing priorities in your personal and professional life.',
//       imageUrl: '/Images/Trainingimgae/times.webp',
//       linkUrl: '/trainings/managetime',
//       color: '#4F46E5'  // Indigo shade
//     },
//     {
//       id: 2,
//       title: 'Manage Health',
//       description: 'Achieve optimal physical and mental well-being through holistic practices. Discover lifestyle changes that lead to lasting health improvements.',
//       imageUrl: '/Images/Trainingimgae/healthfr.webp',
//       linkUrl: '/trainings/managehealth',
//       color: '#059669'  // Emerald shade
//     },
//     {
//       id: 3,
//       title: 'Manage Emotion',
//       description: 'Develop emotional intelligence to improve personal and professional relationships. Learn how to manage stress and navigate complex emotions with ease.',
//       imageUrl: '/Images/Trainingimgae/emot.webp',
//       linkUrl: '/trainings/manageemotion',
//       color: '#DC2626'  // Red shade
//     },
//     {
//       id: 4,
//       title: 'Manage Money',
//       description: 'Understand the foundations of personal finance and smart money management. Take control of your financial future with proven budgeting strategies.',
//       imageUrl: '/Images/Trainingimgae/mony.webp',
//       linkUrl: '/trainings/managemoney',
//       color: '#0EA5E9'  // Sky blue shade
//     },
//     {
//       id: 5,
//       title: 'Build Trust in Teams',
//       description: 'Foster a collaborative work environment by building trust within your team. Explore strategies to improve communication and strengthen team bonds.',
//       imageUrl: '/Images/Trainingimgae/trusttem.webp',
//       linkUrl: '/Trainings',
//       color: '#8B5CF6'  // Violet shade
//     },
//     {
//       id: 6,
//       title: 'Leadership Skills',
//       description: 'Enhance your leadership capabilities to inspire and guide others effectively. Gain practical insights into decision-making and team management.',
//       imageUrl: '/Images/Trainingimgae/led.webp',
//       linkUrl: '/Trainings',
//       color: '#F59E0B'  // Amber shade
//     },
//     {
//       id: 7,
//       title: 'Communication Skills',
//       description: 'Develop effective communication skills to express ideas clearly and confidently. Learn to listen actively and adapt your message to any audience.',
//       imageUrl: '/Images/Trainingimgae/comunicat.jpg',
//       linkUrl: '/Trainings',
//       color: '#10B981'  // Emerald shade
//     }
//   ];

//   useEffect(() => {
//     const handleResize = () => {
//       setShowControls(sliderRef.current?.scrollWidth > sliderRef.current?.clientWidth);
//     };

//     handleResize();
//     window.addEventListener('resize', handleResize);
//     return () => window.removeEventListener('resize', handleResize);
//   }, []);

//   const handleScroll = (direction) => {
//     const container = sliderRef.current;
//     const scrollAmount = direction === 'left' ? -300 : 300;
//     container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
//     setScrollPosition(container.scrollLeft + scrollAmount);
//   };

//   const containerStyle = {
//     padding: window.innerWidth < 768 ? '1rem' : '2rem',
//     maxWidth: '100%',
//     margin: '0 auto',
//     position: 'relative',
//     background: 'linear-gradient(to bottom, #f8fafc, #ffffff)',
//     borderRadius: '1.5rem',
//     boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
//   };

//   const headerStyle = {
//     display: 'flex',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: '2rem',
//   };

//   const titleStyle = {
//     fontSize: window.innerWidth < 768 ? '1.75rem' : '2.25rem',
//     fontWeight: '700',
//     background: 'linear-gradient(135deg, #1a1a1a 0%, #4a5568 100%)',
//     WebkitBackgroundClip: 'text',
//     WebkitTextFillColor: 'transparent',
//     letterSpacing: '-0.025em',
//   };

//   const scrollButtonStyle = (direction) => ({
//     position: 'absolute',
//     [direction]: '1rem',
//     top: '50%',
//     transform: 'translateY(-50%)',
//     zIndex: 2,
//     background: 'rgba(255, 255, 255, 0.9)',
//     color: '#1a1a1a',
//     border: 'none',
//     padding: '1rem',
//     cursor: 'pointer',
//     borderRadius: '50%',
//     width: window.innerWidth < 768 ? '40px' : '48px',
//     height: window.innerWidth < 768 ? '40px' : '48px',
//     display: showControls ? 'flex' : 'none',
//     alignItems: 'center',
//     justifyContent: 'center',
//     fontSize: '1.25rem',
//     boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
//     transition: 'all 0.2s ease',
//     ':hover': {
//       background: '#ffffff',
//       transform: 'translateY(-50%) scale(1.05)',
//       boxShadow: '0 6px 8px rgba(0, 0, 0, 0.15)',
//     },
//   });

//   const sliderContainerStyle = {
//     display: 'flex',
//     overflowX: 'auto',
//     scrollBehavior: 'smooth',
//     WebkitOverflowScrolling: 'touch',
//     scrollbarWidth: 'none',
//     msOverflowStyle: 'none',
//     gap: window.innerWidth < 768 ? '1rem' : '1.5rem',
//     padding: '1rem 0.5rem',
//     margin: '-0.5rem',
//     position: 'relative',
//   };

//   const cardStyle = (color, isHovered) => ({
//     flex: '0 0 auto',
//     width: window.innerWidth < 768 ? 'calc(100vw - 3rem)' : '320px', // Adjusted for larger screens
//     backgroundColor: 'white',
//     borderRadius: '1.25rem',
//     boxShadow: isHovered 
//       ? `0 12px 24px rgba(0, 0, 0, 0.15), 0 0 0 2px ${color}33` 
//       : '0 4px 6px rgba(0, 0, 0, 0.1)',
//     overflow: 'hidden',
//     display: 'flex',
//     flexDirection: 'column',
//     height: window.innerWidth < 768 ? 'auto' : '460px',
//     transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
//     transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
//     position: 'relative',
//   });

//   const imageContainerStyle = {
//     width: '100%',
//     height: window.innerWidth < 768 ? '220px' : '240px',
//     position: 'relative',
//     overflow: 'hidden',
//   };

//   const imageStyle = (isHovered) => ({
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     width: '100%',
//     height: '100%',
//     objectFit: 'cover',
//     objectPosition: 'center',
//     transition: 'transform 0.3s ease',
//     transform: isHovered ? 'scale(1.05)' : 'scale(1)',
//   });

//   const imageOverlayStyle = (color) => ({
//     position: 'absolute',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     background: `linear-gradient(to bottom, transparent 0%, ${color}22 100%)`,
//     zIndex: 1,
//   });

//   const contentStyle = {
//     padding: window.innerWidth < 768 ? '1.25rem' : '1.5rem',
//     flexGrow: 1,
//     display: 'flex',
//     flexDirection: 'column',
//     justifyContent: 'space-between',
//     position: 'relative',
//     zIndex: 2,
//   };

//   const descriptionStyle = {
//     fontSize: window.innerWidth < 768 ? '0.875rem' : '1rem',
//     color: '#4A5568',
//     marginTop: '0.5rem',
//   };

//   return (
//     <div style={containerStyle}>
//       <div style={headerStyle}>
//         <h1 style={titleStyle}> Training Classes</h1>
//         {showControls && (
//           <>
//             <button
//               onClick={() => handleScroll('left')}
//               style={scrollButtonStyle('left')}
//             >
//               &lt;
//             </button>
//             <button
//               onClick={() => handleScroll('right')}
//               style={scrollButtonStyle('right')}
//             >
//               &gt;
//             </button>
//           </>
//         )}
//       </div>
//       <div ref={sliderRef} style={sliderContainerStyle}>
//         {trainings.map((training) => (
//           <div
//             key={training.id}
//             onMouseEnter={() => setIsHovering(training.id)}
//             onMouseLeave={() => setIsHovering(null)}
//             style={cardStyle(training.color, isHovering === training.id)}
//           >
//             <div style={imageContainerStyle}>
//               <img
//                 src={training.imageUrl}
//                 alt={training.title}
//                 style={imageStyle(isHovering === training.id)}
//               />
//               <div style={imageOverlayStyle(training.color)} />
//             </div>
//             <div style={contentStyle}>
//               <h2 style={{ fontSize: window.innerWidth < 768 ? '1.25rem' : '1.5rem', color: training.color }}>
//                 {training.title}
//               </h2>
//               <p style={descriptionStyle}>{training.description}</p>
//              {/* <a href={training.linkUrl} style={{ color: training.color, marginTop: '0.5rem', fontWeight: '600' }}>
//                 Learn More
//               </a>  */}
//               <a
//   href={training.linkUrl}
//   style={{
//     display: 'inline-block', // Make it behave like a block element
//     backgroundColor: training.color, // Set the background color
//     color: 'white', // Text color
//     padding: '0.5rem 1rem', // Padding for button effect
//     borderRadius: '1rem', // Curved border radius
//     textDecoration: 'none', // Remove underline
//     fontWeight: '600',
//     marginTop: '0.5rem',
//     transition: 'background-color 0.3s ease', // Optional for hover effect
//   }}
//   onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'darken(${training.color}, 10%)')}
//   onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = training.color)}
// >
//   Learn More
// </a>

//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default TrainingClass;
import React, { useState, useRef, useEffect } from 'react';

const TrainingClass = () => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isHovering, setIsHovering] = useState(null);
  const [showControls, setShowControls] = useState(false);
  const sliderRef = useRef(null);

  const trainings = [
    {
      id: 1,
      title: 'Manage Time',
      description: 'Learn techniques to manage your time effectively and increase productivity. Master the art of balancing priorities in your personal and professional life.',
      imageUrl: '/Images/Trainingimgae/times.webp',
      linkUrl: '/trainings/managetime',
      color: '#4F46E5'
    },
    {
      id: 2,
      title: 'Manage Health',
      description: 'Achieve optimal physical and mental well-being through holistic practices. Discover lifestyle changes that lead to lasting health improvements.',
      imageUrl: '/Images/Trainingimgae/healthfr.webp',
      linkUrl: '/trainings/managehealth',
      color: '#059669'
    },
    {
      id: 3,
      title: 'Manage Emotion',
      description: 'Develop emotional intelligence to improve personal and professional relationships. Learn how to manage stress and navigate complex emotions with ease.',
      imageUrl: '/Images/Trainingimgae/emot.webp',
      linkUrl: '/trainings/manageemotion',
      color: '#DC2626'
    },
    {
      id: 4,
      title: 'Manage Money',
      description: 'Understand the foundations of personal finance and smart money management. Take control of your financial future with proven budgeting strategies.',
      imageUrl: '/Images/Trainingimgae/mony.webp',
      linkUrl: '/trainings/managemoney',
      color: '#0EA5E9'
    },
    {
      id: 5,
      title: 'Build Trust in Teams',
      description: 'Foster a collaborative work environment by building trust within your team. Explore strategies to improve communication and strengthen team bonds.',
      imageUrl: '/Images/Trainingimgae/trusttem.webp',
      linkUrl: '/Trainings',
      color: '#8B5CF6'
    },
    {
      id: 6,
      title: 'Leadership Skills',
      description: 'Enhance your leadership capabilities to inspire and guide others effectively. Gain practical insights into decision-making and team management.',
      imageUrl: '/Images/Trainingimgae/led.webp',
      linkUrl: '/Trainings',
      color: '#F59E0B'
    },
    {
      id: 7,
      title: 'Communication Skills',
      description: 'Develop effective communication skills to express ideas clearly and confidently. Learn to listen actively and adapt your message to any audience.',
      imageUrl: '/Images/Trainingimgae/comunicat.jpg',
      linkUrl: '/Trainings',
      color: '#10B981'
    }
  ];

  useEffect(() => {
    const handleResize = () => {
      if (sliderRef.current) {
        setShowControls(sliderRef.current.scrollWidth > sliderRef.current.clientWidth);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleScroll = (direction) => {
    const container = sliderRef.current;
    if (!container) return;
    
    const cardWidth = 320 + 24; // card width + gap
    const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    setScrollPosition(container.scrollLeft + scrollAmount);
  };

  const containerStyle = {
    maxWidth: '1440px',
    margin: '0 auto',
    padding: '2rem',
    position: 'relative',
    background: 'linear-gradient(to bottom, #f8fafc, #ffffff)',
    borderRadius: '1.5rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    padding: '0 0.5rem',
  };

  const titleStyle = {
    fontSize: 'clamp(1.75rem, 5vw, 2.25rem)',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #1a1a1a 0%, #4a5568 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.025em',
  };

  const sliderContainerStyle = {
    display: 'flex',
    overflowX: 'auto',
    scrollBehavior: 'smooth',
    WebkitOverflowScrolling: 'touch',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    gap: '1.5rem',
    padding: '0.5rem',
    marginLeft: '-0.5rem',
    marginRight: '-0.5rem',
    position: 'relative',
    '::-webkit-scrollbar': {
      display: 'none'
    }
  };

  const cardStyle = (color, isHovered) => ({
    flex: '0 0 320px', // Fixed width for all cards
    backgroundColor: 'white',
    borderRadius: '1.25rem',
    boxShadow: isHovered 
      ? `0 12px 24px rgba(0, 0, 0, 0.15), 0 0 0 2px ${color}33` 
      : '0 4px 6px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '480px', // Fixed height for all cards
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    transform: isHovered ? 'translateY(-8px)' : 'translateY(0)',
  });

  const imageContainerStyle = {
    width: '100%',
    height: '200px', // Fixed height for all images
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#f3f4f6', // Placeholder background
  };

  const imageStyle = (isHovered) => ({
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    transition: 'transform 0.3s ease',
    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
  });

  const contentStyle = {
    padding: '1.5rem',
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '280px', // Fixed height for content area
  };

  const titleContentStyle = {
    marginBottom: '0.75rem',
    fontSize: '1.5rem',
    fontWeight: '600',
    lineHeight: '1.2',
  };

  const descriptionStyle = {
    fontSize: '1rem',
    color: '#4A5568',
    lineHeight: '1.5',
    flexGrow: 1,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 4,
    WebkitBoxOrient: 'vertical',
  };

  const buttonStyle = (color, isHovered) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color,
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '1rem',
    textDecoration: 'none',
    fontWeight: '600',
    marginTop: 'auto',
    transition: 'all 0.2s ease',
    opacity: isHovered ? 0.9 : 1,
    width: '100%', // Full width button
  });

  const navigationButtonStyle = (direction) => ({
    position: 'absolute',
    [direction]: '0.5rem',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 2,
    background: 'white',
    color: '#1a1a1a',
    border: 'none',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    display: showControls ? 'flex' : 'none',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.2s ease',
  });

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Training Classes</h1>
      </div>
      
      <div style={{ position: 'relative' }}>
        {showControls && (
          <>
            <button
              onClick={() => handleScroll('left')}
              style={navigationButtonStyle('left')}
              aria-label="Previous"
            >
              ←
            </button>
            <button
              onClick={() => handleScroll('right')}
              style={navigationButtonStyle('right')}
              aria-label="Next"
            >
              →
            </button>
          </>
        )}
        
        <div ref={sliderRef} style={sliderContainerStyle}>
          {trainings.map((training) => (
            <div
              key={training.id}
              onMouseEnter={() => setIsHovering(training.id)}
              onMouseLeave={() => setIsHovering(null)}
              style={cardStyle(training.color, isHovering === training.id)}
            >
              <div style={imageContainerStyle}>
                <img
                  src={training.imageUrl}
                  alt={training.title}
                  style={imageStyle(isHovering === training.id)}
                />
              </div>
              <div style={contentStyle}>
                <h2 style={{ ...titleContentStyle, color: training.color }}>
                  {training.title}
                </h2>
                <p style={descriptionStyle}>
                  {training.description}
                </p>
                <a
                  href={training.linkUrl}
                  style={buttonStyle(training.color, isHovering === training.id)}
                >
                  Learn More
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrainingClass;