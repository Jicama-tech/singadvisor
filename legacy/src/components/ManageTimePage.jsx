// import React from 'react'
// import Navbar from './Navbar'
// import { Link } from 'react-router-dom';



// function ManageTimePage() {
//   return (
//    <>
    
//     <div style={{ marginTop: '90px' }}></div>
//       <Navbar />

//     <div className="video-page-container">
//       {/* Video Section */}
//       <div className="video-section">
//         <video width="100%" height="auto" controls>
//           <source src="your-video-url.mp4" type="video/mp4" />
//           Your browser does not support the video tag.
//         </video>
//       </div>

//       {/* Content Section */}
//       <div className="content-section">
//         <h1>Manage Time</h1>
//         <p>
//             <strong>1. Introduction to Time Management</strong><br />
//             Time management involves organizing and planning your time to maximize productivity and achieve specific goals. It includes identifying priorities, setting deadlines, and efficiently allocating time for each task to reduce stress and enhance focus.
//         </p>

//         <p>
//             <strong>2. Goal Setting and Prioritization</strong><br />
//             Effective time management starts with clear goal setting. Goals should be SMART: Specific, Measurable, Achievable, Relevant, and Time-bound. Prioritization helps to determine which tasks should take precedence based on their importance and deadlines.
//         </p>

//         <p>
//             <strong>3. Planning and Organizing Your Time</strong><br />
//             Planning involves creating a daily or weekly schedule that outlines when and how long you’ll work on tasks. Using tools like to-do lists, calendars, and time-blocking techniques can help structure your day and organize tasks by importance.
//         </p>

//         <p>
//             <strong>4. Dealing with Procrastination</strong><br />
//                 Procrastination is the act of delaying tasks. It can be tackled by breaking tasks into smaller, manageable steps, using techniques like the Pomodoro method (working for short, focused intervals), and eliminating distractions like social media during work time.
//             </p>

//         <p>
//             <strong>5. Effective Study Techniques</strong><br />
//                 Effective studying involves using strategies like active recall (quizzing yourself on topics), spaced repetition (reviewing material over increasing intervals), and summarizing or teaching the material to others to enhance understanding and retention.
//         </p>



//         {/* Register Button */}
//         <Link to="/" className="register-button">
//           Register Now
//         </Link>
//       </div>

//       {/* CSS for layout */}
//       <style jsx>{`
//         .video-page-container {
//           display: flex;
//           flex-direction: column;
//           align-items: center;
//           max-width: 1200px;
//           margin: 0 auto;
//           padding: 20px;
//         }

//         .video-section {
//           width: 100%;
//           margin-bottom: 20px;
//         }

//         .content-section {
//           text-align: center;
//           margin-bottom: 20px;
//         }

//         h1 {
//           font-size: 2rem;
//           margin-bottom: 10px;
//         }

//         p {
//           font-size: 1rem;
//           margin-bottom: 20px;
//         }

//         .register-button {
//           padding: 10px 20px;
//           background-color: #007bff;
//           color: white;
//           text-decoration: none;
//           border-radius: 5px;
//           font-size: 1.2rem;
//         }

//         .register-button:hover {
//           background-color: #0056b3;
//         }
//       `}</style>
//     </div>
//     </>
//   )
// }

// export default ManageTimePage;

import React from 'react';
import Navbar from './Navbar';
import { Link } from 'react-router-dom';

function ManageTimePage() {
  return (
    <>
      <div style={{ marginTop: '90px' }}></div>
      <Navbar />

      <div className="video-page-container">
        {/* Card Layout */}
        <div className="video-content-card">
          {/* Video Section */}
          <div className="video-section">
            <video width="100%" height="auto" controls>
              <source src="/Vedios/200314 _Work Life_02_ 4k_002.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>

          {/* Content Section */}
          <div className="content-section">
            <h1>Manage Time</h1>
            <p>
              <strong>1. Introduction to Time Management</strong><br />
              Time management involves organizing and planning your time to maximize productivity and achieve specific goals. 
              It includes identifying priorities, setting deadlines, and efficiently allocating time for each task to reduce stress and enhance focus.
            </p>

            <p>
              <strong>2. Goal Setting and Prioritization</strong><br />
              Effective time management starts with clear goal setting. Goals should be SMART: Specific, Measurable, Achievable, Relevant, and Time-bound. 
              Prioritization helps to determine which tasks should take precedence based on their importance and deadlines.
            </p>

            <p>
              <strong>3. Planning and Organizing Your Time</strong><br />
              Planning involves creating a daily or weekly schedule that outlines when and how long you’ll work on tasks. 
              Using tools like to-do lists, calendars, and time-blocking techniques can help structure your day and organize tasks by importance.
            </p>

            <p>
              <strong>4. Dealing with Procrastination</strong><br />
              Procrastination is the act of delaying tasks. It can be tackled by breaking tasks into smaller, manageable steps, 
              using techniques like the Pomodoro method (working for short, focused intervals), and eliminating distractions like social media during work time.
            </p>

            <p>
              <strong>5. Effective Study Techniques</strong><br />
              Effective studying involves using strategies like active recall (quizzing yourself on topics), spaced repetition (reviewing material over increasing intervals), 
              and summarizing or teaching the material to others to enhance understanding and retention.
            </p>

            {/* Register and Route Buttons */}
            <div className="button-section text-center">
              <Link to="https://docs.google.com/forms/d/1Nvr1Kz_yUbyB-xkDd82TE9LEXOztukbTii8XM7db3mU/viewform?edit_requested=true" className="register-button text-center">Register Now</Link>
             
            </div>
          </div>
        </div>

        {/* CSS for layout */}
        <style jsx>{`
          .video-page-container {
            display: flex;
            justify-content: center;
            align-items: center;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }

          .video-content-card {
            display: flex;
            flex-direction: column;
            width: 100%;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }

          .video-section {
            flex: 1;
            max-width: 100%;
            padding: 16px;
            margin-top: 20px; /* Adjust this value to move the video down */
          }

          .content-section {
            flex: 1;
            padding: 24px;
            text-align: left;
          }

          h1 {
            font-size: 1.8rem;
            margin-bottom: 16px;
          }

          p {
            font-size: 1rem;
            margin-bottom: 16px;
          }

          .button-section {
            margin-top: 20px;
            display: flex;
            gap: 20px;
          }

          .register-button, .route-button {
            padding: 10px 20px;
            background-color: #90ee90;
            color: black;
            text-decoration: none;
            border-radius: 5px;
            font-size: 1rem;
          }

          .register-button:hover, .route-button:hover {
            background-color: #fff;
          }

          /* Responsive Layout */
          @media (min-width: 768px) {
            .video-content-card {
              flex-direction: row;
            }

            .video-section {
              max-width: 50%;
              height: auto;
              margin-top: 5px; /* Moves the video down for larger screens */
            }

            .content-section {
              max-width: 50%;
              padding: 40px;
            }

            h1 {
              font-size: 2rem;
            }
          }

          @media (max-width: 767px) {
            .video-content-card {
              flex-direction: column;
            }

            .video-section {
              max-width: 100%;
              margin-top: 0; /* Ensures no extra margin on mobile view */
            }

            .content-section {
              text-align: center;
              padding: 24px;
            }
          }
        `}</style>
      </div>
    </>
  );
}

export default ManageTimePage;
