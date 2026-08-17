import React from 'react';

function Newsletter() {
  const containerStyle = {
    backgroundColor: 'black',
    color: 'white',
    padding: '48px 24px ',
    fontFamily: 'Arial, sans-serif',
    width: '100%',
  };

  const contentStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '48px',
    maxWidth: '1024px',
    margin: '0 auto',
    flexWrap: 'wrap', // To handle wrapping on smaller screens
  };

  const columnStyle = {
    flex: '1',
    maxWidth: '50%',
    minWidth: '300px', // Ensures columns don't get too small
  };

  const headingStyle = {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '16px',
  };

  // Change "Newsletter" color to #90ee90
  const gradientTextStyle = {
    color: '#90ee90',
  };

  const paragraphStyle = {
    marginTop: '16px',
    color: '#d1d5db',
    fontSize: '18px',
    lineHeight: '1.6',
  };

  const formStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '24px',
    width: '100%',
  };

  const inputStyle = {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    outline: 'none',
    padding: '12px 16px',
    fontSize: '16px',
  };

  // Add hover effect for the button
  const buttonStyle = {
    padding: '12px 24px',
    borderRadius: '6px',
    background: '#90ee90',
    color: 'black',
    fontSize: '16px',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
    transition: 'transform 0.1s ease-in-out',
  };

  const buttonHoverStyle = {
    ...buttonStyle,
    background: '#76c76e', // Darker green on hover
    transform: 'scale(1.05)', // Slightly increase size on hover
  };

  const socialLinksStyle = {
    display: 'flex',
    gap: '16px',
    marginTop: '24px',
  };

  const socialIconStyle = {
    width: '24px',
    height: '24px',
    fill: '#fff',
  };
  

  return (
    <div style={containerStyle}>
      <div style={contentStyle}>
        <div style={columnStyle}>
          <h2 style={headingStyle}>
            Subscribe To My
            <span style={gradientTextStyle}> Newsletters</span>
          </h2>
          <p style={paragraphStyle}>
          Stay Ahead with Singadvisor Newsletters!!
         <br></br>
          From practical money management tips to the latest industry insights, our newsletter is designed to help you grow personally and professionally. 
          Subscribe now and join a community of like-minded individuals committed to achieving success!
          </p>
        </div>
        <div style={columnStyle}>
          <form style={formStyle}>
            <input style={inputStyle} placeholder="Enter your email" type="email" required />
            <button style={buttonStyle} type="submit">Subscribe</button>
          </form>
          <div style={socialLinksStyle}>
            <a href="https://x.com/singadvisor" aria-label="Twitter">
              <svg style={socialIconStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
            </a>
            <a href="https://www.facebook.com/p/SingAdvisor-100070051433613/?_rdr" aria-label="Facebook">
              <svg style={socialIconStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
            <a href="https://www.instagram.com/singadvisor/" aria-label="Instagram">
              <svg style={socialIconStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.057 1.17-.249 1.805-.413 2.227-.217.562-.477.961-.896 1.381-.421.419-.819.679-1.382.896-.422.164-1.057.36-2.227.413-1.265.056-1.646.071-4.85.071s-3.585-.016-4.85-.071c-1.17-.055-1.805-.249-2.227-.415a3.644 3.644 0 01-1.382-.896 3.644 3.644 0 01-.896-1.381c-.165-.422-.361-1.057-.415-2.227-.056-1.265-.071-1.646-.071-4.85s.016-3.585.071-4.85c.054-1.17.249-1.805.415-2.227.217-.562.477-.96.896-1.381.42-.419.819-.679 1.382-.896.422-.165 1.057-.361 2.227-.415C8.415 2.176 8.797 2.16 12 2.16zm0 3.392a6.448 6.448 0 100 12.896 6.448 6.448 0 100-12.896zm0 10.673a4.226 4.226 0 110-8.453 4.226 4.226 0 010 8.453zm7.845-10.868a1.507 1.507 0 11-3.014 0 1.507 1.507 0 013.014 0z" />
              </svg>
            </a>
            <a href="https://www.linkedin.com/in/sindadvisor/" aria-label="LinkedIn">
              <svg style={socialIconStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.23 0H1.77C.792 0 0 .775 0 1.73v20.54C0 23.224.792 24 1.77 24h20.46C23.208 24 24 23.224 24 22.27V1.73C24 .775 23.208 0 22.23 0zM7.13 20.454H3.56V9h3.57v11.454zM5.345 7.68a2.07 2.07 0 01-2.068-2.068c0-1.144.924-2.068 2.068-2.068 1.144 0 2.068.924 2.068 2.068a2.07 2.07 0 01-2.068 2.068zm15.11 12.773h-3.57v-5.635c0-1.344-.025-3.076-1.877-3.076-1.878 0-2.166 1.466-2.166 2.975v5.736h-3.57V9h3.426v1.56h.049c.477-.9 1.64-1.848 3.377-1.848 3.61 0 4.28 2.375 4.28 5.46v6.282z"/>
              </svg>
            </a>
            <a href="https://www.tiktok.com/@singadvisor" aria-label="TikTok" className="text-secondary">
                <svg style={socialIconStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
              </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Newsletter;

// import React, { useState } from 'react';

// function Newsletter() {
//   const [showPopup, setShowPopup] = useState(false);
//   const [email, setEmail] = useState('');

//   const containerStyle = {
//     backgroundColor: 'black',
//     color: 'white',
//     padding: '48px 24px',
//     fontFamily: 'Arial, sans-serif',
//     width: '100%',
//   };

//   const contentStyle = {
//     display: 'flex',
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     gap: '48px',
//     maxWidth: '1024px',
//     margin: '0 auto',
//     flexWrap: 'wrap',
//   };

//   const columnStyle = {
//     flex: '1',
//     maxWidth: '50%',
//     minWidth: '300px',
//   };

//   const headingStyle = {
//     fontSize: '36px',
//     fontWeight: 'bold',
//     marginBottom: '16px',
//   };

//   const gradientTextStyle = {
//     color: '#90ee90',
//   };

//   const paragraphStyle = {
//     marginTop: '16px',
//     color: '#d1d5db',
//     fontSize: '18px',
//     lineHeight: '1.6',
//   };

//   const formStyle = {
//     display: 'flex',
//     flexDirection: 'column',
//     gap: '16px',
//     backgroundColor: '#1e293b',
//     borderRadius: '12px',
//     padding: '24px',
//     width: '100%',
//   };

//   const inputStyle = {
//     width: '100%',
//     backgroundColor: 'rgba(255, 255, 255, 0.1)',
//     border: 'none',
//     borderRadius: '6px',
//     color: 'white',
//     outline: 'none',
//     padding: '12px 16px',
//     fontSize: '16px',
//   };

//   const buttonStyle = {
//     padding: '12px 24px',
//     borderRadius: '6px',
//     background: '#90ee90',
//     color: 'black',
//     fontSize: '16px',
//     fontWeight: '500',
//     border: 'none',
//     cursor: 'pointer',
//     transition: 'transform 0.1s ease-in-out',
//   };

//   const socialLinksStyle = {
//     display: 'flex',
//     gap: '16px',
//     marginTop: '24px',
//   };

//   const socialIconStyle = {
//     width: '24px',
//     height: '24px',
//     fill: '#fff',
//   };

//   // New popup styles
//   const popupOverlayStyle = {
//     position: 'fixed',
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: 'rgba(0, 0, 0, 0.7)',
//     display: showPopup ? 'flex' : 'none',
//     justifyContent: 'center',
//     alignItems: 'center',
//     zIndex: 1000,
//   };

//   const popupContentStyle = {
//     backgroundColor: 'white',
//     padding: '32px',
//     borderRadius: '12px',
//     maxWidth: '400px',
//     textAlign: 'center',
//     position: 'relative',
//   };

//   const popupTitleStyle = {
//     color: 'black',
//     fontSize: '24px',
//     marginBottom: '16px',
//     fontWeight: 'bold',
//   };

//   const popupMessageStyle = {
//     color: '#4b5563',
//     marginBottom: '24px',
//   };

//   const closeButtonStyle = {
//     ...buttonStyle,
//     marginTop: '16px',
//     background: '#90ee90',
//     width: '100%',
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     // Here you would typically handle the email submission to your backend
//     setShowPopup(true);
//     setEmail(''); // Clear the email input
//   };

//   return (
//     <div style={containerStyle}>
//       <div style={contentStyle}>
//         <div style={columnStyle}>
//           <h2 style={headingStyle}>
//             Subscribe To My
//             <span style={gradientTextStyle}> Newsletters</span>
//           </h2>
//           <p style={paragraphStyle}>
//             Stay Ahead with Singadvisor Newsletters!!
//             <br />
//             From practical money management tips to the latest industry insights, our newsletter is designed to help you grow personally and professionally.
//             Subscribe now and join a community of like-minded individuals committed to achieving success!
//           </p>
//         </div>
//         <div style={columnStyle}>
//           <form style={formStyle} onSubmit={handleSubmit}>
//             <input
//               style={inputStyle}
//               placeholder="Enter your email"
//               type="email"
//               required
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//             />
//             <button style={buttonStyle} type="submit">Subscribe</button>
//           </form>
//           <div style={socialLinksStyle}>
//             {/* Social media links remain the same */}
//             <a href="https://x.com/singadvisor" aria-label="Twitter">
//               <svg style={socialIconStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                 <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
//               </svg>
//             </a>
//                         <a href="https://www.facebook.com/p/SingAdvisor-100070051433613/?_rdr" aria-label="Facebook">
//               <svg style={socialIconStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                 <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
//               </svg>
//             </a>
//             <a href="https://www.instagram.com/singadvisor/" aria-label="Instagram">
//               <svg style={socialIconStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                 <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.057 1.17-.249 1.805-.413 2.227-.217.562-.477.961-.896 1.381-.421.419-.819.679-1.382.896-.422.164-1.057.36-2.227.413-1.265.056-1.646.071-4.85.071s-3.585-.016-4.85-.071c-1.17-.055-1.805-.249-2.227-.415a3.644 3.644 0 01-1.382-.896 3.644 3.644 0 01-.896-1.381c-.165-.422-.361-1.057-.415-2.227-.056-1.265-.071-1.646-.071-4.85s.016-3.585.071-4.85c.054-1.17.249-1.805.415-2.227.217-.562.477-.96.896-1.381.42-.419.819-.679 1.382-.896.422-.165 1.057-.361 2.227-.415C8.415 2.176 8.797 2.16 12 2.16zm0 3.392a6.448 6.448 0 100 12.896 6.448 6.448 0 100-12.896zm0 10.673a4.226 4.226 0 110-8.453 4.226 4.226 0 010 8.453zm7.845-10.868a1.507 1.507 0 11-3.014 0 1.507 1.507 0 013.014 0z" />
//               </svg>
//             </a>
//             <a href="https://www.linkedin.com/in/sindadvisor/" aria-label="LinkedIn">
//               <svg style={socialIconStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                 <path d="M22.23 0H1.77C.792 0 0 .775 0 1.73v20.54C0 23.224.792 24 1.77 24h20.46C23.208 24 24 23.224 24 22.27V1.73C24 .775 23.208 0 22.23 0zM7.13 20.454H3.56V9h3.57v11.454zM5.345 7.68a2.07 2.07 0 01-2.068-2.068c0-1.144.924-2.068 2.068-2.068 1.144 0 2.068.924 2.068 2.068a2.07 2.07 0 01-2.068 2.068zm15.11 12.773h-3.57v-5.635c0-1.344-.025-3.076-1.877-3.076-1.878 0-2.166 1.466-2.166 2.975v5.736h-3.57V9h3.426v1.56h.049c.477-.9 1.64-1.848 3.377-1.848 3.61 0 4.28 2.375 4.28 5.46v6.282z"/>
//               </svg>
//             </a>
//             <a href="https://www.tiktok.com/@singadvisor" aria-label="TikTok" className="text-secondary">
//                 <svg style={socialIconStyle} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                   <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
//                 </svg>
//               </a>
            
            
//           </div>
//         </div>
//       </div>

//       {/* Popup/Modal */}
//       <div style={popupOverlayStyle} onClick={() => setShowPopup(false)}>
//         <div style={popupContentStyle} onClick={(e) => e.stopPropagation()}>
//           <h3 style={popupTitleStyle}>Thank You for Subscribing!</h3>
//           <p style={popupMessageStyle}>
//             We're excited to welcome you to the Singadvisor community.
//           </p>
//           <button style={closeButtonStyle} onClick={() => setShowPopup(false)}>
//             Close
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Newsletter;