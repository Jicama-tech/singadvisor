// import React from 'react'
// import Navbar from './Navbar'
// import { Link } from 'react-router-dom';


// function ManageHealthPage() {
//   return (
//     <>
     
//      <div style={{ marginTop: '90px' }}></div>
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
//         <h1>Manage Health</h1>
//         <p>
//     <strong>1. Understanding Physical Health</strong><br />
//     Physical health involves the proper functioning of the body and maintaining it through preventive and proactive practices. It encompasses:
//     <ul>
//         <li>A balanced diet</li>
//         <li>Regular physical activity</li>
//         <li>Adequate sleep</li>
//         <li>Hygiene practices</li>
//         <li>Monitoring and managing diseases like diabetes, heart conditions, etc.</li>
//     </ul>
// </p>

// <p>
//     <strong>2. Nutrition and Healthy Eating</strong><br />
//     A balanced diet is crucial for overall health and wellness. Key points include:
//     <ul>
//         <li><strong>Macronutrients:</strong> Carbohydrates, proteins, and fats needed in larger amounts.</li>
//         <li><strong>Micronutrients:</strong> Vitamins and minerals essential for body function.</li>
//         <li>Eating a variety of fruits, vegetables, lean proteins, and whole grains ensures your body gets all the nutrients it needs.</li>
//     </ul>
// </p>

// <p>
//     <strong>3. Physical Activity and Exercise</strong><br />
//     Regular exercise is essential for:
//     <ul>
//         <li>Maintaining cardiovascular health</li>
//         <li>Strengthening muscles and bones</li>
//         <li>Improving mental health</li>
//         <li>Reducing risks of chronic diseases</li>
//     </ul>
//     Guidelines suggest at least 150 minutes of moderate exercise per week, including aerobic activities (walking, cycling) and strength training.
// </p>

// <p>
//     <strong>4. Coping with Stress and Anxiety</strong><br />
//     Managing stress is essential for mental and physical well-being. Techniques include:
//     <ul>
//         <li><strong>Mindfulness and Meditation:</strong> Practices like deep breathing, yoga, and meditation can reduce stress levels.</li>
//         <li><strong>Physical Activity:</strong> Exercise releases endorphins, improving mood and reducing stress.</li>
//         <li><strong>Time Management:</strong> Organizing tasks and setting realistic goals can help alleviate stress.</li>
//         <li>Professional counseling or therapy for anxiety disorders.</li>
//     </ul>
// </p>

// <p>
//     <strong>5. Building Healthy Habits</strong><br />
//     Developing long-term healthy habits involves:
//     <ul>
//         <li><strong>Consistency:</strong> Repeating small, manageable steps regularly (e.g., daily 10-minute walks).</li>
//         <li><strong>Environment:</strong> Surrounding yourself with supportive people or environments that foster good habits.</li>
//         <li><strong>Accountability:</strong> Tracking progress or setting reminders helps in sustaining these behaviors.</li>
//     </ul>
// </p>



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

// export default ManageHealthPage

import React from 'react';
import Navbar from './Navbar';
import { Link } from 'react-router-dom';

function ManageHealthPage() {
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
            <h1>Manage Health</h1>
            <p>
              <strong>1. Understanding Physical Health</strong><br />
              Physical health involves the proper functioning of the body and maintaining it through preventive and proactive practices. It encompasses:
              <ul>
                <li>A balanced diet</li>
                <li>Regular physical activity</li>
                <li>Adequate sleep</li>
                <li>Hygiene practices</li>
                <li>Monitoring and managing diseases like diabetes, heart conditions, etc.</li>
              </ul>
            </p>

            <p>
              <strong>2. Nutrition and Healthy Eating</strong><br />
              A balanced diet is crucial for overall health and wellness. Key points include:
              <ul>
                <li><strong>Macronutrients:</strong> Carbohydrates, proteins, and fats needed in larger amounts.</li>
                <li><strong>Micronutrients:</strong> Vitamins and minerals essential for body function.</li>
                <li>Eating a variety of fruits, vegetables, lean proteins, and whole grains ensures your body gets all the nutrients it needs.</li>
              </ul>
            </p>

            <p>
              <strong>3. Physical Activity and Exercise</strong><br />
              Regular exercise is essential for:
              <ul>
                <li>Maintaining cardiovascular health</li>
                <li>Strengthening muscles and bones</li>
                <li>Improving mental health</li>
                <li>Reducing risks of chronic diseases</li>
              </ul>
            </p>

            <p>
              <strong>4. Coping with Stress and Anxiety</strong><br />
              Managing stress is essential for mental and physical well-being. Techniques include:
              <ul>
                <li><strong>Mindfulness and Meditation:</strong> Practices like deep breathing, yoga, and meditation can reduce stress levels.</li>
                <li><strong>Physical Activity:</strong> Exercise releases endorphins, improving mood and reducing stress.</li>
                <li><strong>Time Management:</strong> Organizing tasks and setting realistic goals can help alleviate stress.</li>
                <li>Professional counseling or therapy for anxiety disorders.</li>
              </ul>
            </p>

            <p>
              <strong>5. Building Healthy Habits</strong><br />
              Developing long-term healthy habits involves:
              <ul>
                <li><strong>Consistency:</strong> Repeating small, manageable steps regularly (e.g., daily 10-minute walks).</li>
                <li><strong>Environment:</strong> Surrounding yourself with supportive people or environments that foster good habits.</li>
                <li><strong>Accountability:</strong> Tracking progress or setting reminders helps in sustaining these behaviors.</li>
              </ul>
            </p>

            {/* Buttons */}
            <div className="button-section">
              <Link to="https://docs.google.com/forms/d/1Nvr1Kz_yUbyB-xkDd82TE9LEXOztukbTii8XM7db3mU/viewform?edit_requested=true" className="register-button">Register Now</Link>
             
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
            margin-top: 20px; /* Moves the video down */
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

export default ManageHealthPage;
