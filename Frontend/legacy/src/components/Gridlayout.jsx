// import React, { useState, useEffect } from 'react';

// function GridLayout() {
//   const [smallScreen, setSmallScreen] = useState(window.innerWidth <= 768);

//   useEffect(() => {
//     const handleResize = () => {
//       setSmallScreen(window.innerWidth <= 768);
//     };

//     window.addEventListener('resize', handleResize);
//     return () => window.removeEventListener('resize', handleResize);
//   }, []);

//   const containerStyle = {
//     display: 'grid',
//     gridTemplateColumns: smallScreen ? '1fr' : '1fr 1fr',
//     gap: '80px', // Increase the gap for more space
//     padding: '20px',
//   };

//   const imgStyle = {
//     width: '100%',
//     borderRadius: '10px',
//     boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
//   };

//   const textContainerStyle = {
//     display: 'flex',
//     flexDirection: 'column',
//     justifyContent: 'center',
//     alignItems: smallScreen ? 'center' : 'flex-start',
//     textAlign: smallScreen ? 'center' : 'left',
//     padding: '20px',
//   };

//   const h2Style = {
//     fontSize: '24px',
//     marginBottom: '10px',
//     textAlign: smallScreen ? 'center' : 'left', 
//   };

//   const pStyle = {
//     lineHeight: 1.6,
//     textAlign: smallScreen ? 'center' : 'justify',
//   };

//   const centeredTextStyle = {
//     ...pStyle,
//     textAlign: 'center',
//     maxWidth: '80%', // Control the maximum width of the text
//     margin: '0 auto', // Centers the text block
//   };

//   return (
//     <div style={containerStyle}>
//       {/* WHO WE ARE Section */}
//       <div style={{ width: '100%' }}>
//         <img
//           src="/public/Images/career.jpg"
//           alt="Career opportunities"
//           style={imgStyle}
//         />
//       </div>
//       <div style={textContainerStyle}>
//         <h2 style={h2Style}>WHO WE ARE</h2>
//         <p style={pStyle}>
//           Leading Singaporean consulting company Singadvisor specializes in
//           training, recruitment, and consultancy services. Our goal is to enable
//           people and companies with specialized solutions that satisfy changing
//           market needs. Our devoted team and years of experience enable us to
//           provide high-quality services that foster innovation, expansion, and
//           sustained success. Singadvisor is your reliable partner for success
//           whether you're trying to grow your business, improve skills, or
//           maximize your workforce.
//         </p>
//       </div>

//       {/* MISSION Section */}
//       <div style={textContainerStyle}>
//         <h2 style={h2Style}>MISSION</h2>
//         <p style={pStyle}>
//           To empower individuals and businesses by providing expert recruitment,
//           training, and consultancy services, fostering growth, innovation, and
//           long-term success through personalized and sustainable solutions.
//         </p>
//       </div>
//       <div style={{ width: '100%' }}>
//         <img
//           src="/public/Images/consultancy.jpg"
//           alt="Our services"
//           style={imgStyle}
//         />
//       </div>

//       {/* VISION Section */}
//       <div style={{ width: '100%' }}>
//         <img
//           src="/public/Images/students.jpg"
//           alt="Our vision"
//           style={imgStyle}
//         />
//       </div>
//       <div
//         style={{
//           ...textContainerStyle,
//           display: 'flex',
//           flexDirection: 'column',
//           alignItems: 'center',
//         }}
//       >
//         <h2 style={{ ...h2Style, textAlign: 'center' }}>VISION</h2>
//         <p style={centeredTextStyle}>
//           To be the leading force in shaping the future of workforce development
//           and organizational excellence in Singapore and beyond. We envision a
//           world where every individual and business can reach their full
//           potential, driving innovation and sustainable growth in an
//           ever-evolving global landscape.
//         </p>
//       </div>
//     </div>
//   );
// }

// export default GridLayout;


import React, { useState, useEffect } from 'react';

function GridLayout() {
  const [smallScreen, setSmallScreen] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setSmallScreen(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const containerStyle = {
    display: 'grid',
    gridTemplateColumns: smallScreen ? '1fr' : '1fr 1fr',
    gap: '80px', // Increase the gap for more space
    padding: '20px',
  };

  const imgStyle = {
    width: '100%',
    borderRadius: '10px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  };

  const textContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center', // Center the heading and text horizontally
    textAlign: 'center', // Ensure all text is centered
    padding: '20px',
  };

  const h2Style = {
    fontSize: '24px',
    marginBottom: '10px',
    textAlign: 'center', // Force heading to center
  };

  const pStyle = {
    lineHeight: 1.6,
    textAlign: 'justify',
    padding: smallScreen ? '0 10px' : '0', // Adjust padding on small screens
  };

  const centeredTextStyle = {
    ...pStyle,
    textAlign: 'center',
    maxWidth: '80%', // Control the maximum width of the text
    margin: '0 auto', // Centers the text block
  };

  return (
    <div style={containerStyle}>
      {/* WHO WE ARE Section */}
      <div style={{ width: '100%' }}>
        <img
          src="/Images/Trainingimgae/who1.webp"
          alt="Career opportunities"
          style={imgStyle}
        />
      </div>
      <div style={textContainerStyle}>
        <h2 style={h2Style}>WHO WE ARE</h2>
        <p style={pStyle}>
          Leading Singaporean consulting company Singadvisor specializes in
          training, recruitment, and consultancy services. Our goal is to enable
          people and companies with specialized solutions that satisfy changing
          market needs. Our devoted team and years of experience enable us to
          provide high-quality services that foster innovation, expansion, and
          sustained success. Singadvisor is your reliable partner for success
          whether you're trying to grow your business, improve skills, or
          maximize your workforce.
        </p>
      </div>

      {/* MISSION Section */}
      <div style={textContainerStyle}>
        <h2 style={h2Style}>MISSION</h2>
        <p style={pStyle}>
          To empower individuals and businesses by providing expert recruitment,
          training, and consultancy services, fostering growth, innovation, and
          long-term success through personalized and sustainable solutions.
        </p>
      </div>
      <div style={{ width: '100%' }}>
        <img
          src="/Images/Trainingimgae/mission.jpg"
          alt="Our services"
          style={imgStyle}
        />
      </div>

      {/* VISION Section */}
      <div style={{ width: '100%' }}>
        <img
          src="/Images/Trainingimgae/vision.jpeg"
          alt="Our vision"
          style={imgStyle}
        />
      </div>
      <div
        style={{
          ...textContainerStyle,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <h2 style={{ ...h2Style, textAlign: 'center' }}>VISION</h2>
        <p style={centeredTextStyle}>
          To be the leading force in shaping the future of workforce development
          and organizational excellence in Singapore and beyond. We envision a
          world where every individual and business can reach their full
          potential, driving innovation and sustainable growth in an
          ever-evolving global landscape.
        </p>
      </div>
    </div>
  );
}

export default GridLayout;
